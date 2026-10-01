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
  "lenenergo:max-mini-app:dispatcher:sk11-snapshot";

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
    review: 0,
    approved: 0,
    open: 0,
    closed: 0,
    acknowledged: 0,
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

function getRequestsChatId() {
  return String(
    process.env.DISPATCHER_REQUESTS_CHAT_ID ||
    process.env.SK11_CHAT_ID ||
    ""
  ).trim();
}

function getCacheSeconds() {
  const value = Number(
    process.env.DISPATCHER_CACHE_SECONDS || 10
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
    console.error("Не удалось сохранить кэш СК-11:", error);
  }
}

export function parseSk11Message(text, meta = {}) {
  const value = cleanText(text);

  if (!/СК-11\s*[—–-]\s*сч[её]тчик\s+заявок\s+РЭС/i.test(value)) {
    return null;
  }

  const rows = {};
  const rowList = [];

  const lineRegex =
    /^(.+?)\s+[—–-]\s+(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)\s*$/;

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(lineRegex);
    if (!match) continue;

    const label = match[1].trim();
    const counts = {
      review: Number(match[2]),
      approved: Number(match[3]),
      open: Number(match[4]),
      closed: Number(match[5]),
      acknowledged: Number(match[6]),
      total: Number(match[7])
    };

    const row = {
      label,
      ...counts
    };

    rows[normalizeLabel(label)] = row;
    rowList.push(row);
  }

  if (!rowList.length) {
    return null;
  }

  const periodMatch = value.match(
    /Период:\s*([^\n]+)/i
  );

  const sourceUpdatedMatch = value.match(
    /Последнее\s+обновление:\s*([^\n]+)/i
  );

  const apiMatch = value.match(
    /API\s+вернул:\s*(\d+)\s*\/\s*лимит\s*(\d+)\s*\|\s*учтено:\s*(\d+)/i
  );

  const totalMatch = value.match(
    /Всего\s+заявок:\s*(\d+)/i
  );

  return {
    format: "sk11-requests-v1",
    parsedAt: new Date().toISOString(),
    messageTimestamp:
      Number(meta.messageTimestamp || 0) || null,
    messageId:
      String(meta.messageId || ""),
    period:
      periodMatch?.[1]?.trim() || "",
    sourceUpdatedAt:
      sourceUpdatedMatch?.[1]?.trim() || "",
    apiReturned:
      apiMatch ? Number(apiMatch[1]) : null,
    apiLimit:
      apiMatch ? Number(apiMatch[2]) : null,
    apiCounted:
      apiMatch ? Number(apiMatch[3]) : null,
    reportedTotal:
      totalMatch ? Number(totalMatch[1]) : null,
    rowCount: rowList.length,
    rows,
    rowList
  };
}

async function fetchLatestSnapshotFromMax() {
  const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();
  const chatId = getRequestsChatId();

  if (!botToken) {
    throw new Error("Не указан MAX_BOT_TOKEN");
  }

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message:
        "Добавьте DISPATCHER_REQUESTS_CHAT_ID в Environment Variables Vercel.",
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
    if (!text) continue;

    const parsed = parseSk11Message(text, {
      messageTimestamp: message?.timestamp,
      messageId:
        message?.body?.mid ||
        message?.mid ||
        ""
    });

    if (parsed) {
      return {
        configured: true,
        status: "ok",
        message: "",
        snapshot: parsed
      };
    }
  }

  return {
    configured: true,
    status: "no_data",
    message:
      "В последних 100 сообщениях не найдено сообщение «СК-11 — счётчик заявок РЭС».",
    snapshot: null
  };
}

export async function getLatestDispatcherSnapshot() {
  const chatId = getRequestsChatId();

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message:
        "Добавьте DISPATCHER_REQUESTS_CHAT_ID в Environment Variables Vercel.",
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
          : "Не удалось загрузить данные из MAX",
      snapshot: null,
      stale: false,
      cached: false
    };
  }
}

export function aggregateDispatcherSources(snapshot, sourceLabels) {
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
      review: Number(row.review || 0),
      approved: Number(row.approved || 0),
      open: Number(row.open || 0),
      closed: Number(row.closed || 0),
      acknowledged: Number(row.acknowledged || 0),
      total: Number(row.total || 0)
    };

    sourceBreakdown.push({
      source,
      label: row.label,
      matched: true,
      ...counts
    });

    totals.review += counts.review;
    totals.approved += counts.approved;
    totals.open += counts.open;
    totals.closed += counts.closed;
    totals.acknowledged += counts.acknowledged;
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
