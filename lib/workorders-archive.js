/*
  Архив НДР за 32 дня: жизнь каждого наряда по UID и восстановление
  любой полученной сводки.

  Хранится без дублирования:
    ver:{hash}   — состояние наряда (все поля) — один раз на каждое изменение;
    snap:{id}    — сводка: список [uid, hash] (≈16 КБ в сжатом виде);
    uid:{uid}    — события наряда: новая версия / пропал из выгрузки;
    index        — список сохранённых сводок (метаданные).
  Ключи живут 33 дня; ключи нарядов из актуальной сводки продлеваются
  раз в сутки, поэтому долгие наряды не «теряются».
*/
import { createHash } from "node:crypto";
import zlib from "node:zlib";

import {
  storeGet,
  storeGetMany,
  storeSet,
  storeSetMany,
  storeExpireMany,
  storeSweep,
  archiveBackend
} from "./archive-store.js";

import {
  fetchChatMessages,
  downloadAttachmentText,
  findFileAttachment,
  messageId
} from "./max-attachment-source.js";

import {
  parseWorkordersDetailsText
} from "./workorders-details-data.js";

const PREFIX = "lenenergo:max-mini-app:wo-archive";
const INDEX_KEY = `${PREFIX}:index`;
const LATEST_KEY = `${PREFIX}:latest`;
const REFRESH_KEY = `${PREFIX}:refresh`;
const RETENTION_MS = 32 * 24 * 60 * 60 * 1000;
const TTL_SECONDS = 33 * 24 * 60 * 60;
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const HEADER = /СК-11\s*[—–-]\s*НДР/i;

export const LONG_ADMISSION_MINUTES = 40;

const pack = (value) => zlib.gzipSync(Buffer.from(JSON.stringify(value), "utf8")).toString("base64");
const unpack = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(zlib.gunzipSync(Buffer.from(String(value), "base64")).toString("utf8"));
  } catch {
    return null;
  }
};

function parseMsk(value) {
  const match = String(value || "").match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5])) - MSK_OFFSET_MS;
}

function toMillis(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return number < 1e12 ? number * 1000 : number;
}

function orderKey(order) {
  return order.uid || `nouid:${order.number || ""}|${order.journal || ""}|${order.planStart || ""}|${order.object || ""}`;
}

function orderHash(order) {
  return createHash("sha1").update(JSON.stringify(order)).digest("hex").slice(0, 24);
}

async function readIndex() {
  const raw = await storeGet(INDEX_KEY);
  try {
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function readSnapshotMap(id) {
  if (!id) return null;
  const data = unpack(await storeGet(`${PREFIX}:snap:${id}`));
  return data && Array.isArray(data.uids) ? data : null;
}

/* ------------------------------------------------------------------ */
/* Приём сводки                                                         */
/* ------------------------------------------------------------------ */

let queue = Promise.resolve();

export function ingestWorkordersSnapshot(details, meta = {}) {
  // Последовательно, чтобы два запроса не записали одну сводку дважды.
  const run = queue.then(() => ingest(details, meta));
  queue = run.catch(() => {});
  return run;
}

async function ingest(details, meta) {
  const id = String(meta.id || details?.messageId || "");
  if (!id || !Array.isArray(details?.orders)) return { skipped: "no-data" };

  const index = await readIndex();
  if (index.some((item) => item.id === id)) return { skipped: "exists" };

  const ts = toMillis(meta.ts || details.messageTimestamp) || parseMsk(details.generatedAt) || Date.now();
  const latest = index[index.length - 1];
  if (latest && ts < latest.ts) return { skipped: "older" };
  if (Date.now() - ts > RETENTION_MS) return { skipped: "expired" };

  const prev = await readSnapshotMap(await storeGet(LATEST_KEY));
  const prevMap = new Map((prev?.uids || []).map(([uid, hash]) => [uid, hash]));

  const current = details.orders.map((order) => {
    const uid = orderKey(order);
    const state = { ...order, uid: order.uid || "" };
    return { uid, hash: orderHash(state), state };
  });
  const currentUids = new Set(current.map((item) => item.uid));

  const changed = current.filter((item) => prevMap.get(item.uid) !== item.hash);
  const gone = [...prevMap.keys()].filter((uid) => !currentUids.has(uid));

  // Состояния нарядов (только изменившиеся).
  await storeSetMany(
    changed.map((item) => [`${PREFIX}:ver:${item.hash}`, pack(item.state)]),
    TTL_SECONDS
  );

  // События по UID.
  const touched = [...changed.map((item) => item.uid), ...gone];
  const records = await storeGetMany(touched.map((uid) => `${PREFIX}:uid:${uid}`));
  const recordMap = new Map(touched.map((uid, position) => {
    let record = null;
    try { record = records[position] ? JSON.parse(records[position]) : null; } catch { record = null; }
    return [uid, record || { uid, events: [] }];
  }));

  for (const item of changed) {
    const record = recordMap.get(item.uid);
    record.number = item.state.number || record.number || "";
    record.events.push({ ts, sid: id, type: "version", hash: item.hash });
  }
  for (const uid of gone) {
    recordMap.get(uid).events.push({ ts, sid: id, type: "gone" });
  }
  for (const record of recordMap.values()) {
    record.events = record.events.filter((event) => ts - event.ts <= RETENTION_MS);
  }

  await storeSetMany(
    [...recordMap.entries()].map(([uid, record]) => [`${PREFIX}:uid:${uid}`, JSON.stringify(record)]),
    TTL_SECONDS
  );

  // Сводка и индекс.
  const counts = { total: current.length, started: 0, checked: 0, notChecked: 0, notAdmitted: 0, other: 0 };
  for (const item of current) counts[item.state.group] = (counts[item.state.group] || 0) + 1;

  await storeSet(`${PREFIX}:snap:${id}`, pack({ id, ts, uids: current.map((item) => [item.uid, item.hash]) }), TTL_SECONDS);

  const entry = {
    id,
    ts,
    generatedAt: details.generatedAt || "",
    shift: details.shift || "",
    period: details.period || "",
    fileName: details.fileName || meta.fileName || "",
    ...counts,
    changed: changed.length,
    gone: gone.length,
    ingestedAt: new Date().toISOString()
  };
  const nextIndex = [...index, entry]
    .filter((item) => Date.now() - item.ts <= RETENTION_MS)
    .sort((a, b) => a.ts - b.ts);
  await storeSet(INDEX_KEY, JSON.stringify(nextIndex), TTL_SECONDS);
  await storeSet(LATEST_KEY, id, TTL_SECONDS);

  await refreshDaily(current);
  return { stored: id, changed: changed.length, gone: gone.length, total: current.length };
}

// Раз в сутки продлеваем срок жизни ключей нарядов, которые ещё в выгрузке.
async function refreshDaily(current) {
  const today = new Date(Date.now() + MSK_OFFSET_MS).toISOString().slice(0, 10);
  if ((await storeGet(REFRESH_KEY)) === today) return;
  await storeExpireMany([
    ...current.map((item) => `${PREFIX}:ver:${item.hash}`),
    ...current.map((item) => `${PREFIX}:uid:${item.uid}`)
  ], TTL_SECONDS);
  await storeSet(REFRESH_KEY, today, 2 * 24 * 60 * 60);
  await storeSweep();
}

/* ------------------------------------------------------------------ */
/* Сбор из чата (фон)                                                   */
/* ------------------------------------------------------------------ */

function chatId() {
  return String(process.env.DISPATCHER_WORKORDERS_CHAT_ID || process.env.WORKORDERS_CHAT_ID || "").trim();
}

let collecting = null;
let lastCollectAt = 0;

/*
  Забирает из последних 100 сообщений чата все файлы НДР, которых ещё
  нет в архиве (от старых к новым). Ограничено maxPerRun файлами за проход.
*/
export function archiveWorkordersFromChat({ maxPerRun = 6 } = {}) {
  if (collecting) return collecting;
  collecting = (async () => {
    lastCollectAt = Date.now();
    const id = chatId();
    if (!id || !String(process.env.MAX_BOT_TOKEN || "").trim()) return { skipped: "not-configured" };

    const [messages, index] = await Promise.all([fetchChatMessages(id), readIndex()]);
    const known = new Set(index.map((item) => item.id));
    const latestTs = index.length ? index[index.length - 1].ts : 0;

    const candidates = messages
      .filter((message) => HEADER.test(String(message?.body?.text || "")) && findFileAttachment(message))
      .map((message) => ({ message, id: messageId(message), ts: toMillis(message?.timestamp) }))
      .filter((item) => item.id && !known.has(item.id) && item.ts >= latestTs && Date.now() - item.ts <= RETENTION_MS)
      .sort((a, b) => a.ts - b.ts)
      .slice(-maxPerRun);

    const results = [];
    for (const item of candidates) {
      try {
        const { text, fileName } = await downloadAttachmentText(item.message);
        const parsed = parseWorkordersDetailsText(text);
        if (!parsed) {
          results.push({ id: item.id, error: "parse" });
          continue;
        }
        results.push(await ingestWorkordersSnapshot(
          { ...parsed, messageId: item.id, messageTimestamp: item.ts, fileName },
          { id: item.id, ts: item.ts, fileName }
        ));
      } catch (error) {
        results.push({ id: item.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { processed: results.length, results };
  })().finally(() => {
    collecting = null;
  });
  return collecting;
}

// Неблокирующий запуск не чаще раза в 2 минуты (для запросов пользователей).
export function archiveInBackground() {
  if (collecting || Date.now() - lastCollectAt < 2 * 60 * 1000) return;
  archiveWorkordersFromChat().catch((error) => console.error("Архив НДР:", error));
}

/* ------------------------------------------------------------------ */
/* Чтение                                                               */
/* ------------------------------------------------------------------ */

export async function listWorkorderSnapshots() {
  const index = await readIndex();
  return index
    .filter((item) => Date.now() - item.ts <= RETENTION_MS)
    .sort((a, b) => b.ts - a.ts);
}

export async function loadWorkorderSnapshot(id) {
  const index = await readIndex();
  const meta = index.find((item) => item.id === id);
  const snapshot = await readSnapshotMap(id);
  if (!meta || !snapshot) return null;

  const hashes = [...new Set(snapshot.uids.map(([, hash]) => hash))];
  const values = await storeGetMany(hashes.map((hash) => `${PREFIX}:ver:${hash}`));
  const states = new Map(hashes.map((hash, position) => [hash, unpack(values[position])]));

  const orders = snapshot.uids
    .map(([uid, hash]) => {
      const state = states.get(hash);
      return state ? { ...state, uid: state.uid || uid, archiveKey: uid } : null;
    })
    .filter(Boolean);

  return {
    snapshotId: id,
    shift: meta.shift,
    period: meta.period,
    generatedAt: meta.generatedAt,
    fileName: meta.fileName,
    reportedTotal: meta.total,
    missing: snapshot.uids.length - orders.length,
    orders
  };
}

const HISTORY_FIELDS = [
  ["status", "Статус"],
  ["groupLabel", "Группа"],
  ["checkedAt", "Проверка р.м."],
  ["admittedAt", "Допуск"],
  ["actualStartAt", "Факт. начало"],
  ["admissionMinutes", "Допуск → начало, мин"],
  ["stageSince", "Текущий этап с"],
  ["stageBy", "Этап — кто"],
  ["planStart", "План начало"],
  ["planEnd", "План конец"],
  ["result", "Результат"],
  ["producer", "Производитель работ"],
  ["responsible", "Отв. руководитель"],
  ["brigade", "Бригада"],
  ["preparation", "Подготовка р.м."],
  ["otherDates", "Прочие даты"],
  ["works", "Работы"],
  ["object", "Объект"],
  ["places", "Места"],
  ["journal", "Журнал"],
  ["notes", "Доп. указания"]
];

function fieldText(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

export async function getWorkorderHistory(uid) {
  const raw = await storeGet(`${PREFIX}:uid:${uid}`);
  let record = null;
  try { record = raw ? JSON.parse(raw) : null; } catch { record = null; }
  if (!record?.events?.length) return null;

  const index = await readIndex();
  const snapshotMeta = new Map(index.map((item) => [item.id, item]));
  const hashes = [...new Set(record.events.filter((event) => event.hash).map((event) => event.hash))];
  const values = await storeGetMany(hashes.map((hash) => `${PREFIX}:ver:${hash}`));
  const states = new Map(hashes.map((hash, position) => [hash, unpack(values[position])]));

  let previous = null;
  const events = record.events
    .sort((a, b) => a.ts - b.ts)
    .map((event) => {
      const meta = snapshotMeta.get(event.sid);
      const base = { ts: event.ts, type: event.type, generatedAt: meta?.generatedAt || "", snapshotId: event.sid };
      if (event.type === "gone") {
        previous = null;
        return base;
      }
      const state = states.get(event.hash) || null;
      const isFirst = previous === null;
      const changes = previous && state
        ? HISTORY_FIELDS
          .filter(([key]) => fieldText(previous[key]) !== fieldText(state[key]))
          .map(([key, label]) => ({ field: key, label, from: fieldText(previous[key]), to: fieldText(state[key]) }))
        : [];
      previous = state || previous;
      return {
        ...base,
        first: isFirst,
        state,
        changes,
        longAdmission: Number(state?.admissionMinutes) > LONG_ADMISSION_MINUTES
      };
    });

  const latest = index[index.length - 1];
  const lastEvent = events[events.length - 1];
  return {
    uid: record.uid,
    number: record.number || "",
    events,
    inLatestSnapshot: Boolean(latest && lastEvent?.type !== "gone"),
    latestSnapshot: latest ? { id: latest.id, generatedAt: latest.generatedAt } : null
  };
}

export function archiveInfo() {
  return { backend: archiveBackend(), retentionDays: 32, longAdmissionMinutes: LONG_ADMISSION_MINUTES };
}
