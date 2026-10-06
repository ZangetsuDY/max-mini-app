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
  "lenenergo:max-mini-app:outages:oms-snapshot";
const PART_MATCH_WINDOW_MS = 12 * 60 * 1000;

function safeParse(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

export function normalizeOutageSourceLabel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");

  if (
    normalized === "[без shiftroles]" ||
    normalized === "без shiftroles" ||
    normalized === "[без department.name]" ||
    normalized === "без department.name" ||
    normalized === "без департамента" ||
    normalized === "не принявшие смену"
  ) {
    return "__no_shift_roles__";
  }

  return normalized;
}

function displayOutageSourceLabel(value) {
  return normalizeOutageSourceLabel(value) === "__no_shift_roles__"
    ? "Не принявшие смену"
    : String(value || "").trim();
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

function getOutagesChatId() {
  return String(
    process.env.OUTAGES_CHAT_ID ||
    process.env.EMERGENCY_OUTAGES_CHAT_ID ||
    ""
  ).trim();
}

function getCacheSeconds() {
  const value = Number(
    process.env.OUTAGES_CACHE_SECONDS ||
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
    console.error("Не удалось сохранить кэш аварийных отключений:", error);
  }
}

function hasOutagesHeader(text) {
  return /СК-11\s+OMS\s*[•·]\s*Аварийные\s+отключения/i.test(
    cleanText(text)
  );
}

function looksLikeOutagesPart(text) {
  const value = cleanText(text);
  return (
    /Отключение\s*#\s*\d+/i.test(value) ||
    /аварийных(?:\s+с\s+объектами)?\s*:\s*\d+/i.test(value) ||
    /ИТОГО\s+аварийных(?:\s+с\s+объектами)?\s*:/i.test(value)
  );
}

function getPartInfo(text) {
  const match = cleanText(text).match(
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
    total > 30
  ) {
    return null;
  }

  return { part, total };
}

function getAllPartNumbers(text, total) {
  const found = new Set();
  const regex = /Часть\s*(\d+)\s*\/\s*(\d+)/gi;
  const value = cleanText(text);

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

function parseOutageRows(value) {
  const lines = cleanText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = {};
  const rowList = [];
  let currentRow = null;
  let currentOutage = null;

  const finalizeOutage = () => {
    if (!currentRow || !currentOutage) return;

    currentOutage.appeals = Number(currentOutage.appeals || 0);
    currentOutage.disconnectedObjects = Array.isArray(currentOutage.disconnectedObjects)
      ? currentOutage.disconnectedObjects
      : [];

    currentRow.outages.push(currentOutage);
    currentRow.appeals += currentOutage.appeals;
    currentOutage = null;
  };

  const finalizeRow = () => {
    finalizeOutage();
    if (!currentRow) return;

    currentRow.parsedCount = currentRow.outages.length;
    const key = normalizeOutageSourceLabel(currentRow.label);
    currentRow.label = displayOutageSourceLabel(currentRow.label);
    rows[key] = currentRow;
    rowList.push(currentRow);
    currentRow = null;
  };

  for (const line of lines) {
    if (
      /^Часть\s*\d+\s*\/\s*\d+/i.test(line) ||
      /^СК-11\s+OMS/i.test(line) ||
      /^Фильтр\s*:/i.test(line) ||
      /^Группировка\s*:/i.test(line) ||
      /^Обновлено\s*:/i.test(line) ||
      /^Active\s+всего\s*:/i.test(line) ||
      /^Аварийных(?:\s+с\s+объектами)?\s*:/i.test(line) ||
      /^Подразделений\s+в\s+active\s*:/i.test(line) ||
      /^Без\s+department\.name\s*:/i.test(line) ||
      /^По\s+РЭС\s+и\s+отключениям\s*:/i.test(line) ||
      /^ИТОГО\s+аварийных(?:\s+с\s+объектами)?\s*:/i.test(line) ||
      /^ИТОГО\s*:/i.test(line)
    ) {
      continue;
    }

    const rowMatch = line.match(/^(.+?)\s*[•·]\s*аварийных(?:\s+с\s+объектами)?\s*:\s*(\d+)\s*$/i);
    if (rowMatch) {
      finalizeRow();
      currentRow = {
        label: rowMatch[1].trim(),
        count: Number(rowMatch[2]),
        appeals: 0,
        outages: []
      };
      continue;
    }

    const outageMatch = line.match(/^Отключение\s*#\s*(\d+)\s*$/i);
    if (outageMatch) {
      if (!currentRow) continue;
      finalizeOutage();
      currentOutage = {
        id: outageMatch[1],
        createdAt: "",
        createdBy: "",
        equipment: "",
        energyObject: "",
        disconnectedObjects: [],
        appeals: 0
      };
      continue;
    }

    if (!currentOutage) continue;

    const createdMatch = line.match(/^Создано\s*:\s*(.+)$/i);
    if (createdMatch) {
      currentOutage.createdAt = createdMatch[1].trim();
      continue;
    }

    const creatorMatch = line.match(/^Создал\s*:\s*(.*)$/i);
    if (creatorMatch) {
      currentOutage.createdBy = creatorMatch[1].trim();
      continue;
    }

    const equipmentMatch = line.match(/^Оборудование\s*:\s*(.*)$/i);
    if (equipmentMatch) {
      currentOutage.equipment = equipmentMatch[1].trim();
      continue;
    }

    const energyObjectMatch = line.match(/^Энергообъект\s*:\s*(.*)$/i);
    if (energyObjectMatch) {
      currentOutage.energyObject = energyObjectMatch[1].trim();
      continue;
    }

    const disconnectedMatch = line.match(/^Обесточенные\s+объекты\s*:\s*(.*)$/i);
    if (disconnectedMatch) {
      currentOutage.disconnectedObjects = disconnectedMatch[1]
        .split(/\s*,\s*/)
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    const appealsMatch = line.match(/^Обращений\s*:\s*(\d+)\s*$/i);
    if (appealsMatch) {
      currentOutage.appeals = Number(appealsMatch[1]);
    }
  }

  finalizeRow();

  return { rows, rowList };
}

export function parseOutagesOmsMessage(text, meta = {}) {
  const value = cleanText(text);

  if (!hasOutagesHeader(value)) {
    return null;
  }

  const parsedRows = parseOutageRows(value);

  if (!parsedRows.rowList.length) {
    return null;
  }

  const sourceUpdatedMatch = value.match(
    /Обновлено:\s*([^\n]+)/i
  );
  const activeTotalMatch = value.match(
    /Active\s+всего:\s*(\d+)/i
  );
  const emergencyTotalMatch = value.match(
    /Аварийных(?:\s+с\s+объектами)?\s*:\s*(\d+)/i
  );
  const departmentsMatch = value.match(
    /Подразделений\s+в\s+active:\s*(\d+)/i
  );
  const withoutDepartmentMatch = value.match(
    /(?:Без\s+department\.name|Без\s+shiftRoles|Не\s+принявшие\s+смену)\s*:\s*(\d+)/i
  );
  const reportedTotalMatch = value.match(
    /ИТОГО(?:\s+аварийных(?:\s+с\s+объектами)?)?\s*:\s*(\d+)/i
  );

  const totalAppeals = parsedRows.rowList.reduce(
    (sum, row) => sum + Number(row.appeals || 0),
    0
  );

  const outageCount = parsedRows.rowList.reduce(
    (sum, row) => sum + Number(row.count || 0),
    0
  );

  return {
    format: "sk11-oms-outages-v2",
    parsedAt: new Date().toISOString(),
    messageTimestamp:
      Number(meta.messageTimestamp || 0) || null,
    messageId:
      String(meta.messageId || ""),
    messageIds:
      Array.isArray(meta.messageIds)
        ? meta.messageIds.filter(Boolean)
        : [],
    parts:
      Number(meta.parts || 1) || 1,
    sourceUpdatedAt:
      sourceUpdatedMatch?.[1]?.trim() || "",
    activeTotal:
      activeTotalMatch ? Number(activeTotalMatch[1]) : null,
    emergencyTotal:
      emergencyTotalMatch ? Number(emergencyTotalMatch[1]) : null,
    departmentsInActive:
      departmentsMatch ? Number(departmentsMatch[1]) : null,
    withoutDepartment:
      withoutDepartmentMatch ? Number(withoutDepartmentMatch[1]) : null,
    reportedTotal:
      reportedTotalMatch ? Number(reportedTotalMatch[1]) : outageCount,
    totalAppeals,
    rowCount: parsedRows.rowList.length,
    rows: parsedRows.rows,
    rowList: parsedRows.rowList
  };
}

async function fetchLatestSnapshotFromMax() {
  const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();
  const chatId = getOutagesChatId();

  if (!botToken) {
    throw new Error("Не указан MAX_BOT_TOKEN");
  }

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message:
        "Добавьте OUTAGES_CHAT_ID в Environment Variables.",
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
    (message) => hasOutagesHeader(message?.body?.text)
  );

  if (headerIndex < 0) {
    return {
      configured: true,
      status: "no_data",
      message:
        "В последних 100 сообщениях не найдено сообщение «СК-11 OMS • Аварийные отключения».",
      snapshot: null
    };
  }

  const firstMessage = messages[headerIndex];
  const firstText = String(firstMessage?.body?.text || "");
  const partInfo = getPartInfo(firstText);

  const parseSingle = () => parseOutagesOmsMessage(firstText, {
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
            "Сообщение «СК-11 OMS • Аварийные отключения» найдено, но данные отключений не распознаны.",
          snapshot: null
        };
  }

  const embeddedParts = getAllPartNumbers(firstText, partInfo.total);
  if (embeddedParts.size === partInfo.total) {
    const snapshot = parseOutagesOmsMessage(firstText, {
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
            "Сообщение найдено, но данные отключений не распознаны.",
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
        !looksLikeOutagesPart(text)
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
        `Найдена новая сводка OMS, но ещё не получены части: ${missing.join(", ")} из ${partInfo.total}.`,
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

  const snapshot = parseOutagesOmsMessage(combinedText, {
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
          "Все части OMS-сводки найдены, но данные отключений не распознаны.",
        snapshot: null
      };
}

export async function getLatestOutageSnapshot() {
  const chatId = getOutagesChatId();

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message:
        "Добавьте OUTAGES_CHAT_ID в Environment Variables.",
      snapshot: null,
      stale: false,
      cached: false
    };
  }

  const cacheSeconds = getCacheSeconds();
  const cachedRaw = await readCachedSnapshot();
  const cached =
    cachedRaw?.chatId === chatId
      ? cachedRaw
      : null;

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
          fresh.message ||
          "Новая сводка ещё собирается из нескольких частей. Показаны последние полные данные."
      };
    }

    const payload = {
      ...fresh,
      chatId,
      cachedAt: new Date().toISOString(),
      cached: false,
      stale: false
    };

    if (fresh.snapshot) {
      await writeCachedSnapshot(payload);
      return payload;
    }

    if (cached?.snapshot) {
      return {
        ...cached,
        cached: true,
        stale: true,
        status: "stale",
        message:
          fresh.message ||
          "Новая сводка пока не распознана. Показаны последние сохранённые данные."
      };
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
          : "Не удалось загрузить аварийные отключения из MAX",
      snapshot: null,
      stale: false,
      cached: false
    };
  }
}

export function aggregateOutageSources(snapshot, sourceLabels) {
  const sources = Array.isArray(sourceLabels)
    ? sourceLabels
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    : [];

  let count = 0;
  let appeals = 0;
  const matchedSources = [];
  const missingSources = [];
  const sourceBreakdown = [];

  for (const source of sources) {
    const row = snapshot?.rows?.[
      normalizeOutageSourceLabel(source)
    ];

    if (!row) {
      missingSources.push(source);
      sourceBreakdown.push({
        source,
        label: source,
        matched: false,
        count: 0,
        appeals: 0,
        outages: []
      });
      continue;
    }

    const rowCount = Number(row.count || 0);
    const rowAppeals = Number(row.appeals || 0);
    count += rowCount;
    appeals += rowAppeals;
    matchedSources.push(row.label);
    sourceBreakdown.push({
      source,
      label: row.label,
      matched: true,
      count: rowCount,
      appeals: rowAppeals,
      outages: Array.isArray(row.outages) ? row.outages : []
    });
  }

  return {
    count,
    appeals,
    configuredSources: sources,
    matchedSources,
    missingSources,
    sourceBreakdown
  };
}
