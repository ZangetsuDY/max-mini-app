import crypto from "node:crypto";

const MAX_API_BASE = "https://platform-api2.max.ru";
const ONE_HOUR_SECONDS = 60 * 60;

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
   ВАЛИДАЦИЯ MAX WebApp initData
   Алгоритм соответствует официальной документации MAX.
   ========================================================= */

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseInitData(initData) {
  const pairs = String(initData || "")
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return [part, ""];
      }

      return [
        part.slice(0, separatorIndex),
        part.slice(separatorIndex + 1)
      ];
    });

  return pairs;
}

function validateMaxInitData(initData, botToken) {
  if (!initData || !botToken) {
    return { ok: false, reason: "Отсутствуют данные авторизации MAX" };
  }

  const params = parseInitData(initData);
  const hashItems = params.filter(([key]) => key === "hash");

  if (hashItems.length !== 1) {
    return { ok: false, reason: "Некорректный hash в initData" };
  }

  const originalHash = safeDecode(hashItems[0][1]);

  const decoded = params
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => [key, safeDecode(value)])
    .sort(([a], [b]) => a.localeCompare(b));

  const launchParams = decoded
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // secret_key = HMAC-SHA256(key="WebAppData", message=BOT_TOKEN)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // hash = HMAC-SHA256(key=secret_key, message=launch_params)
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(launchParams)
    .digest("hex");

  const calculatedBuffer = Buffer.from(calculatedHash, "hex");
  const originalBuffer = Buffer.from(originalHash, "hex");

  if (
    calculatedBuffer.length !== originalBuffer.length ||
    !crypto.timingSafeEqual(calculatedBuffer, originalBuffer)
  ) {
    return { ok: false, reason: "Подпись MAX не прошла проверку" };
  }

  const authDateEntry = decoded.find(([key]) => key === "auth_date");
  const authDate = authDateEntry ? Number(authDateEntry[1]) : 0;
  const now = Math.floor(Date.now() / 1000);

  if (!authDate || Math.abs(now - authDate) > ONE_HOUR_SECONDS) {
    return { ok: false, reason: "Сессия MAX устарела. Откройте мини-приложение заново." };
  }

  const userEntry = decoded.find(([key]) => key === "user");
  let user = null;

  if (userEntry) {
    try {
      user = JSON.parse(userEntry[1]);
    } catch {
      user = null;
    }
  }

  return {
    ok: true,
    user,
    authDate
  };
}

/* =========================================================
   РАЗБОР СООБЩЕНИЙ
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

  // ВАЖНО: сначала проверяем включение.
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

  if (!match) {
    return null;
  }

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

  if (!rawText) {
    return null;
  }

  const text = cleanMaxMarkdown(rawText);

  if (!/Аварийное отключение фидера\s+6-20\s*кВ/i.test(text)) {
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
    const authorParts = authorFull.match(/^(.*?)\s*\((.*?)\)\s*$/);

    author = authorParts
      ? authorParts[1].trim()
      : authorFull;

    role = authorParts
      ? authorParts[2].trim()
      : "";

    eventTime = authorTimeMatch[2].trim();
  } else {
    // На случай небольшого изменения шаблона сообщения:
    // используем отправителя/время сообщения MAX как fallback.
    const senderName = [
      message?.sender?.first_name,
      message?.sender?.last_name
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    author = senderName || message?.sender?.name || "Не указан";
    eventTime = formatApiTimestamp(message?.timestamp);
  }

  const parsedDate = parseRussianDate(eventTime);
  const timestamp = parsedDate
    ? parsedDate.getTime()
    : Number(message?.timestamp || 0);

  return {
    object,
    objectKey: normalizeObjectName(object),
    eventTime,
    addedTime: addedMatch ? addedMatch[1].trim() : "",
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
      active.set(message.objectKey, message);
      continue;
    }

    if (message.state === "enabled") {
      active.delete(message.objectKey);
    }
  }

  return [...active.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(({ objectKey, timestamp, state, ...publicData }) => publicData);
}

/* =========================================================
   ЗАГРУЗКА ИСТОРИИ ИЗ MAX

   MAX возвращает максимум 100 сообщений за запрос и новые сообщения
   идут первыми. Поэтому идём назад по времени несколькими страницами.
   ========================================================= */

async function requestMessages(botToken, chatId, beforeTimestamp = null) {
  const url = new URL(`${MAX_API_BASE}/messages`);

  url.searchParams.set("chat_id", String(chatId));
  url.searchParams.set("count", "100");

  if (beforeTimestamp) {
    url.searchParams.set("from", String(beforeTimestamp));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: botToken
    },
    cache: "no-store"
  });

  const text = await response.text();

  let data = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const details =
      data?.message ||
      data?.error ||
      text ||
      `HTTP ${response.status}`;

    throw new Error(`MAX API: ${details}`);
  }

  return Array.isArray(data?.messages)
    ? data.messages
    : [];
}

async function fetchMessageHistory(botToken, chatId) {
  const maxPages = Math.max(
    1,
    Math.min(Number(process.env.MAX_HISTORY_PAGES || 5), 10)
  );

  const lookbackDays = Math.max(
    1,
    Math.min(Number(process.env.MAX_LOOKBACK_DAYS || 7), 30)
  );

  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const all = [];
  const seen = new Set();

  let beforeTimestamp = null;
  let historyLimited = false;

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await requestMessages(
      botToken,
      chatId,
      beforeTimestamp
    );

    if (!batch.length) {
      break;
    }

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
      .map((message) => Number(message?.timestamp || 0))
      .filter(Boolean);

    if (!timestamps.length) {
      break;
    }

    const oldest = Math.min(...timestamps);

    if (oldest <= cutoff) {
      break;
    }

    if (batch.length < 100) {
      break;
    }

    beforeTimestamp = oldest - 1;

    if (page === maxPages - 1) {
      historyLimited = true;
    }
  }

  // Не анализируем сообщения старше выбранного окна.
  const filtered = all.filter(
    (message) => Number(message?.timestamp || 0) >= cutoff
  );

  return {
    messages: filtered,
    historyLimited
  };
}

/* =========================================================
   VERCEL FUNCTION
   ========================================================= */

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    const botToken = process.env.MAX_BOT_TOKEN;
    const chatId = process.env.VES_CHAT_ID;

    if (!botToken || !chatId) {
      return json(
        {
          error:
            "На сервере не настроены MAX_BOT_TOKEN и/или VES_CHAT_ID"
        },
        500
      );
    }

    const initData = request.headers.get("X-Max-Init-Data") || "";
    const validation = validateMaxInitData(initData, botToken);

    if (!validation.ok) {
      return json(
        {
          error: validation.reason
        },
        401
      );
    }

    try {
      const history = await fetchMessageHistory(
        botToken,
        chatId
      );

      const outages = calculateActiveOutages(
        history.messages
      );

      return json({
        division: "ВЭС",
        count: outages.length,
        outages,
        analyzedMessages: history.messages.length,
        historyLimited: history.historyLimited,
        updatedAt: new Date().toISOString()
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
