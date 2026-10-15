/*
  Детальные заявки СК-11 из txt-файла, который бот присылает в чат заявок
  отдельным сообщением «СК-11 — заявки по РЭС (детально, файл)».
  Счётчик (первое сообщение) по-прежнему разбирает dispatcher-data.js.
*/
import crypto from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";
import zlib from "node:zlib";

import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const MAX_API_BASE = "https://platform-api2.max.ru";
const DETAILS_CACHE_PREFIX = "lenenergo:max-mini-app:dispatcher:sk11-details:";
const DETAILS_POINTER_KEY = "lenenergo:max-mini-app:dispatcher:sk11-details:latest";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const DETAILS_HEADER = /СК-11\s*[—–-]\s*заявки\s+по\s+РЭС\s*\(детально/i;

/* ------------------------------------------------------------------ */
/* Разбор файла                                                        */
/* ------------------------------------------------------------------ */

export function normalizeRequestSourceLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
}

const STATUS_KEYS = [
  [/^в\s+рассмотрении/i, "review"],
  [/^разрешена/i, "approved"],
  [/^открыта/i, "open"],
  [/^закрыта/i, "closed"],
  [/^принята\s+к\s+сведению/i, "acknowledged"]
];

function statusKey(status) {
  const text = String(status || "").trim();
  for (const [pattern, key] of STATUS_KEYS) {
    if (pattern.test(text)) return key;
  }
  return "other";
}

function splitWorks(value) {
  return String(value || "")
    .split(/;\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// Делим «Также РЭС» по запятым, но не внутри скобок:
// «Диспетчер ОДГ РЭС (Сланцевский р-н, Оредежский и Осьминский уч.)».
function splitSourceList(value) {
  const result = [];
  let depth = 0;
  let buffer = "";
  for (const char of String(value || "")) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      if (buffer.trim()) result.push(buffer.trim());
      buffer = "";
      continue;
    }
    buffer += char;
  }
  if (buffer.trim()) result.push(buffer.trim());
  return result;
}

export function parseRequestsDetailsText(rawText) {
  const text = String(rawText || "")
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n");

  if (!DETAILS_HEADER.test(text.slice(0, 400))) {
    return null;
  }

  const lines = text.split("\n");
  const requests = [];
  const sections = [];
  let section = null;
  let current = null;

  const finish = () => {
    if (current) requests.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      finish();
      continue;
    }

    const sectionMatch = line.match(/^■\s*(.+?)\s*\((\d+)\)\s*$/);
    if (sectionMatch) {
      finish();
      section = { label: sectionMatch[1].trim(), count: Number(sectionMatch[2]) };
      sections.push(section);
      continue;
    }

    const requestMatch = line.match(/^№\s*(\d+)\s*[—–-]\s*(.+)$/);
    if (requestMatch) {
      finish();
      const [statusPart, ...flags] = requestMatch[2].split("|").map((item) => item.trim());
      current = {
        id: requestMatch[1],
        status: statusPart,
        statusKey: statusKey(statusPart),
        ending: flags.some((flag) => /заканч/i.test(flag)),
        flags: flags.filter(Boolean),
        source: section?.label || "",
        object: "",
        equipment: "",
        start: "",
        end: "",
        openedAt: "",
        closedAt: "",
        works: [],
        alsoSources: []
      };
      continue;
    }

    if (!current) continue;

    const field = line.match(/^([^:]{2,30}):\s*(.*)$/);
    if (!field) {
      // Перенос длинного текста работ на следующую строку.
      if (current.works.length) {
        current.works.push(...splitWorks(line));
      }
      continue;
    }

    const key = field[1].trim().toLowerCase();
    const value = field[2].trim();

    if (key === "объект") current.object = value;
    else if (key === "оборуд." || key === "оборудование") current.equipment = value;
    else if (key === "начало") {
      const [start, end] = value.split("|").map((item) => item.trim());
      current.start = start || "";
      const endMatch = String(end || "").match(/^Конец:\s*(.*)$/i);
      current.end = endMatch ? endMatch[1].trim() : "";
    } else if (key === "конец") current.end = value;
    else if (key === "открыта") current.openedAt = value;
    else if (key === "закрыта") current.closedAt = value;
    else if (key === "работы") current.works = splitWorks(value);
    else if (key === "также рэс") {
      current.alsoSources = splitSourceList(value);
    }
  }
  finish();

  const header = text.slice(0, 600);
  const periodMatch = header.match(/Смена\s+([^:\n]+):\s*([^\n]+)/i);
  const generatedMatch = header.match(/Сформировано:\s*([^\n]+)/i);
  const totalMatch = header.match(/Заявок:\s*(\d+)/i);

  return {
    format: "sk11-requests-details-v1",
    shift: periodMatch ? periodMatch[1].trim() : "",
    period: periodMatch ? periodMatch[2].trim() : "",
    generatedAt: generatedMatch ? generatedMatch[1].trim() : "",
    reportedTotal: totalMatch ? Number(totalMatch[1]) : requests.length,
    sections,
    requests
  };
}

/* ------------------------------------------------------------------ */
/* Загрузка из MAX                                                     */
/* ------------------------------------------------------------------ */

function loadCertificate(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = fs.readFileSync(fileUrl);
  return new crypto.X509Certificate(raw).toString();
}

let httpsAgent = null;

function getMaxHttpsAgent() {
  if (httpsAgent) return httpsAgent;
  httpsAgent = new https.Agent({
    keepAlive: true,
    ca: [
      ...tls.rootCertificates,
      loadCertificate("../certs/Russian_Trusted_Root_CA.cer")
    ]
  });
  return httpsAgent;
}

function httpGet(url, { headers = {}, maxBytes = MAX_FILE_BYTES, redirects = 3 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = https.request(
      target,
      { method: "GET", agent: getMaxHttpsAgent(), headers, timeout: 20000 },
      (response) => {
        const status = Number(response.statusCode || 500);

        if (status >= 300 && status < 400 && response.headers.location && redirects > 0) {
          response.resume();
          const next = new URL(response.headers.location, target);
          // Токен бота отправляем только на домены MAX.
          const nextHeaders = /(^|\.)max\.ru$/i.test(next.hostname) ? headers : {};
          resolve(httpGet(next, { headers: nextHeaders, maxBytes, redirects: redirects - 1 }));
          return;
        }

        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            request.destroy(new Error("Файл заявок слишком большой"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({
          status,
          ok: status >= 200 && status < 300,
          headers: response.headers,
          body: Buffer.concat(chunks)
        }));
      }
    );
    request.on("timeout", () => request.destroy(new Error("Таймаут соединения с MAX")));
    request.on("error", reject);
    request.end();
  });
}

function decodeText(buffer) {
  const utf8 = buffer.toString("utf8");
  // Если файл пришёл не в UTF-8 (много «�»), пробуем Windows-1251.
  const broken = (utf8.match(/�/g) || []).length;
  if (broken > 20) {
    try {
      return new TextDecoder("windows-1251").decode(buffer);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

function getRequestsChatId() {
  return String(
    process.env.DISPATCHER_REQUESTS_CHAT_ID ||
    process.env.SK11_CHAT_ID ||
    ""
  ).trim();
}

function findFileAttachment(message) {
  const attachments = [
    ...(Array.isArray(message?.body?.attachments) ? message.body.attachments : []),
    ...(Array.isArray(message?.attachments) ? message.attachments : [])
  ];
  return attachments.find((item) => {
    const url = item?.payload?.url || item?.url;
    if (!url) return false;
    const name = String(item?.filename || item?.payload?.filename || item?.name || "");
    return item?.type === "file" || /\.txt$/i.test(name);
  }) || null;
}

function messageId(message) {
  return String(message?.body?.mid || message?.mid || message?.body?.seq || message?.timestamp || "");
}

async function readDetailsCache(mid) {
  if (!isRuntimeStoreConfigured() || !mid) return null;
  try {
    const raw = await redisCommand("GET", `${DETAILS_CACHE_PREFIX}${mid}`);
    if (!raw) return null;
    return JSON.parse(zlib.gunzipSync(Buffer.from(String(raw), "base64")).toString("utf8"));
  } catch {
    return null;
  }
}

async function writeDetailsCache(mid, details) {
  if (!isRuntimeStoreConfigured() || !mid) return;
  try {
    const packed = zlib.gzipSync(Buffer.from(JSON.stringify(details), "utf8")).toString("base64");
    await redisCommand("SET", `${DETAILS_CACHE_PREFIX}${mid}`, packed, "EX", String(3 * 24 * 3600));
    await redisCommand("SET", DETAILS_POINTER_KEY, mid);
  } catch (error) {
    console.error("Не удалось сохранить кэш детальных заявок:", error);
  }
}

// Тёплый кэш внутри процесса: разобранный файл и время последней проверки чата.
const memory = {
  mid: "",
  details: null,
  checkedAt: 0,
  pending: null
};

function getCheckSeconds() {
  const value = Number(process.env.DISPATCHER_DETAILS_CACHE_SECONDS || process.env.DISPATCHER_CACHE_SECONDS || 20);
  if (!Number.isFinite(value)) return 20;
  return Math.max(5, Math.min(Math.round(value), 300));
}

async function fetchLatestDetails() {
  const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();
  const chatId = getRequestsChatId();

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message: "Добавьте DISPATCHER_REQUESTS_CHAT_ID в Environment Variables.",
      details: null
    };
  }
  if (!botToken) {
    throw new Error("Не указан MAX_BOT_TOKEN");
  }

  const url = new URL(`${MAX_API_BASE}/messages`);
  url.searchParams.set("chat_id", chatId);
  url.searchParams.set("count", "100");

  const response = await httpGet(url, {
    headers: { Authorization: botToken, Accept: "application/json" },
    maxBytes: 8 * 1024 * 1024
  });
  let data = null;
  try { data = JSON.parse(response.body.toString("utf8")); } catch { data = null; }

  if (!response.ok) {
    throw new Error(`MAX API: ${data?.message || data?.error || `HTTP ${response.status}`}`);
  }

  const messages = (Array.isArray(data?.messages) ? [...data.messages] : [])
    .sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0));

  const message = messages.find((item) =>
    DETAILS_HEADER.test(String(item?.body?.text || "")) && findFileAttachment(item)
  );

  if (!message) {
    return {
      configured: true,
      status: "no_data",
      message: "В последних 100 сообщениях не найдено сообщение «СК-11 — заявки по РЭС (детально, файл)» с txt-файлом.",
      details: null
    };
  }

  const mid = messageId(message);
  if (memory.details && memory.mid === mid) {
    return { configured: true, status: "ok", message: "", details: memory.details, mid };
  }

  const cached = await readDetailsCache(mid);
  if (cached) {
    return { configured: true, status: "ok", message: "", details: cached, mid };
  }

  const attachment = findFileAttachment(message);
  const fileUrl = attachment?.payload?.url || attachment?.url;
  const fileHost = new URL(fileUrl).hostname;
  const file = await httpGet(fileUrl, {
    headers: /(^|\.)max\.ru$/i.test(fileHost) ? { Authorization: botToken } : {}
  });

  if (!file.ok) {
    throw new Error(`Не удалось скачать файл заявок: HTTP ${file.status}`);
  }

  const parsed = parseRequestsDetailsText(decodeText(file.body));
  if (!parsed) {
    return {
      configured: true,
      status: "parse_error",
      message: "Файл детальных заявок найден, но его формат не распознан.",
      details: null
    };
  }

  const details = {
    ...parsed,
    messageId: mid,
    messageTimestamp: Number(message?.timestamp || 0) || null,
    fileName: String(attachment?.filename || attachment?.payload?.filename || ""),
    parsedAt: new Date().toISOString()
  };

  await writeDetailsCache(mid, details);
  return { configured: true, status: "ok", message: "", details, mid };
}

export async function getLatestRequestsDetails() {
  const now = Date.now();
  if (memory.details && now - memory.checkedAt < getCheckSeconds() * 1000) {
    return { configured: true, status: "ok", message: "", details: memory.details, cached: true, stale: false };
  }

  if (!memory.pending) {
    memory.pending = (async () => {
      try {
        const fresh = await fetchLatestDetails();
        if (fresh.details) {
          memory.details = fresh.details;
          memory.mid = fresh.mid;
          memory.checkedAt = Date.now();
        }
        return { ...fresh, cached: false, stale: false };
      } catch (error) {
        let fallback = memory.details;
        if (!fallback && isRuntimeStoreConfigured()) {
          try {
            const mid = await redisCommand("GET", DETAILS_POINTER_KEY);
            fallback = await readDetailsCache(String(mid || ""));
          } catch {
            fallback = null;
          }
        }
        const reason = error instanceof Error ? error.message : String(error);
        return fallback
          ? { configured: true, status: "stale", message: `MAX временно недоступен. Показаны последние сохранённые заявки. ${reason}`, details: fallback, cached: true, stale: true }
          : { configured: true, status: "error", message: reason, details: null, cached: false, stale: false };
      } finally {
        memory.pending = null;
      }
    })();
  }

  return memory.pending;
}

/*
  Заявки для набора ролей-источников: основной РЭС или любой из «Также РЭС».
*/
export function filterRequestsBySources(details, sourceLabels) {
  const keys = new Set(
    (Array.isArray(sourceLabels) ? sourceLabels : [])
      .map(normalizeRequestSourceLabel)
      .filter(Boolean)
  );
  const requests = Array.isArray(details?.requests) ? details.requests : [];
  if (!keys.size) return [];
  return requests.filter((item) =>
    keys.has(normalizeRequestSourceLabel(item.source)) ||
    item.alsoSources.some((label) => keys.has(normalizeRequestSourceLabel(label)))
  );
}
