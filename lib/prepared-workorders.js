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
const DATE = "\\d{2}\\.\\d{2}\\.\\d{4}\\s+\\d{2}:\\d{2}";
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
  if (!match) return null;
  const from = match[1].replace(/\s+/g, " ");
  const to = match[2].replace(/\s+/g, " ");
  const start = parseDate(from);
  const end = parseDate(to);
  if (start === null || end === null || end <= start) return null;
  return { start, end, from, to, label: `${from} — ${to}` };
}

function generatedFromText(value) {
  return clean(value).match(/Сформировано:\s*([^\n]+)/i)?.[1]?.trim() || "";
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
  // Период файла главнее даты его формирования и времени отправки в MAX.
  const period = preparedPeriodFromText(text) || preparedPeriodFromText(message.body?.text);
  if (!period) throw new Error("Не найден корректный архивный период. Укажите начало и конец в формате ДД.ММ.ГГГГ ЧЧ:ММ — ДД.ММ.ГГГГ ЧЧ:ММ в заголовке TXT или сообщения.");
  const result = {
    ...details, prepared: true, archivePeriod: period, fileName,
    generatedAt: details.generatedAt || generatedFromText(message.body?.text),
    messageId: id
  };
  detailsCache.set(cacheKey, { at: Date.now(), details: result });
  while (detailsCache.size > 2) detailsCache.delete(detailsCache.keys().next().value);
  return result;
}

// Общая структура данных для штатного генератора Excel НДР. Единственный
// срез — весь подготовленный период, без выдуманных ежедневных изменений.
export function preparedWorkordersStats(details) {
  const period = details.archivePeriod;
  const unique = new Map();
  details.orders.forEach((order, index) => {
    const uid = order.uid || (order.number ? `${order.journal}\u0000${order.number}` : `row:${index}`);
    unique.set(uid, order);
  });
  const options = new Map();
  const counts = {};
  const rows = [];
  for (const [uid, order] of unique) {
    for (const [kind, value] of [["group", order.groupLabel || "Прочие"], ["status", order.status || "—"]]) {
      const key = `${kind}:${value}`;
      counts[key] = (counts[key] || 0) + 1;
      options.set(key, { key, kind, value });
      rows.push({ bucket: "prepared", key, uid, at: details.generatedAt, order });
    }
  }
  return {
    prepared: true, start: period.start, end: period.end, split: "period",
    periodLabel: period.label, sourceGeneratedAt: details.generatedAt,
    snapshots: 1, total: unique.size,
    options: [...options.values()].map((option) => ({ ...option, count: counts[option.key] }))
      .sort((a, b) => a.kind === b.kind ? b.count - a.count : a.kind === "group" ? -1 : 1),
    buckets: [{ key: "prepared", date: period.label, weekday: "", shift: "", snapshots: 1,
      firstAt: details.generatedAt, lastAt: details.generatedAt, seen: counts, last: counts }],
    periodTotals: counts, details: rows
  };
}
