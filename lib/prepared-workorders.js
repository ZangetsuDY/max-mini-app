/*
  Готовые архивные периоды из чата НДР. Не добавляются в историю смен:
  один TXT описывает весь период и не содержит ежедневных снимков статусов.
*/
import {
  fetchChatMessages, downloadAttachmentText, findFileAttachment, messageId
} from "./max-attachment-source.js";
import { isPreparedWorkordersMessage } from "./workorders-message.js";
import { parseWorkordersDetailsText } from "./workorders-details-data.js";

const OFFSET = 3 * 60 * 60 * 1000;
const DATE = "\\d{2}\\.\\d{2}\\.\\d{4}(?:[ \\t]+\\d{2}:\\d{2})?";
const RANGE = new RegExp(`(${DATE})\\s*(?:[—–-]|до|по)\\s*(${DATE})`, "iu");
const detailsCache = new Map();
let chatCache = null;
let pending = null;

function clean(value) {
  return String(value || "").replace(/[*_]/g, "").replace(/\r/g, "");
}

function parseDate(value) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, mi] = match.map(Number);
  const date = new Date(Date.UTC(yyyy, mm - 1, dd, hh, mi));
  if (date.getUTCFullYear() !== yyyy || date.getUTCMonth() !== mm - 1 ||
      date.getUTCDate() !== dd || date.getUTCHours() !== hh || date.getUTCMinutes() !== mi) return null;
  return date.getTime() - OFFSET;
}

export function preparedPeriodFromText(value) {
  const header = clean(value).slice(0, 3000).split(/^\s*(?:№\s|■|СВОДКА\s+ПО)/im)[0];
  const match = header.match(RANGE);
  const fromMatch = header.match(new RegExp(`^\\s*С\\s*:\\s*(${DATE})`, "imu"));
  const toMatch = header.match(new RegExp(`^\\s*По\\s*:\\s*(${DATE})`, "imu"));
  const fromText = (match?.[1] || fromMatch?.[1] || "").replace(/\s+/g, " ");
  const toText = (match?.[2] || toMatch?.[1] || "").replace(/\s+/g, " ");
  if (!fromText || !toText) return null;
  const dateOnly = !fromText.includes(":") && !toText.includes(":");
  const from = fromText.includes(":") ? fromText : `${fromText} 00:00`;
  const to = toText.includes(":") ? toText : `${toText} 23:59`;
  const start = parseDate(from);
  const toStart = parseDate(toText.includes(":") ? toText : `${toText} 00:00`);
  const end = toStart === null ? null : toStart + (toText.includes(":") ? 0 : 86400000);
  if (start === null || end === null || end <= start) return null;
  return { start, end, from, to, dateOnly,
    label: dateOnly ? `${fromText} — ${toText} (включительно)` : `${from} — ${to}` };
}

function generatedFromText(value) {
  return clean(value).slice(0, 3000).split(/^\s*№\s/m)[0].match(/(?:Сформировано|Создано):\s*([^\n]+)/i)?.[1]?.trim() || "";
}

function config() {
  const chatId = String(process.env.DISPATCHER_WORKORDERS_CHAT_ID || process.env.WORKORDERS_CHAT_ID || "").trim();
  const configured = Boolean(chatId && process.env.MAX_BOT_TOKEN?.trim());
  return { chatId, configured };
}

async function messages({ refresh = false } = {}) {
  const { chatId, configured } = config();
  if (!configured) return [];
  if (!refresh && chatCache?.chatId === chatId && Date.now() - chatCache.at < 15000) return chatCache.messages;
  if (pending?.chatId === chatId) return pending.promise;
  const promise = fetchChatMessages(chatId).then((items) => {
    const found = items.filter((item) => isPreparedWorkordersMessage(item) && findFileAttachment(item));
    chatCache = { chatId, at: Date.now(), messages: found };
    return found;
  });
  const task = { chatId, promise };
  pending = task;
  try { return await promise; } finally { if (pending === task) pending = null; }
}

export async function listPreparedWorkorders(options = {}) {
  const { configured } = config();
  if (!configured) {
    return { configured: false, items: [], message: "Для загрузки архивов настройте MAX_BOT_TOKEN и DISPATCHER_WORKORDERS_CHAT_ID." };
  }
  const items = await messages(options);
  return {
    configured: true,
    message: items.length ? "" : "В последних 100 сообщениях чата НДР нет TXT-файлов с пометкой «АРХИВНЫЙ ПЕРИОД».",
    items: items.map((message) => {
      const attachment = findFileAttachment(message);
      const text = clean(message.body?.text);
      return {
        id: messageId(message),
        period: preparedPeriodFromText(text)?.label || "",
        generatedAt: generatedFromText(text),
        timestamp: Number(message.timestamp || 0),
        fileName: String(attachment.filename || attachment.payload?.filename || attachment.name || "")
      };
    })
  };
}

export async function loadPreparedWorkorders(id) {
  if (!config().configured) throw new Error("Не настроен чат НДР или токен бота MAX");
  const message = (await messages()).find((item) => messageId(item) === id);
  if (!message) {
    const error = new Error("Архивное сообщение не найдено в последних 100 сообщениях чата. Обновите список архивов.");
    error.status = 404;
    throw error;
  }
  const attachment = findFileAttachment(message);
  const cacheKey = JSON.stringify([config().chatId, id, message.body?.text, attachment]);
  const cached = detailsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.details;

  const { text, fileName } = await downloadAttachmentText(message);
  const details = parseWorkordersDetailsText(text);
  if (!details || (!details.orders.length && details.reportedTotal > 0)) {
    throw new Error("Формат TXT не распознан. Нужен детальный файл НДР СК-11, как для обычной сводки.");
  }
  if (details.calendarDays?.length && details.orders.length < details.reportedTotal) {
    throw new Error(`Не все записи TXT распознаны: ${details.orders.length} из ${details.reportedTotal}. Выгрузка остановлена, чтобы не потерять наряды.`);
  }
  // Период файла главнее даты его формирования и времени отправки в MAX.
  const period = preparedPeriodFromText(text) || preparedPeriodFromText(message.body?.text);
  if (!period) throw new Error("Не найден корректный архивный период. Укажите «Период: ДД.ММ.ГГГГ - ДД.ММ.ГГГГ» или строки «С: ДД.ММ.ГГГГ» и «По: ДД.ММ.ГГГГ». Время можно не указывать.");
  const result = {
    ...details, prepared: true, archivePeriod: period, fileName,
    generatedAt: details.generatedAt || generatedFromText(message.body?.text),
    messageId: id
  };
  detailsCache.set(cacheKey, { at: Date.now(), details: result });
  while (detailsCache.size > 2) detailsCache.delete(detailsCache.keys().next().value);
  return result;
}

// Структура штатной выгрузки Excel. Дни берутся из секций TXT, а не из
// даты сообщения, плана наряда или выдуманных исторических снимков.
export function preparedWorkordersStats(details, { include = () => true } = {}) {
  const period = details.archivePeriod;
  const perDay = Boolean(details.calendarDays?.length);
  const frames = new Map();
  const unique = new Set();
  const weekdays = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const frameFor = (day) => {
    const timestamp = perDay ? parseDate(`${day} 00:00`) : null;
    const startDay = Math.floor((period.start + OFFSET) / 86400000) * 86400000 - OFFSET;
    if (perDay && (timestamp === null || timestamp < startDay || timestamp >= period.end)) {
      throw new Error("Календарный день поиска в TXT не соответствует архивному периоду");
    }
    const key = perDay ? new Date(timestamp + OFFSET).toISOString().slice(0, 10) : "prepared";
    if (!frames.has(key)) frames.set(key, {
      key, date: perDay ? day : period.label,
      weekday: perDay ? weekdays[new Date(timestamp + OFFSET).getUTCDay()] : "",
      orders: new Map()
    });
    return frames.get(key);
  };
  if (perDay) details.calendarDays.forEach(frameFor);
  else frameFor("");
  details.orders.forEach((order, index) => {
    if (!include(order)) return;
    const uid = order.uid || (order.number ? `${order.journal}\u0000${order.number}` : `row:${index}`);
    if (perDay && !order.searchDay) throw new Error("У наряда в архивном TXT не указан календарный день поиска");
    frameFor(order.searchDay).orders.set(uid, order);
    unique.add(uid);
  });
  const options = new Map();
  const periodSeen = new Map();
  const rows = [];
  const buckets = [...frames.values()].sort((a, b) => a.key.localeCompare(b.key)).map((frame) => {
    const counts = {};
    for (const [uid, order] of frame.orders) {
      for (const [kind, value] of [["group", order.groupLabel || "Прочие"], ["status", order.status || "—"]]) {
        const key = `${kind}:${value}`;
        counts[key] = (counts[key] || 0) + 1;
        options.set(key, { key, kind, value });
        if (!periodSeen.has(key)) periodSeen.set(key, new Set());
        periodSeen.get(key).add(uid);
        rows.push({ bucket: frame.key, key, uid, at: details.generatedAt, order });
      }
    }
    return { key: frame.key, date: frame.date, weekday: frame.weekday, shift: "", snapshots: 1,
      firstAt: details.generatedAt, lastAt: details.generatedAt, seen: counts, last: counts };
  });
  const periodTotals = Object.fromEntries([...periodSeen].map(([key, ids]) => [key, ids.size]));
  return {
    prepared: true, start: period.start, end: period.end, split: perDay ? "day" : "period",
    periodLabel: period.label, sourceGeneratedAt: details.generatedAt,
    sourceNote: perDay
      ? "Дни — календарные дни поиска из TXT. Статусы — на момент получения API, а не исторические состояния на эти даты."
      : "Статусы и группы за весь период, как в подготовленном файле.",
    snapshots: 1, total: unique.size,
    options: [...options.values()].map((option) => ({ ...option, count: periodTotals[option.key] }))
      .sort((a, b) => a.kind === b.kind ? b.count - a.count : a.kind === "group" ? -1 : 1),
    buckets, periodTotals, details: rows
  };
}
