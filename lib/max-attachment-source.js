/*
  Общая загрузка детальных txt-файлов СК-11 из чатов MAX:
  поиск последнего сообщения с нужным заголовком и вложением,
  скачивание файла, разбор, кэш (в памяти процесса и в Redis по ID
  сообщения) и запасной вариант при недоступности MAX.
  Используется для заявок и для НДР.
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
const MAX_FILE_BYTES = 15 * 1024 * 1024;

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

function isMaxHost(hostname) {
  return /(^|\.)max\.ru$/i.test(String(hostname || ""));
}

export function httpGet(url, { headers = {}, maxBytes = MAX_FILE_BYTES, redirects = 3 } = {}) {
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
          const nextHeaders = isMaxHost(next.hostname) ? headers : {};
          resolve(httpGet(next, { headers: nextHeaders, maxBytes, redirects: redirects - 1 }));
          return;
        }

        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            request.destroy(new Error("Файл слишком большой"));
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

export function decodeText(buffer) {
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

export function findFileAttachment(message) {
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

/*
  Последние сообщения чата (новые первыми).
*/
export async function fetchChatMessages(chatId, count = 100) {
  const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();
  if (!botToken) throw new Error("Не указан MAX_BOT_TOKEN");

  const url = new URL(`${MAX_API_BASE}/messages`);
  url.searchParams.set("chat_id", chatId);
  url.searchParams.set("count", String(count));

  const response = await httpGet(url, {
    headers: { Authorization: botToken, Accept: "application/json" },
    maxBytes: 8 * 1024 * 1024
  });
  let data = null;
  try { data = JSON.parse(response.body.toString("utf8")); } catch { data = null; }

  if (!response.ok) {
    throw new Error(`MAX API: ${data?.message || data?.error || `HTTP ${response.status}`}`);
  }

  return (Array.isArray(data?.messages) ? [...data.messages] : [])
    .sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0));
}

// Текст txt-вложения сообщения.
export async function downloadAttachmentText(message) {
  const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();
  const attachment = findFileAttachment(message);
  if (!attachment) throw new Error("В сообщении нет файла");
  const fileUrl = attachment?.payload?.url || attachment?.url;
  const file = await httpGet(fileUrl, {
    headers: isMaxHost(new URL(fileUrl).hostname) ? { Authorization: botToken } : {}
  });
  if (!file.ok) throw new Error(`Не удалось скачать файл: HTTP ${file.status}`);
  return {
    text: decodeText(file.body),
    fileName: String(attachment?.filename || attachment?.payload?.filename || "")
  };
}

export function messageId(message) {
  return String(message?.body?.mid || message?.mid || message?.body?.seq || message?.timestamp || "");
}

function getCheckSeconds() {
  const value = Number(process.env.DISPATCHER_DETAILS_CACHE_SECONDS || process.env.DISPATCHER_CACHE_SECONDS || 20);
  if (!Number.isFinite(value)) return 20;
  return Math.max(5, Math.min(Math.round(value), 300));
}

/*
  options:
    getChatId()   — ID чата MAX
    chatEnvName   — имя переменной окружения (для подсказки)
    header        — RegExp заголовка сообщения с файлом
    headerLabel   — заголовок для сообщений об ошибке
    cacheKey      — префикс ключей Redis
    parse(text)   — разбор файла; null, если формат не распознан
    noun          — «заявок» / «нарядов» для текстов ошибок
*/
export function createAttachmentSource(options) {
  const {
    getChatId,
    chatEnvName,
    header,
    headerLabel,
    cacheKey,
    parse,
    noun = "данных"
  } = options;

  const pointerKey = `${cacheKey}:latest`;
  const memory = { mid: "", details: null, checkedAt: 0, pending: null };

  async function readCache(mid) {
    if (!isRuntimeStoreConfigured() || !mid) return null;
    try {
      const raw = await redisCommand("GET", `${cacheKey}:${mid}`);
      if (!raw) return null;
      return JSON.parse(zlib.gunzipSync(Buffer.from(String(raw), "base64")).toString("utf8"));
    } catch {
      return null;
    }
  }

  async function writeCache(mid, details) {
    if (!isRuntimeStoreConfigured() || !mid) return;
    try {
      const packed = zlib.gzipSync(Buffer.from(JSON.stringify(details), "utf8")).toString("base64");
      await redisCommand("SET", `${cacheKey}:${mid}`, packed, "EX", String(3 * 24 * 3600));
      await redisCommand("SET", pointerKey, mid);
    } catch (error) {
      console.error(`Не удалось сохранить кэш (${headerLabel}):`, error);
    }
  }

  async function fetchLatest() {
    const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();
    const chatId = getChatId();

    if (!chatId) {
      return {
        configured: false,
        status: "not_configured",
        message: `Добавьте ${chatEnvName} в Environment Variables.`,
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
      header.test(String(item?.body?.text || "")) && findFileAttachment(item)
    );

    if (!message) {
      return {
        configured: true,
        status: "no_data",
        message: `В последних 100 сообщениях не найдено сообщение «${headerLabel}» с txt-файлом.`,
        details: null
      };
    }

    const mid = messageId(message);
    if (memory.details && memory.mid === mid) {
      return { configured: true, status: "ok", message: "", details: memory.details, mid };
    }

    const cached = await readCache(mid);
    if (cached) {
      return { configured: true, status: "ok", message: "", details: cached, mid };
    }

    const attachment = findFileAttachment(message);
    const fileUrl = attachment?.payload?.url || attachment?.url;
    const file = await httpGet(fileUrl, {
      headers: isMaxHost(new URL(fileUrl).hostname) ? { Authorization: botToken } : {}
    });

    if (!file.ok) {
      throw new Error(`Не удалось скачать файл ${noun}: HTTP ${file.status}`);
    }

    const parsed = parse(decodeText(file.body));
    if (!parsed) {
      return {
        configured: true,
        status: "parse_error",
        message: `Файл ${noun} найден, но его формат не распознан.`,
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

    await writeCache(mid, details);
    return { configured: true, status: "ok", message: "", details, mid };
  }

  return async function getLatest() {
    if (memory.details && Date.now() - memory.checkedAt < getCheckSeconds() * 1000) {
      return { configured: true, status: "ok", message: "", details: memory.details, cached: true, stale: false };
    }

    if (!memory.pending) {
      memory.pending = (async () => {
        try {
          const fresh = await fetchLatest();
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
              const mid = await redisCommand("GET", pointerKey);
              fallback = await readCache(String(mid || ""));
            } catch {
              fallback = null;
            }
          }
          const reason = error instanceof Error ? error.message : String(error);
          return fallback
            ? { configured: true, status: "stale", message: `MAX временно недоступен. Показаны последние сохранённые данные. ${reason}`, details: fallback, cached: true, stale: true }
            : { configured: true, status: "error", message: reason, details: null, cached: false, stale: false };
        } finally {
          memory.pending = null;
        }
      })();
    }

    return memory.pending;
  };
}
