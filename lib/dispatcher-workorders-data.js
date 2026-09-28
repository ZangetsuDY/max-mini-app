import crypto from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";

import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const MAX_API_BASE = "https://platform-api2.max.ru";
const SNAPSHOT_CACHE_KEY =
  "lenenergo:max-mini-app:dispatcher:workorders-snapshot";
const PART_MATCH_WINDOW_MS = 15 * 60 * 1000;

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

function zeroCounts() {
  return {
    registered: 0,
    created: 0,
    admission: 0,
    preparation: 0,
    break: 0,
    total: 0
  };
}

function safeParse(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function loadCertificate(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = fs.readFileSync(fileUrl);
  return new crypto.X509Certificate(raw).toString();
}

let maxHttpsAgent = null;

function getMaxHttpsAgent() {
  if (maxHttpsAgent) return maxHttpsAgent;

  const rootCa = loadCertificate(
    "../certs/Russian_Trusted_Root_CA.cer"
  );

  maxHttpsAgent = new https.Agent({
    keepAlive: true,
    ca: [
      ...tls.rootCertificates,
      rootCa
    ]
  });

  return maxHttpsAgent;
}

function maxApiRequest(url, botToken) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "GET",
        agent: getMaxHttpsAgent(),
        headers: {
          Authorization: botToken,
          Accept: "application/json"
        },
        timeout: 15000
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: response.statusCode || 500,
            ok:
              Number(response.statusCode) >= 200 &&
              Number(response.statusCode) < 300,
            body
          });
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Таймаут соединения с API MAX"));
    });

    request.on("error", reject);
    request.end();
  });
}

function getWorkordersChatId() {
  return String(
    process.env.DISPATCHER_WORKORDERS_CHAT_ID ||
    process.env.WORKORDERS_CHAT_ID ||
    ""
  ).trim();
}

function getCacheSeconds() {
  const value = Number(
    process.env.DISPATCHER_WORKORDERS_CACHE_SECONDS ||
    process.env.DISPATCHER_CACHE_SECONDS ||
    10
  );

  if (!Number.isFinite(value)) return 10;
  return Math.max(5, Math.min(Math.round(value), 120));
}

async function readCachedSnapshot() {
  if (!isRuntimeStoreConfigured()) return null;

  try {
    const raw = await redisCommand("GET", SNAPSHOT_CACHE_KEY);
    return safeParse(raw, null);
  } catch {
    return null;
  }
}

async function writeCachedSnapshot(snapshot) {
  if (!isRuntimeStoreConfigured()) return;

  try {
    await redisCommand(
      "SET",
      SNAPSHOT_CACHE_KEY,
      JSON.stringify(snapshot)
    );
  } catch (error) {
    console.error("Не удалось сохранить кэш нарядов/допусков СК-11:", error);
  }
}

function hasWorkordersHeader(text) {
  return /СК-11\s*[•·]\s*Наряды\s*\/\s*допуски/i.test(
    cleanText(text)
  );
}

function looksLikeWorkordersPart(text) {
  const value = cleanText(text);
  return (
    /Зарег\.?\s*:/i.test(value) &&
    /Создан\s*:/i.test(value) &&
    /Допуск\s*:/i.test(value) &&
    /Подг\.\s*р\.м\.?\s*:/i.test(value) &&
    /Перерыв\s*:/i.test(value)
  );
}

function getPartInfo(text) {
  const value = cleanText(text);
  const match = value.match(
    /Часть\s*(\d+)\s*\/\s*(\d+)/i
  );

  if (!match) return null;

  const part = Number(match[1]);
  const total = Number(match[2]);

  if (
    !Number.isInteger(part) ||
    !Number.isInteger(total) ||
    part < 1 ||
    total < 1 ||
    part > total ||
    total > 20
  ) {
    return null;
  }

  return { part, total };
}

function getAllPartNumbers(text, total) {
  const found = new Set();
  const value = cleanText(text);
  const regex = /Часть\s*(\d+)\s*\/\s*(\d+)/gi;

  let match;
  while ((match = regex.exec(value))) {
    const part = Number(match[1]);
    const candidateTotal = Number(match[2]);
    if (
      candidateTotal === total &&
      part >= 1 &&
      part <= total
    ) {
      found.add(part);
    }
  }

  return found;
}

function toMillis(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric < 1e12 ? numeric * 1000 : numeric;
}

function parseRows(value) {
  const rows = {};
  const rowList = [];
  const lines = cleanText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const firstCountsRegex =
    /^Зарег\.?\s*:\s*(\d+)\s*\|\s*Создан\s*:\s*(\d+)\s*\|\s*Допуск\s*:\s*(\d+)\s*$/i;
  const secondCountsRegex =
    /^Подг\.\s*р\.м\.?\s*:\s*(\d+)\s*\|\s*Перерыв\s*:\s*(\d+)\s*\|\s*Всего\s*:\s*(\d+)\s*$/i;

  for (let index = 1; index < lines.length - 1; index += 1) {
    const firstMatch = lines[index].match(firstCountsRegex);
    if (!firstMatch) continue;

    const secondMatch = lines[index + 1]?.match(secondCountsRegex);
    if (!secondMatch) continue;

    const label = String(lines[index - 1] || "").trim();
    if (!label) continue;

    const counts = {
      registered: Number(firstMatch[1]),
      created: Number(firstMatch[2]),
      admission: Number(firstMatch[3]),
      preparation: Number(secondMatch[1]),
      break: Number(secondMatch[2]),
      total: Number(secondMatch[3])
    };

    const row = {
      label,
      ...counts
    };

    rows[normalizeLabel(label)] = row;
    rowList.push(row);
    index += 1;
  }

  return { rows, rowList };
}

export function parseWorkordersMessage(text, meta = {}) {
  const value = cleanText(text);

  if (!hasWorkordersHeader(value)) {
    return null;
  }

  const { rows, rowList } = parseRows(value);

  if (!rowList.length) {
    return null;
  }

  const periodMatch = value.match(
    /Период:\s*([^\n]+)/i
  );

  const sourceUpdatedMatch = value.match(
    /Обновлено:\s*([^\n]+)/i
  );

  const receivedMatch = value.match(
    /Получено\s*\(\s*5\s+статусов\s*\)\s*:\s*(\d+)/i
  );

  const countedMatch = value.match(
    /Учтено:\s*(\d+)/i
  );

  const withoutJournalMatch = value.match(
    /Без\s+журнала:\s*(\d+)/i
  );

  const journalsMatch = value.match(
    /Журналов:\s*(\d+)/i
  );

  return {
    format: "sk11-workorders-v1",
    parsedAt: new Date().toISOString(),
    messageTimestamp:
      Number(meta.messageTimestamp || 0) || null,
    messageId:
      String(meta.messageId || ""),
    messageIds:
      Array.isArray(meta.messageIds)
        ? meta.messageIds.map((value) => String(value || "")).filter(Boolean)
        : [],
    parts:
      Number(meta.parts || 1) || 1,
    period:
      periodMatch?.[1]?.trim() || "",
    sourceUpdatedAt:
      sourceUpdatedMatch?.[1]?.trim() || "",
    received:
      receivedMatch ? Number(receivedMatch[1]) : null,
    counted:
      countedMatch ? Number(countedMatch[1]) : null,
    withoutJournal:
      withoutJournalMatch ? Number(withoutJournalMatch[1]) : null,
    journals:
      journalsMatch ? Number(journalsMatch[1]) : null,
    rowCount: rowList.length,
    rows,
    rowList
  };
}

async function fetchLatestSnapshotFromMax() {
  const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();
  const chatId = getWorkordersChatId();

  if (!botToken) {
    throw new Error("Не указан MAX_BOT_TOKEN");
  }

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message:
        "Добавьте DISPATCHER_WORKORDERS_CHAT_ID в Environment Variables.",
      snapshot: null
    };
  }

  const url = new URL(`${MAX_API_BASE}/messages`);
  url.searchParams.set("chat_id", chatId);
  url.searchParams.set("count", "100");

  const response = await maxApiRequest(url, botToken);

  let data = null;
  try { data = JSON.parse(response.body); }
  catch { data = null; }

  if (!response.ok) {
    const details =
      data?.message ||
      data?.error ||
      response.body ||
      `HTTP ${response.status}`;

    throw new Error(`MAX API: ${details}`);
  }

  const messages = Array.isArray(data?.messages)
    ? [...data.messages]
    : [];

  messages.sort(
    (a, b) =>
      Number(b?.timestamp || 0) -
      Number(a?.timestamp || 0)
  );

  const headerIndex = messages.findIndex(
    (message) => hasWorkordersHeader(message?.body?.text)
  );

  if (headerIndex < 0) {
    return {
      configured: true,
      status: "no_data",
      message:
        "В последних 100 сообщениях не найдено сообщение «СК-11 • Наряды / допуски».",
      snapshot: null
    };
  }

  const firstMessage = messages[headerIndex];
  const firstText = String(firstMessage?.body?.text || "");
  const partInfo = getPartInfo(firstText);

  const parseSingle = () => parseWorkordersMessage(firstText, {
    messageTimestamp: firstMessage?.timestamp,
    messageId:
      firstMessage?.body?.mid ||
      firstMessage?.mid ||
      "",
    messageIds: [
      firstMessage?.body?.mid ||
      firstMessage?.mid ||
      ""
    ],
    parts: 1
  });

  if (!partInfo || partInfo.total <= 1) {
    const snapshot = parseSingle();

    return snapshot
      ? {
          configured: true,
          status: "ok",
          message: "",
          snapshot
        }
      : {
          configured: true,
          status: "parse_error",
          message:
            "Сообщение «СК-11 • Наряды / допуски» найдено, но строки журналов не распознаны.",
          snapshot: null
        };
  }

  const embeddedParts = getAllPartNumbers(firstText, partInfo.total);
  if (embeddedParts.size === partInfo.total) {
    const snapshot = parseWorkordersMessage(firstText, {
      messageTimestamp: firstMessage?.timestamp,
      messageId:
        firstMessage?.body?.mid ||
        firstMessage?.mid ||
        "",
      messageIds: [
        firstMessage?.body?.mid ||
        firstMessage?.mid ||
        ""
      ],
      parts: partInfo.total
    });

    return snapshot
      ? {
          configured: true,
          status: "ok",
          message: "",
          snapshot
        }
      : {
          configured: true,
          status: "parse_error",
          message:
            "Сообщение найдено, но строки журналов не распознаны.",
          snapshot: null
        };
  }

  const parts = new Map();
  parts.set(partInfo.part, firstMessage);

  const firstTimestampMs = toMillis(firstMessage?.timestamp);

  for (let part = 1; part <= partInfo.total; part += 1) {
    if (parts.has(part)) continue;

    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const message of messages) {
      if (message === firstMessage) continue;

      const text = String(message?.body?.text || "");
      const candidateInfo = getPartInfo(text);

      if (
        !candidateInfo ||
        candidateInfo.total !== partInfo.total ||
        candidateInfo.part !== part ||
        !looksLikeWorkordersPart(text)
      ) {
        continue;
      }

      const timestampMs = toMillis(message?.timestamp);
      const distance =
        firstTimestampMs && timestampMs
          ? Math.abs(timestampMs - firstTimestampMs)
          : Math.abs(messages.indexOf(message) - headerIndex) * 1000;

      if (
        distance <= PART_MATCH_WINDOW_MS &&
        distance < bestDistance
      ) {
        best = message;
        bestDistance = distance;
      }
    }

    if (best) {
      parts.set(part, best);
    }
  }

  if (parts.size !== partInfo.total) {
    const missing = [];
    for (let part = 1; part <= partInfo.total; part += 1) {
      if (!parts.has(part)) missing.push(part);
    }

    return {
      configured: true,
      status: "partial",
      message:
        `Найдено новое сообщение СК-11, но ещё не получены части: ${missing.join(", ")} из ${partInfo.total}.`,
      snapshot: null
    };
  }

  const orderedMessages = [];
  for (let part = 1; part <= partInfo.total; part += 1) {
    orderedMessages.push(parts.get(part));
  }

  const combinedText = orderedMessages
    .map((message) => String(message?.body?.text || ""))
    .join("\n\n");

  const messageIds = orderedMessages
    .map(
      (message) =>
        message?.body?.mid ||
        message?.mid ||
        ""
    )
    .filter(Boolean);

  const snapshot = parseWorkordersMessage(combinedText, {
    messageTimestamp: firstMessage?.timestamp,
    messageId: messageIds[0] || "",
    messageIds,
    parts: partInfo.total
  });

  return snapshot
    ? {
        configured: true,
        status: "ok",
        message: "",
        snapshot
      }
    : {
        configured: true,
        status: "parse_error",
        message:
          "Все части сообщения найдены, но строки журналов не распознаны.",
        snapshot: null
      };
}

export async function getLatestWorkordersSnapshot() {
  const chatId = getWorkordersChatId();

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message:
        "Добавьте DISPATCHER_WORKORDERS_CHAT_ID в Environment Variables.",
      snapshot: null,
      stale: false,
      cached: false
    };
  }

  const cacheSeconds = getCacheSeconds();
  const cached = await readCachedSnapshot();

  if (
    cached?.snapshot &&
    cached?.cachedAt &&
    Date.now() - Date.parse(cached.cachedAt) < cacheSeconds * 1000
  ) {
    return {
      ...cached,
      cached: true,
      stale: false
    };
  }

  try {
    const fresh = await fetchLatestSnapshotFromMax();

    if (fresh.status === "partial" && cached?.snapshot) {
      return {
        ...cached,
        cached: true,
        stale: true,
        status: "waiting_parts",
        message:
          `${fresh.message} Пока показан предыдущий полный снимок.`
      };
    }

    const payload = {
      ...fresh,
      cachedAt: new Date().toISOString(),
      cached: false,
      stale: false
    };

    if (fresh.snapshot) {
      await writeCachedSnapshot(payload);
    }

    return payload;
  } catch (error) {
    if (cached?.snapshot) {
      return {
        ...cached,
        cached: true,
        stale: true,
        status: "stale",
        message:
          `MAX временно недоступен. Показаны последние сохранённые данные. ${
            error instanceof Error ? error.message : String(error)
          }`
      };
    }

    return {
      configured: true,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить данные нарядов/допусков из MAX",
      snapshot: null,
      stale: false,
      cached: false
    };
  }
}

export function aggregateWorkordersSources(snapshot, sourceLabels) {
  const totals = zeroCounts();
  const sources = Array.isArray(sourceLabels)
    ? sourceLabels.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  const matchedSources = [];
  const missingSources = [];
  const sourceBreakdown = [];

  for (const source of sources) {
    const row = snapshot?.rows?.[normalizeLabel(source)];

    if (!row) {
      missingSources.push(source);
      sourceBreakdown.push({
        source,
        label: source,
        matched: false,
        ...zeroCounts()
      });
      continue;
    }

    matchedSources.push(row.label);

    const counts = {
      registered: Number(row.registered || 0),
      created: Number(row.created || 0),
      admission: Number(row.admission || 0),
      preparation: Number(row.preparation || 0),
      break: Number(row.break || 0),
      total: Number(row.total || 0)
    };

    sourceBreakdown.push({
      source,
      label: row.label,
      matched: true,
      ...counts
    });

    totals.registered += counts.registered;
    totals.created += counts.created;
    totals.admission += counts.admission;
    totals.preparation += counts.preparation;
    totals.break += counts.break;
    totals.total += counts.total;
  }

  return {
    ...totals,
    matchedSources,
    missingSources,
    configuredSources: sources,
    sourceBreakdown
  };
}
