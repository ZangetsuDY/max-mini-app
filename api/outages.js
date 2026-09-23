import crypto from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";

import {
  validateMaxInitData,
  getSession
} from "../lib/security.js";

import {
  getSystemState
} from "../lib/runtime-store.js";

import {
  resolveSessionAccess,
  hasPanel
} from "../lib/access-control.js";

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
   ПАРСЕР АВАРИЙНЫХ СООБЩЕНИЙ

   Поддерживает реальные варианты из чатов:
   - Аварийное отключение фидера 6-20 кВ
   - Аварийные отключения
   - Аварийное отключение ЛЭП 35-220 кВ
   - Аварийные события

   Главное отличие от старой версии:
   состояние считается не по полю "Объект" целиком, а по конкретному
   фидеру / выключателю / линии, извлечённому из текста сообщения.
   ========================================================= */

function cleanMaxMarkdown(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\r/g, "")
    .trim();
}

function normalizeSpaces(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "");
}

function makeAsset(type, key, label, source = "") {
  return {
    type,
    key: `${type}:${key}`,
    label: normalizeSpaces(label),
    source: normalizeSpaces(source || label)
  };
}

function uniqueAssets(assets) {
  const map = new Map();

  for (const asset of assets || []) {
    if (!asset?.key) continue;

    if (!map.has(asset.key)) {
      map.set(asset.key, asset);
    }
  }

  return [...map.values()];
}

/*
  Фидеры:
    ф331-03
    ф.331-03
    фБч-04
    ф.Сим-04
    ф. К-21
    ф330-02,-04,-05

  В последнем случае получаем три отдельных объекта:
    ф330-02
    ф330-04
    ф330-05
*/
function extractFeederAssets(text) {
  const value = String(text || "");
  const result = [];

  const compactListRegex =
    /ф\.?\s*([a-zа-яё0-9]+)-(\d{1,3})((?:\s*,\s*-\d{1,3})+)/gi;

  let compactMatch;

  while (
    (compactMatch =
      compactListRegex.exec(value)) !== null
  ) {
    const base =
      compactMatch[1];

    const first =
      compactMatch[2];

    const tail =
      compactMatch[3];

    const suffixes = [
      first,
      ...[...tail.matchAll(/-\s*(\d{1,3})/g)]
        .map((match) => match[1])
    ];

    for (const suffix of suffixes) {
      const raw =
        `ф${base}-${suffix}`;

      result.push(
        makeAsset(
          "feeder",
          normalizeForKey(raw),
          raw,
          compactMatch[0]
        )
      );
    }
  }

  const singleRegex =
    /ф\.?\s*([a-zа-яё0-9]+)-(\d{1,3})/gi;

  let match;

  while (
    (match = singleRegex.exec(value)) !== null
  ) {
    const raw =
      `ф${match[1]}-${match[2]}`;

    result.push(
      makeAsset(
        "feeder",
        normalizeForKey(raw),
        raw,
        match[0]
      )
    );
  }

  return uniqueAssets(result);
}

/*
  Выключатели вида В-26, В-478, В-816, В-1064.
  "В-10" часто означает просто выключатель 10 кВ и не является
  уникальным объектом, поэтому такие номинальные значения исключаем.
*/
function extractBreakerAssets(text) {
  const value = String(text || "");
  const result = [];

  const regex =
    /В\s*-\s*(\d{1,4})/gi;

  let match;

  while (
    (match = regex.exec(value)) !== null
  ) {
    const number =
      String(match[1]);

    if (
      ["6", "10", "20", "35", "110", "220"].includes(
        number
      )
    ) {
      continue;
    }

    const raw =
      `В-${number}`;

    result.push(
      makeAsset(
        "breaker",
        normalizeForKey(raw),
        raw,
        match[0]
      )
    );
  }

  return uniqueAssets(result);
}

function isGenericResObject(value) {
  const text =
    normalizeSpaces(value)
      .toLowerCase()
      .replace(/ё/g, "е");

  return (
    /(?:^|,\s*)[а-яa-z-]+\s+рэс$/i.test(text) ||
    /^[а-яa-z-]+\s+рэс$/i.test(text)
  );
}

/*
  Для ВЛ 35/110/220 кВ, когда номера фидера нет, ключом становится
  наименование самой линии из поля "Объект".
*/
function extractLineAsset(objectText) {
  const object =
    normalizeSpaces(objectText);

  if (
    !/ВЛ\s*(?:35|110|220)\s*кВ/i.test(
      object
    )
  ) {
    return [];
  }

  const key =
    normalizeForKey(object);

  if (!key) return [];

  return [
    makeAsset(
      "line",
      key,
      object,
      object
    )
  ];
}

function extractFallbackObjectAsset(objectText) {
  const object =
    normalizeSpaces(objectText);

  if (
    !object ||
    isGenericResObject(object)
  ) {
    return [];
  }

  /*
    Для сложного объекта сначала пытаемся вытащить фидер/выключатель.
    Например:
      "В-32, фЛжк-01" -> фЛжк-01
  */
  const specific = [
    ...extractFeederAssets(object),
    ...extractBreakerAssets(object)
  ];

  if (specific.length) {
    return uniqueAssets(specific);
  }

  const lines =
    extractLineAsset(object);

  if (lines.length) {
    return lines;
  }

  return [
    makeAsset(
      "object",
      normalizeForKey(object),
      object,
      object
    )
  ];
}

function extractSpecificAssets(text) {
  const feeders =
    extractFeederAssets(text);

  /*
    Если в тексте есть конкретный фидер, не добавляем В-10/другие
    выключатели из той же фразы — фидер является более стабильным ключом.
  */
  if (feeders.length) {
    return feeders;
  }

  return extractBreakerAssets(text);
}

function isSupportedEmergencyMessage(text) {
  return (
    /Аварийное отключение фидера\s+6\s*[-–—]\s*20\s*кВ/i.test(
      text
    ) ||
    /Аварийные отключения/i.test(
      text
    ) ||
    /Аварийное отключение ЛЭП\s+35\s*[-–—]\s*220\s*кВ/i.test(
      text
    ) ||
    /Аварийные события/i.test(
      text
    )
  );
}

function hasSuccessfulRestoration(text) {
  const value =
    String(text || "")
      .toLowerCase()
      .replace(/ё/g, "е");

  /*
    Не даём "неуспешно" случайно совпасть с "успешно":
    перед "усп" требуется граница слова.
  */
  const rpvApvSuccess =
    /(?:рпв|апв)\s*(?:[-:=]\s*)?усп(?:ешн[а-яa-z]*|\.)?/i.test(
      value
    ) ||
    /усп(?:ешн[а-яa-z]*|\.)?\s*(?:рпв|апв)/i.test(
      value
    );

  const switchedOn =
    /включ(?:ил|или|ен|ена|ено|ены)/i.test(
      value
    );

  const repeatDone =
    /включить\s+повторно[\s\S]*выполнено/i.test(
      value
    );

  const restored =
    /электроснабжени[ея]\s+восстановлен/i.test(
      value
    ) ||
    /напряжени[ея]\s+подано/i.test(
      value
    ) ||
    /введен[а-я]*\s+в\s+работу/i.test(
      value
    );

  return (
    rpvApvSuccess ||
    switchedOn ||
    repeatDone ||
    restored
  );
}

function hasFailedRestoration(text) {
  const value =
    String(text || "")
      .toLowerCase()
      .replace(/ё/g, "е");

  return (
    /(?:рпв|апв)\s*(?:[-:=]\s*)?(?:неуспешн[а-яa-z]*|ну)(?:[^а-яa-z]|$)/i.test(
      value
    ) ||
    /(?:рпв|апв)\s+не\s+успешн/i.test(
      value
    )
  );
}

function hasExplicitOutage(text) {
  const value =
    String(text || "")
      .toLowerCase()
      .replace(/ё/g, "е");

  return (
    /отключ(?:ился|илась|ились|ен|ена|ено|ены|ение|ения)/i.test(
      value
    ) ||
    /аварийн[а-яa-z]*\s+отключ/i.test(
      value
    ) ||
    /(^|[\s,.;:()\-])ао(?=$|[\s,.;:()\-])/i.test(
      value
    ) ||
    /в\s+отключенн[а-яa-z]*\s+положени/i.test(
      value
    ) ||
    /погашен[а-яa-z]*/i.test(
      value
    ) ||
    /обесточен[а-яa-z]*/i.test(
      value
    ) ||
    /без\s+напряжени/i.test(
      value
    ) ||
    hasFailedRestoration(value)
  );
}

function isNonClosingUpdate(text) {
  const value =
    String(text || "")
      .toLowerCase()
      .replace(/ё/g, "е");

  return (
    /подключен[а-яa-z]*\s+рисэ/i.test(
      value
    ) ||
    /обратн[а-яa-z]*\s+трансформац/i.test(
      value
    ) ||
    /уменьшен[а-яa-z]*\s+участок/i.test(
      value
    ) ||
    /выделен[а-яa-z]*\s+участок/i.test(
      value
    ) ||
    /произведен[а-яa-z]*\s+осмотр/i.test(
      value
    ) ||
    /организовываем\s+дг/i.test(
      value
    )
  );
}

function splitRecordIntoClauses(record) {
  /*
    Перед делением убираем точки после "ф.", иначе:
      "ф.331-03"
    ошибочно разделится на два предложения.
  */
  const prepared =
    String(record || "")
      .replace(/ф\.\s*/gi, "ф")
      .replace(/\r/g, "\n");

  return prepared
    .split(
      /(?:\n+|;\s*|(?<=[!?])\s+|(?<=\.)\s+(?=[А-ЯA-Z0-9]))/
    )
    .map(normalizeSpaces)
    .filter(Boolean);
}

function extractSuccessReferencedAssets(clause) {
  const value =
    String(clause || "");

  const lower =
    value
      .toLowerCase()
      .replace(/ё/g, "е");

  const markers = [
    /(?:рпв|апв)\s*(?:[-:=]\s*)?усп(?:ешн[а-яa-z]*|\.)?/gi,
    /усп(?:ешн[а-яa-z]*|\.)?\s*(?:рпв|апв)/gi,
    /включ(?:ил|или|ен|ена|ено|ены)/gi
  ];

  const pieces = [];

  for (const regex of markers) {
    let match;

    while (
      (match = regex.exec(lower)) !== null
    ) {
      /*
        Берём контекст вокруг успешного действия:
        это позволяет поймать как
          "успешное РПВ ф330-02,-05"
        так и
          "ф330-02,-05 РПВ успешно".
      */
      const start =
        Math.max(
          0,
          match.index - 80
        );

      const end =
        Math.min(
          value.length,
          match.index +
            match[0].length +
            100
        );

      pieces.push(
        value.slice(start, end)
      );
    }
  }

  return uniqueAssets(
    pieces.flatMap(
      extractSpecificAssets
    )
  );
}

function extractClauseStateEvents(
  clause,
  allRecordAssets
) {
  const clauseAssets =
    extractSpecificAssets(clause);

  const success =
    hasSuccessfulRestoration(clause);

  const outage =
    hasExplicitOutage(clause);

  const updateOnly =
    isNonClosingUpdate(clause) &&
    !success &&
    !outage;

  if (updateOnly) {
    return [];
  }

  /*
    Самый сложный случай:
      "аварийное отключение ф330-02,-04,-05.
       успешное РПВ ф330-02,-05"

    Для одной фразы, где одновременно есть авария и восстановление,
    сначала создаём отключение для всех упомянутых объектов,
    затем включение только для явно указанных возле РПВ/АПВ объектов.
  */
  if (
    outage &&
    success
  ) {
    const baseAssets =
      clauseAssets.length
        ? clauseAssets
        : allRecordAssets;

    const successAssets =
      extractSuccessReferencedAssets(
        clause
      );

    /*
      Если объект в сообщении один и успешное РПВ/АПВ не повторяет его имя,
      считаем восстановленным именно этот объект:
        "АО В ф330-06, АПВ неуспешное, РПВ успешное"
    */
    const effectiveSuccessAssets =
      successAssets.length
        ? successAssets
        : baseAssets.length === 1
          ? baseAssets
          : [];

    return [
      ...baseAssets.map(
        (asset) => ({
          asset,
          state: "disabled"
        })
      ),
      ...effectiveSuccessAssets.map(
        (asset) => ({
          asset,
          state: "enabled"
        })
      )
    ];
  }

  if (success) {
    const assets =
      clauseAssets.length
        ? clauseAssets
        : allRecordAssets;

    return assets.map(
      (asset) => ({
        asset,
        state: "enabled"
      })
    );
  }

  if (outage) {
    const assets =
      clauseAssets.length
        ? clauseAssets
        : allRecordAssets;

    return assets.map(
      (asset) => ({
        asset,
        state: "disabled"
      })
    );
  }

  return [];
}

const MOSCOW_OFFSET_MS =
  3 * 60 * 60 * 1000;

const DAY_MS =
  24 * 60 * 60 * 1000;

function getMoscowStartOfTodayMs() {
  const shifted =
    new Date(
      Date.now() + MOSCOW_OFFSET_MS
    );

  return (
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      0,
      0,
      0,
      0
    ) - MOSCOW_OFFSET_MS
  );
}

function parseRussianDate(value) {
  const match =
    String(value || "").match(
      /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

  const [
    ,
    day,
    month,
    year,
    hour,
    minute,
    second
  ] = match;

  /*
    Оперативное время в сообщениях считаем московским.
    Vercel работает в UTC.
  */
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) - MOSCOW_OFFSET_MS
  );
}

function formatApiTimestamp(timestamp) {
  if (!timestamp) return "";

  const date =
    new Date(
      Number(timestamp)
    );

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }
  )
    .format(date)
    .replace(",", "");
}

function parseEmergencyEvents(message) {
  const rawText =
    message?.body?.text;

  if (!rawText) {
    return {
      structured: false,
      events: []
    };
  }

  const text =
    cleanMaxMarkdown(rawText);

  if (
    !isSupportedEmergencyMessage(text)
  ) {
    return {
      structured: false,
      events: []
    };
  }

  const objectMatch =
    text.match(
      /Объект:\s*([\s\S]*?)(?=\s*(?:✏|📝)?\s*Запись:)/i
    );

  const recordMatch =
    text.match(
      /Запись:\s*([\s\S]*)$/i
    );

  /*
    Структурированное сообщение без Object/Record не используем для изменения
    состояния. Это защищает от случайных пересланных/ручных сообщений.
  */
  if (
    !objectMatch ||
    !recordMatch
  ) {
    return {
      structured: true,
      events: []
    };
  }

  const object =
    normalizeSpaces(
      objectMatch[1]
    );

  const record =
    normalizeSpaces(
      recordMatch[1]
    );

  const authorTimeMatch =
    text.match(
      /👤\s*([\s\S]*?)\s*(?:🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛|⏰|⏱️?|🕰️?)?\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i
    );

  const addedMatch =
    text.match(
      /Добавлено:\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i
    );

  let author = "";
  let role = "";
  let eventTime = "";

  if (authorTimeMatch) {
    const authorFull =
      normalizeSpaces(
        authorTimeMatch[1]
      );

    const authorParts =
      authorFull.match(
        /^(.*?)\s*\((.*?)\)\s*$/
      );

    author =
      authorParts
        ? authorParts[1].trim()
        : authorFull;

    role =
      authorParts
        ? authorParts[2].trim()
        : "";

    eventTime =
      authorTimeMatch[2].trim();
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
      formatApiTimestamp(
        message?.timestamp
      );
  }

  const parsedDate =
    parseRussianDate(eventTime);

  const addedTime =
    addedMatch
      ? addedMatch[1].trim()
      : "";

  const parsedAddedDate =
    parseRussianDate(
      addedTime
    );

  const timestamp =
    parsedDate
      ? parsedDate.getTime()
      : Number(
          message?.timestamp || 0
        );

  const addedTimestamp =
    parsedAddedDate
      ? parsedAddedDate.getTime()
      : Number(
          message?.timestamp || 0
        );

  /*
    Сначала ищем конкретные объекты в поле "Запись".
    Поле "Объект: Рощинский РЭС" не должно становиться ключом,
    если в записи есть конкретный фидер.
  */
  const recordAssets =
    extractSpecificAssets(
      record
    );

  const allRecordAssets =
    recordAssets.length
      ? recordAssets
      : extractFallbackObjectAsset(
          object
        );

  const clauses =
    splitRecordIntoClauses(
      record
    );

  let stateEvents =
    clauses.flatMap(
      (clause) =>
        extractClauseStateEvents(
          clause,
          allRecordAssets
        )
    );

  /*
    Если предложение не удалось классифицировать по отдельным фразам,
    пробуем всю запись целиком.
  */
  if (!stateEvents.length) {
    stateEvents =
      extractClauseStateEvents(
        record,
        allRecordAssets
      );
  }

  /*
    Для заголовка "Аварийные события" повреждение может быть описано без слова
    "отключение", но с "погашены потребители".
  */
  if (
    !stateEvents.length &&
    /Аварийные события/i.test(
      text
    ) &&
    /погашен[а-яa-z]*|обесточен[а-яa-z]*/i.test(
      record
    )
  ) {
    stateEvents =
      allRecordAssets.map(
        (asset) => ({
          asset,
          state: "disabled"
        })
      );
  }

  const seenStateEvents =
    new Set();

  const events = [];

  let sequence = 0;

  for (const event of stateEvents) {
    if (
      !event?.asset?.key ||
      !["disabled", "enabled"].includes(
        event.state
      )
    ) {
      continue;
    }

    const signature =
      `${event.asset.key}|${event.state}`;

    /*
      В рамках одного сообщения одинаковый объект/состояние дублировать не надо,
      но последовательность disabled -> enabled сохраняем.
    */
    if (
      seenStateEvents.has(signature)
    ) {
      continue;
    }

    seenStateEvents.add(
      signature
    );

    events.push({
      assetKey:
        event.asset.key,

      object:
        event.asset.label,

      sourceObject:
        object,

      eventTime,
      addedTime,
      timestamp,
      addedTimestamp,

      author,
      role,
      record,

      state:
        event.state,

      sequence:
        sequence++
    });
  }

  return {
    structured: true,
    events
  };
}

function parseEmergencyMessages(messages) {
  const parsed = [];

  let structuredMessages = 0;
  let ignoredStructuredMessages = 0;

  for (const message of messages) {
    const result =
      parseEmergencyEvents(
        message
      );

    if (!result.structured) {
      continue;
    }

    structuredMessages += 1;

    if (!result.events.length) {
      ignoredStructuredMessages += 1;
      continue;
    }

    parsed.push(
      ...result.events
    );
  }

  return {
    events: parsed,
    structuredMessages,
    ignoredStructuredMessages
  };
}

function calculateActiveOutages(messages) {
  const parsed =
    parseEmergencyMessages(
      messages
    );

  const events =
    parsed.events
      .slice()
      .sort((a, b) => {
        return (
          a.timestamp -
            b.timestamp ||
          a.addedTimestamp -
            b.addedTimestamp ||
          a.sequence -
            b.sequence
        );
      });

  const active =
    new Map();

  for (const event of events) {
    if (
      event.state === "disabled"
    ) {
      active.set(
        event.assetKey,
        event
      );

      continue;
    }

    if (
      event.state === "enabled"
    ) {
      active.delete(
        event.assetKey
      );
    }
  }

  const outages =
    [...active.values()]
      .sort(
        (a, b) =>
          b.timestamp -
          a.timestamp
      )
      .map(
        ({
          assetKey,
          timestamp,
          addedTimestamp,
          state,
          sequence,
          ...publicData
        }) => publicData
      );

  return {
    outages,
    recognizedStateEvents:
      events.length,
    structuredMessages:
      parsed.structuredMessages,
    ignoredStructuredMessages:
      parsed.ignoredStructuredMessages
  };
}

/* =========================================================
   MAX API
   ========================================================= */

async function requestMessages(
  botToken,
  chatId,
  fromTimestamp,
  toTimestamp
) {
  const url = new URL(
    `${MAX_API_BASE}/messages`
  );

  url.searchParams.set(
    "chat_id",
    String(chatId)
  );

  url.searchParams.set("count", "100");

  // MAX API:
  // from — верхняя граница времени;
  // to   — нижняя граница времени.
  if (fromTimestamp) {
    url.searchParams.set(
      "from",
      String(fromTimestamp)
    );
  }

  if (toTimestamp) {
    url.searchParams.set(
      "to",
      String(toTimestamp)
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

  /*
    Проверяем календарный диапазон по Москве:
    от 00:00 МСК N дней назад и до текущего момента.

    Благодаря этому сегодняшний день всегда явно входит
    в запрос к MAX API.
  */
  const todayStart =
    getMoscowStartOfTodayMs();

  const rangeStart =
    todayStart -
    lookbackDays * DAY_MS;

  const rangeEnd =
    Date.now() + 60 * 1000;

  const all = [];
  const seen = new Set();

  let pageFrom = rangeEnd;
  let historyLimited = false;

  for (
    let page = 0;
    page < maxPages;
    page += 1
  ) {
    const batch = await requestMessages(
      botToken,
      chatId,
      page === 0 ? null : pageFrom,
      rangeStart
    );

    if (!batch.length) break;

    for (const message of batch) {
      const timestamp =
        Number(message?.timestamp || 0);

      if (
        !timestamp ||
        timestamp < rangeStart ||
        timestamp > rangeEnd
      ) {
        continue;
      }

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

    if (oldest <= rangeStart) break;
    if (batch.length < 100) break;

    pageFrom = oldest - 1;

    if (page === maxPages - 1) {
      historyLimited = true;
    }
  }

  const todayMessages =
    all.filter(
      (message) =>
        Number(message?.timestamp || 0) >=
        todayStart
    ).length;

  return {
    messages: all,
    historyLimited,
    todayMessages,
    rangeStart,
    rangeEnd
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

    const access =
      await resolveSessionAccess(
        session
      );

    if (
      !access ||
      !hasPanel(
        access,
        "monitoring"
      )
    ) {
      return json(
        {
          error:
            "У вашей роли нет доступа к аварийному мониторингу"
        },
        403
      );
    }

    /*
      В нештатном режиме обычные пользователи не получают
      оперативные данные. Пользователь с доступом к центру
      управления сохраняет мониторинг для диагностики.
    */
    try {
      const systemState =
        await getSystemState();

      if (
        systemState.mode !== "normal" &&
        !hasPanel(
          access,
          "system-control"
        )
      ) {
        const fallback =
          systemState.mode === "maintenance"
            ? "Система временно переведена в режим технических работ."
            : "Система временно остановлена.";

        return json(
          {
            error:
              systemState.message ||
              fallback,
            code:
              "SYSTEM_UNAVAILABLE",
            system:
              systemState
          },
          503
        );
      }
    } catch (error) {
      console.error(
        "Не удалось проверить режим системы:",
        error
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

      const state =
        calculateActiveOutages(
          history.messages
        );

      return json({
        division: division.name,
        divisionId,
        count: state.outages.length,
        outages: state.outages,
        analyzedMessages:
          history.messages.length,
        todayMessages:
          history.todayMessages,
        structuredEmergencyMessages:
          state.structuredMessages,
        ignoredStructuredMessages:
          state.ignoredStructuredMessages,
        recognizedStateEvents:
          state.recognizedStateEvents,
        historyLimited:
          history.historyLimited,
        checkedFrom:
          new Date(history.rangeStart).toISOString(),
        checkedTo:
          new Date(history.rangeEnd).toISOString(),
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
