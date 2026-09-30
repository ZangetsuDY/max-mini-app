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
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
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

export function parseOutagesOmsMessage(text, meta = {}) {
  const value = cleanText(text);

  if (!hasOutagesHeader(value)) {
    return null;
  }

  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = {};
  const rowList = [];
  const countRegex =
    /^Активных\s+аварийных\s*:\s*(\d+)\s*$/i;

  for (let index = 0; index < lines.length - 1; index += 1) {
    const label = lines[index];
    const match = lines[index + 1]?.match(countRegex);

    if (!match) continue;

    const count = Number(match[1]);
    const row = {
      label,
      count
    };

    rows[normalizeOutageSourceLabel(label)] = row;
    rowList.push(row);
    index += 1;
  }

  if (!rowList.length) {
    return null;
  }

  const sourceUpdatedMatch = value.match(
    /Обновлено:\s*([^\n]+)/i
  );

  const activeTotalMatch = value.match(
    /Active\s+всего:\s*(\d+)/i
  );

  const emergencyTotalMatch = value.match(
    /Аварийных:\s*(\d+)/i
  );

  const departmentsMatch = value.match(
    /Подразделений\s+в\s+active:\s*(\d+)/i
  );

  const withoutDepartmentMatch = value.match(
    /Без\s+department\.name:\s*(\d+)/i
  );

  const reportedTotalMatch = value.match(
    /ИТОГО:\s*(\d+)/i
  );

  return {
    format: "sk11-oms-outages-v1",
    parsedAt: new Date().toISOString(),
    messageTimestamp:
      Number(meta.messageTimestamp || 0) || null,
    messageId:
      String(meta.messageId || ""),
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
      reportedTotalMatch ? Number(reportedTotalMatch[1]) : null,
    rowCount: rowList.length,
    rows,
    rowList
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

  for (const message of messages) {
    const text = message?.body?.text;
    if (!text || !hasOutagesHeader(text)) continue;

    const snapshot = parseOutagesOmsMessage(text, {
      messageTimestamp: message?.timestamp,
      messageId:
        message?.body?.mid ||
        message?.mid ||
        ""
    });

    if (snapshot) {
      return {
        configured: true,
        status: "ok",
        message: "",
        snapshot
      };
    }

    return {
      configured: true,
      status: "parse_error",
      message:
        "Последнее сообщение «СК-11 OMS • Аварийные отключения» найдено, но строки подразделений не распознаны.",
      snapshot: null
    };
  }

  return {
    configured: true,
    status: "no_data",
    message:
      "В последних 100 сообщениях не найдено сообщение «СК-11 OMS • Аварийные отключения».",
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
        count: 0
      });
      continue;
    }

    const rowCount = Number(row.count || 0);
    count += rowCount;
    matchedSources.push(row.label);
    sourceBreakdown.push({
      source,
      label: row.label,
      matched: true,
      count: rowCount
    });
  }

  return {
    count,
    configuredSources: sources,
    matchedSources,
    missingSources,
    sourceBreakdown
  };
}
