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
const LATEST_MAP_KEY = `${PREFIX}:latest-map`;
const MAX_DIFF_DEPTH = 48;
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

/*
  Сводка хранится либо целиком («ключевой кадр», раз в сутки и через
  каждые MAX_DIFF_DEPTH сводок), либо как разница с предыдущей.
  Восстановление: от ключевого кадра применяем изменения по цепочке.
*/
async function readSnapshotMap(id) {
  if (!id) return null;
  const chain = [];
  let currentId = id;
  for (let step = 0; currentId && step <= MAX_DIFF_DEPTH + 2; step += 1) {
    const data = unpack(await storeGet(`${PREFIX}:snap:${currentId}`));
    if (!data) return null;
    chain.push(data);
    if (data.kind !== "diff") break;
    currentId = data.base;
  }

  const full = chain.pop();
  if (!full || !Array.isArray(full.uids)) return null;
  const map = new Map(full.uids);
  for (const diff of chain.reverse()) {
    for (const uid of diff.removed || []) map.delete(uid);
    for (const [uid, hash] of diff.set || []) map.set(uid, hash);
  }
  const head = chain.length ? chain[chain.length - 1] : full;
  return { id, ts: head.ts, uids: [...map.entries()] };
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

  const latestId = await storeGet(LATEST_KEY);
  const latestMap = unpack(await storeGet(LATEST_MAP_KEY));
  const prev = latestMap?.id === latestId && Array.isArray(latestMap?.uids)
    ? latestMap
    : await readSnapshotMap(latestId);
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

  const uidsList = current.map((item) => [item.uid, item.hash]);
  const mskDay = (value) => new Date(value + MSK_OFFSET_MS).toISOString().slice(0, 10);
  const depth = (latestMap?.depth ?? 0) + 1;
  const keyframe = !prev || !latest || mskDay(latest.ts) !== mskDay(ts) || depth > MAX_DIFF_DEPTH;
  const snapRecord = keyframe
    ? { id, ts, kind: "full", uids: uidsList }
    : {
        id,
        ts,
        kind: "diff",
        base: latestId,
        set: changed.map((item) => [item.uid, item.hash]),
        removed: gone
      };
  await storeSet(`${PREFIX}:snap:${id}`, pack(snapRecord), TTL_SECONDS);
  await storeSet(LATEST_MAP_KEY, pack({ id, ts, depth: keyframe ? 0 : depth, uids: uidsList }), TTL_SECONDS);

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

/* ------------------------------------------------------------------ */
/* Проход по сводкам периода                                            */
/* ------------------------------------------------------------------ */

export const MAX_PERIOD_DAYS = 32;
const periodCache = new Map();

function mskDayStart(day) {
  const match = String(day || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])) - MSK_OFFSET_MS;
}

function formatMskShort(ts) {
  const date = new Date(ts + MSK_OFFSET_MS);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

// «ДД.ММ.ГГГГ» или «ДД.ММ.ГГГГ ЧЧ:ММ» (МСК) → мс.
export function parseMskDateTime(value) {
  const text = String(value || "").trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return mskDayStart(text);
  return parseMsk(text);
}

// Только нужные поля наряда — чтобы длинный период не занимал память.
function orderBrief(state, uid) {
  return {
    uid: state.uid || uid || "",
    number: state.number || "",
    journal: state.journal || "",
    object: state.object || "",
    works: state.works || "",
    organization: state.organization || "",
    planStart: state.planStart || "",
    planEnd: state.planEnd || "",
    status: state.status || "",
    group: state.group || "other",
    groupLabel: state.groupLabel || ""
  };
}

/*
  Последовательно восстанавливает сводки из [start, end) (и, если
  withBaseline, последнюю сводку не раньше чем за 2 часа до start).
  Разницы применяются по цепочке, поэтому период из сотен сводок
  читается без повторного восстановления каждой.
  onFrame(meta, orders: Map<uid, brief>) — наряды области в сводке.
*/
async function walkSnapshots({ start, end, include, withBaseline = false, onFrame }) {
  const index = (await readIndex()).sort((a, b) => a.ts - b.ts);
  const inRange = index.filter((item) => item.ts >= start && item.ts < end);
  const before = withBaseline
    ? index.filter((item) => item.ts < start && item.ts >= start - 2 * 60 * 60 * 1000).pop()
    : null;
  const chain = [...(before ? [before] : []), ...inRange];

  const briefs = new Map();
  let current = null;
  let currentId = "";
  let walked = 0;

  for (const meta of chain) {
    const raw = unpack(await storeGet(`${PREFIX}:snap:${meta.id}`));
    if (raw?.kind === "diff" && current && raw.base === currentId) {
      for (const uid of raw.removed || []) current.delete(uid);
      for (const [uid, hash] of raw.set || []) current.set(uid, hash);
    } else {
      const full = await readSnapshotMap(meta.id);
      if (!full) continue;
      current = new Map(full.uids);
    }
    currentId = meta.id;

    const missing = [...new Set([...current.values()].filter((hash) => !briefs.has(hash)))];
    for (let offset = 0; offset < missing.length; offset += 500) {
      const part = missing.slice(offset, offset + 500);
      const values = await storeGetMany(part.map((hash) => `${PREFIX}:ver:${hash}`));
      part.forEach((hash, position) => {
        const state = unpack(values[position]);
        briefs.set(hash, state ? orderBrief(state) : null);
      });
    }

    const orders = new Map();
    for (const [uid, hash] of current) {
      const brief = briefs.get(hash);
      if (brief && include(brief)) orders.set(uid, brief.uid ? brief : { ...brief, uid });
    }
    walked += 1;
    await onFrame(meta, orders, { isBaseline: meta === before });
    // Отдаём цикл событий — сервер не замирает на длинном периоде.
    if (walked % 20 === 0) await new Promise((resolve) => setImmediate(resolve));
  }
  return { snapshots: walked, baseline: before || null, first: chain[0] || null, last: chain[chain.length - 1] || null };
}

function checkPeriod(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Укажите начало и конец периода");
  if (end <= start) throw new Error("Конец периода должен быть позже начала");
  if (end - start > MAX_PERIOD_DAYS * 24 * 60 * 60 * 1000) {
    throw new Error(`Период не может быть длиннее ${MAX_PERIOD_DAYS} суток — столько хранит архив`);
  }
}

function cacheGet(key) {
  const entry = periodCache.get(key);
  if (!entry || Date.now() - entry.at > 10 * 60 * 1000) return null;
  return entry.value;
}

function cacheSet(key, value) {
  periodCache.set(key, { at: Date.now(), value });
  if (periodCache.size > 40) periodCache.delete(periodCache.keys().next().value);
}

/* ------------------------------------------------------------------ */
/* Отчёт за смену / произвольный период                                 */
/* ------------------------------------------------------------------ */

/*
  Что происходило с нарядами за период: состояние на начало (последняя
  сводка до начала, не раньше чем за 2 часа, иначе первая в периоде)
  и на конец, появившиеся, ушедшие из сводки, переходы статусов.
*/
export async function getWorkorderPeriodReport({ start, end, include = () => true, scopeKey = "", label = "" }) {
  checkPeriod(start, end);
  const base = {
    label,
    start,
    end,
    periodLabel: `${formatMskShort(start)} — ${formatMskShort(end)}`,
    complete: Date.now() >= end
  };

  const index = await readIndex();
  const lastId = index.length ? index[index.length - 1].id : "";
  const cacheKey = `report|${start}|${end}|${scopeKey}|${lastId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let first = null;
  let prev = null;
  let last = null;
  const transitions = new Map();
  const changed = new Map();
  const appeared = new Map();
  const gone = new Map();

  const walk = await walkSnapshots({
    start,
    end,
    include,
    withBaseline: true,
    onFrame: (meta, orders) => {
      if (!first) {
        first = orders;
        prev = orders;
        last = orders;
        return;
      }
      const at = meta.generatedAt || formatMskShort(meta.ts);
      for (const [uid, order] of orders) {
        const old = prev.get(uid);
        if (!old) {
          if (!first.has(uid)) appeared.set(uid, { ...order, at });
          gone.delete(uid);
          continue;
        }
        if (old.status !== order.status) {
          const key = `${old.status || "—"}→${order.status || "—"}`;
          transitions.set(key, (transitions.get(key) || 0) + 1);
          const entry = changed.get(uid) || { ...order, path: [{ status: old.status || "—", at: "" }] };
          entry.path.push({ status: order.status || "—", at });
          Object.assign(entry, { status: order.status, group: order.group, groupLabel: order.groupLabel });
          changed.set(uid, entry);
        }
      }
      for (const [uid, order] of prev) {
        if (!orders.has(uid)) gone.set(uid, { ...order, at });
      }
      prev = orders;
      last = orders;
    }
  });

  const result = {
    ...base,
    snapshots: walk.snapshots,
    baseline: walk.first ? { id: walk.first.id, generatedAt: walk.first.generatedAt, beforeShift: Boolean(walk.baseline) } : null,
    final: walk.last ? { id: walk.last.id, generatedAt: walk.last.generatedAt } : null
  };
  if (!first) return { ...result, empty: true };

  for (const uid of gone.keys()) if (last.has(uid)) gone.delete(uid);
  const tally = (orders) => {
    const groups = {};
    for (const order of orders.values()) groups[order.group || "other"] = (groups[order.group || "other"] || 0) + 1;
    return { total: orders.size, groups };
  };

  const report = {
    ...result,
    empty: false,
    start: tally(first),
    end: tally(last),
    appearedCount: appeared.size,
    goneCount: gone.size,
    changedCount: changed.size,
    startedDuringShift: [...changed.values()].filter((item) =>
      item.group === "started" && first.get(item.uid)?.group !== "started"
    ).length,
    transitions: [...transitions.entries()]
      .map(([key, count]) => {
        const [from, to] = key.split("→");
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count),
    changed: [...changed.values()].slice(0, 400),
    appeared: [...appeared.values()].slice(0, 400),
    gone: [...gone.values()].slice(0, 400)
  };
  cacheSet(cacheKey, report);
  return report;
}

// Дневная 08:00–20:00 или ночная 20:00–08:00 следующих суток (МСК).
export async function getWorkorderShiftReport({ day, shift = "day", include, scopeKey = "" }) {
  const dayStart = mskDayStart(day);
  if (dayStart === null) throw new Error("Укажите дату в формате ДД.ММ.ГГГГ");
  const isNight = shift === "night";
  const start = dayStart + (isNight ? 20 : 8) * 60 * 60 * 1000;
  const report = await getWorkorderPeriodReport({
    start,
    end: start + 12 * 60 * 60 * 1000,
    include,
    scopeKey,
    label: isNight ? "Ночная смена" : "Дневная смена"
  });
  return { ...report, day, shift: isNight ? "night" : "day", shiftLabel: report.label };
}

/* ------------------------------------------------------------------ */
/* Выгрузка по дням / сменам                                            */
/* ------------------------------------------------------------------ */

const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

// Срез (день или смена), к которому относится момент сводки.
function bucketOf(ts, split) {
  const msk = new Date(ts + MSK_OFFSET_MS);
  const hour = msk.getUTCHours();
  const pad = (value) => String(value).padStart(2, "0");
  const dateOf = (date) => `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
  if (split !== "shift") {
    return { key: msk.toISOString().slice(0, 10), date: dateOf(msk), weekday: WEEKDAYS_SHORT[msk.getUTCDay()], shift: "" };
  }
  // Ночная смена 20:00–08:00 относится к дате её начала.
  const shiftDay = hour < 8 ? new Date(msk.getTime() - 24 * 60 * 60 * 1000) : msk;
  const night = hour < 8 || hour >= 20;
  return {
    key: `${shiftDay.toISOString().slice(0, 10)}-${night ? "2" : "1"}`,
    date: dateOf(shiftDay),
    weekday: WEEKDAYS_SHORT[shiftDay.getUTCDay()],
    shift: night ? "Ночная 20–08" : "Дневная 08–20"
  };
}

const statusKey = (kind, value) => `${kind}:${value}`;

/*
  Данные для Excel: по каждому дню (или смене) сколько разных нарядов
  было в каждом статусе / группе, и сколько осталось в последней сводке
  среза. Вариантов статусов — сколько встретилось в периоде.
*/
export async function getWorkorderPeriodStats({ start, end, split = "day", include = () => true, scopeKey = "" }) {
  checkPeriod(start, end);
  const index = await readIndex();
  const lastId = index.length ? index[index.length - 1].id : "";
  const cacheKey = `stats|${start}|${end}|${split}|${scopeKey}|${lastId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const buckets = new Map();
  const periodSeen = new Map();
  const options = new Map();
  const details = new Map();

  const walk = await walkSnapshots({
    start,
    end,
    include,
    onFrame: (meta, orders) => {
      const info = bucketOf(meta.ts, split);
      let bucket = buckets.get(info.key);
      if (!bucket) {
        bucket = { ...info, snapshots: 0, seen: new Map(), last: {}, lastAt: "", firstAt: meta.generatedAt || formatMskShort(meta.ts) };
        buckets.set(info.key, bucket);
      }
      bucket.snapshots += 1;
      bucket.lastAt = meta.generatedAt || formatMskShort(meta.ts);
      const at = meta.generatedAt || formatMskShort(meta.ts);
      const lastCounts = {};

      for (const [uid, order] of orders) {
        const keys = [
          ["group", order.groupLabel || "Прочие"],
          ["status", order.status || "—"]
        ];
        for (const [kind, value] of keys) {
          const key = statusKey(kind, value);
          options.set(key, { kind, value });
          lastCounts[key] = (lastCounts[key] || 0) + 1;

          if (!bucket.seen.has(key)) bucket.seen.set(key, new Set());
          bucket.seen.get(key).add(uid);
          if (!periodSeen.has(key)) periodSeen.set(key, new Set());
          periodSeen.get(key).add(uid);

          const detailKey = `${info.key}|${key}|${uid}`;
          if (!details.has(detailKey)) {
            details.set(detailKey, { bucket: info.key, key, uid, at, order });
          }
        }
      }
      bucket.last = lastCounts;
    }
  });

  const result = {
    start,
    end,
    split,
    periodLabel: `${formatMskShort(start)} — ${formatMskShort(end)}`,
    snapshots: walk.snapshots,
    options: [...options.entries()]
      .map(([key, option]) => ({ key, ...option, count: periodSeen.get(key)?.size || 0 }))
      .sort((a, b) => (a.kind === b.kind ? b.count - a.count : a.kind === "group" ? -1 : 1)),
    buckets: [...buckets.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((bucket) => ({
        key: bucket.key,
        date: bucket.date,
        weekday: bucket.weekday,
        shift: bucket.shift,
        snapshots: bucket.snapshots,
        firstAt: bucket.firstAt,
        lastAt: bucket.lastAt,
        seen: Object.fromEntries([...bucket.seen.entries()].map(([key, set]) => [key, set.size])),
        last: bucket.last
      })),
    periodTotals: Object.fromEntries([...periodSeen.entries()].map(([key, set]) => [key, set.size])),
    details: [...details.values()]
  };
  cacheSet(cacheKey, result);
  return result;
}
