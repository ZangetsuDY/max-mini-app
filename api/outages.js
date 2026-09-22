import crypto from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";

import {
  validateMaxInitData,
  getSession
} from "../lib/security.js";

const MAX_API_BASE = "https://platform-api2.max.ru";

const DIVISIONS = {
  ves: { name: "ВЭС", env: "CHAT_VES" },
  gtes: { name: "ГтЭС", env: "CHAT_GTES" },
  yues: { name: "ЮЭС", env: "CHAT_YUES" },
  ses: { name: "СЭС", env: "CHAT_SES" },
  thes: { name: "ТхЭС", env: "CHAT_THES" },
  ks: { name: "КС", env: "CHAT_KS" },
  nles: { name: "НлЭС", env: "CHAT_NLES" },
  knes: { name: "КнЭС", env: "CHAT_KNES" },
  yuvvr: { name: "ЮВВР", env: "CHAT_YUVVR" },
  svvr: { name: "СВВР", env: "CHAT_SVVR" },
  vvvr: { name: "ВВВР", env: "CHAT_VVVR" },
  tsvvr: { name: "ЦВВР", env: "CHAT_TSVVR" },
  os: { name: "ОС", env: "CHAT_OS" },
  volkhov: { name: "Волхов", env: "CHAT_VOLKHOV" }
};

function getChatId(divisionId) {
  const config = DIVISIONS[divisionId];
  if (!config) throw new Error("Неизвестное подразделение");

  const jsonValue = process.env.CHAT_IDS_JSON;
  if (jsonValue) {
    let map;
    try { map = JSON.parse(jsonValue); }
    catch { throw new Error("CHAT_IDS_JSON содержит некорректный JSON"); }
    const value = map?.[divisionId];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  const fallback = process.env[config.env];
  if (fallback && String(fallback).trim()) return String(fallback).trim();

  throw new Error(`Для ${config.name} не указан chat_id. Добавьте его в CHAT_IDS_JSON или ${config.env}.`);
}


function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/* =========================================================
   TLS ДЛЯ MAX API
   ========================================================= */

function loadCertificate(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = fs.readFileSync(fileUrl);
  return new crypto.X509Certificate(raw).toString();
}

let maxHttpsAgent = null;

function getMaxHttpsAgent() {
  if (maxHttpsAgent) return maxHttpsAgent;

  try {
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
  } catch (error) {
    const details =
      error instanceof Error
        ? error.message
        : String(error);

    throw new Error(
      "Не удалось загрузить корневой сертификат Минцифры из папки /certs. " +
      details
    );
  }
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

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          const body = Buffer
            .concat(chunks)
            .toString("utf8");

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
      request.destroy(
        new Error("Таймаут соединения с API MAX")
      );
    });

    request.on("error", reject);
    request.end();
  });
}

/* =========================================================
   ПАРСЕР СООБЩЕНИЙ
   ========================================================= */

function cleanMaxMarkdown(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\r/g, "")
    .trim();
}

function normalizeObjectName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, "")
    .replace(/\./g, "");
}

function getRecordState(record) {
  const value = String(record || "")
    .toLowerCase()
    .replace(/ё/g, "е");

  if (
    value.includes("включил") ||
    value.includes("включили") ||
    value.includes("включен") ||
    value.includes("включена") ||
    value.includes("включено") ||
    value.includes("рпв успешно")
  ) {
    return "enabled";
  }

  if (
    value.includes("отключился") ||
    value.includes("отключилась") ||
    value.includes("отключились") ||
    value.includes("отключен") ||
    value.includes("отключена") ||
    value.includes("отключено")
  ) {
    return "disabled";
  }

  return "unknown";
}

function parseRussianDate(value) {
  const match = String(value || "").match(
    /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/
  );

  if (!match) return null;

  const [, day, month, year, hour, minute, second] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function formatApiTimestamp(timestamp) {
  if (!timestamp) return "";

  const date = new Date(Number(timestamp));

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
    .format(date)
    .replace(",", "");
}

function parseEmergencyMessage(message) {
  const rawText = message?.body?.text;

  if (!rawText) return null;

  const text = cleanMaxMarkdown(rawText);

  if (
    !/Аварийное отключение фидера\s+6-20\s*кВ/i.test(text)
  ) {
    return null;
  }

  const objectMatch = text.match(
    /Объект:\s*(.*?)\s*✏\s*Запись:/i
  );

  const recordMatch = text.match(
    /Запись:\s*([\s\S]*)$/i
  );

  const authorTimeMatch = text.match(
    /👤\s*([\s\S]*?)\s*🕐\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i
  );

  const addedMatch = text.match(
    /Добавлено:\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i
  );

  if (!objectMatch || !recordMatch) {
    return null;
  }

  const object = objectMatch[1].trim();
  const record = recordMatch[1].trim();

  let author = "";
  let role = "";
  let eventTime = "";

  if (authorTimeMatch) {
    const authorFull = authorTimeMatch[1].trim();
    const authorParts = authorFull.match(
      /^(.*?)\s*\((.*?)\)\s*$/
    );

    author = authorParts
      ? authorParts[1].trim()
      : authorFull;

    role = authorParts
      ? authorParts[2].trim()
      : "";

    eventTime = authorTimeMatch[2].trim();
  } else {
    const senderName = [
      message?.sender?.first_name,
      message?.sender?.last_name
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    author =
      senderName ||
      message?.sender?.name ||
      "Не указан";

    eventTime =
      formatApiTimestamp(message?.timestamp);
  }

  const parsedDate = parseRussianDate(eventTime);

  const timestamp = parsedDate
    ? parsedDate.getTime()
    : Number(message?.timestamp || 0);

  return {
    object,
    objectKey: normalizeObjectName(object),
    eventTime,
    addedTime: addedMatch
      ? addedMatch[1].trim()
      : "",
    timestamp,
    author,
    role,
    record,
    state: getRecordState(record)
  };
}

function calculateActiveOutages(messages) {
  const parsed = messages
    .map(parseEmergencyMessage)
    .filter(Boolean)
    .filter((item) => item.state !== "unknown")
    .sort((a, b) => a.timestamp - b.timestamp);

  const active = new Map();

  for (const message of parsed) {
    if (message.state === "disabled") {
      active.set(
        message.objectKey,
        message
      );
      continue;
    }

    if (message.state === "enabled") {
      active.delete(message.objectKey);
    }
  }

  return [...active.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(
      ({
        objectKey,
        timestamp,
        state,
        ...publicData
      }) => publicData
    );
}

/* =========================================================
   MAX API
   ========================================================= */

async function requestMessages(
  botToken,
  chatId,
  beforeTimestamp = null
) {
  const url = new URL(
    `${MAX_API_BASE}/messages`
  );

  url.searchParams.set(
    "chat_id",
    String(chatId)
  );

  url.searchParams.set("count", "100");

  if (beforeTimestamp) {
    url.searchParams.set(
      "from",
      String(beforeTimestamp)
    );
  }

  const response = await maxApiRequest(
    url,
    botToken
  );

  let data = null;

  try {
    data = JSON.parse(response.body);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const details =
      data?.message ||
      data?.error ||
      response.body ||
      `HTTP ${response.status}`;

    throw new Error(
      `MAX API: ${details}`
    );
  }

  return Array.isArray(data?.messages)
    ? data.messages
    : [];
}

async function fetchMessageHistory(
  botToken,
  chatId
) {
  const maxPages = Math.max(
    1,
    Math.min(
      Number(
        process.env.MAX_HISTORY_PAGES || 3
      ),
      10
    )
  );

  const lookbackDays = Math.max(
    1,
    Math.min(
      Number(
        process.env.MAX_LOOKBACK_DAYS || 7
      ),
      30
    )
  );

  const cutoff =
    Date.now() -
    lookbackDays * 24 * 60 * 60 * 1000;

  const all = [];
  const seen = new Set();

  let beforeTimestamp = null;
  let historyLimited = false;

  for (
    let page = 0;
    page < maxPages;
    page += 1
  ) {
    const batch = await requestMessages(
      botToken,
      chatId,
      beforeTimestamp
    );

    if (!batch.length) break;

    for (const message of batch) {
      const key =
        message?.body?.mid ||
        message?.mid ||
        `${message?.timestamp}-${message?.body?.text || ""}`;

      if (!seen.has(key)) {
        seen.add(key);
        all.push(message);
      }
    }

    const timestamps = batch
      .map((message) =>
        Number(message?.timestamp || 0)
      )
      .filter(Boolean);

    if (!timestamps.length) break;

    const oldest = Math.min(
      ...timestamps
    );

    if (oldest <= cutoff) break;
    if (batch.length < 100) break;

    beforeTimestamp = oldest - 1;

    if (page === maxPages - 1) {
      historyLimited = true;
    }
  }

  return {
    messages: all.filter(
      (message) =>
        Number(message?.timestamp || 0) >=
        cutoff
    ),
    historyLimited
  };
}

/* =========================================================
   ENDPOINT
   ========================================================= */

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json(
        { error: "Method not allowed" },
        405
      );
    }

    const botToken =
      process.env.MAX_BOT_TOKEN;

    if (!botToken) {
      return json(
        { error: "На сервере не настроен MAX_BOT_TOKEN" },
        500
      );
    }

    let session;

    try {
      session = getSession(request);
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Ошибка сессии"
        },
        500
      );
    }

    if (!session) {
      return json(
        {
          error:
            "Требуется авторизация"
        },
        401
      );
    }

    const initData =
      request.headers.get(
        "X-Max-Init-Data"
      ) || "";

    const validation =
      validateMaxInitData(
        initData,
        botToken
      );

    if (!validation.ok) {
      return json(
        {
          error:
            validation.reason
        },
        401
      );
    }

    const requestUrl = new URL(request.url);
    const divisionId = String(requestUrl.searchParams.get("division") || "").toLowerCase();
    const division = DIVISIONS[divisionId];

    if (!division) {
      return json({ error: "Неизвестное подразделение" }, 400);
    }

    let chatId;
    try {
      chatId = getChatId(divisionId);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Не указан chat_id" },
        500
      );
    }

    try {
      const history =
        await fetchMessageHistory(
          botToken,
          chatId
        );

      const outages =
        calculateActiveOutages(
          history.messages
        );

      return json({
        division: division.name,
        divisionId,
        count: outages.length,
        outages,
        analyzedMessages:
          history.messages.length,
        historyLimited:
          history.historyLimited,
        updatedAt:
          new Date().toISOString()
      });
    } catch (error) {
      console.error(error);

      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Неизвестная ошибка"
        },
        502
      );
    }
  }
};
