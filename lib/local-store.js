/*
  Собственное хранилище вместо Redis (для Timeweb и любого сервера
  без внешней БД). Повторяет нужные приложению команды Redis:
  GET, SET (EX / PX / NX / XX), DEL, MGET, EXPIRE, TTL, EXISTS,
  ZADD, ZREM, ZRANGEBYSCORE, ZREMRANGEBYSCORE.

  Данные — в памяти процесса; на диск пишутся одним файлом
  ${DATA_DIR}/store.json.gz (по умолчанию ./data) через секунды после
  изменения и при остановке сервера. Если настроен S3 (см. s3-backup.js),
  файл дополнительно копируется в S3 каждые 10 минут и при остановке,
  а при запуске без локального файла — восстанавливается из S3.
  Так данные переживают новые деплои на Timeweb Cloud Apps.
*/
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  isS3BackupConfigured,
  s3BackupKey,
  s3PutObject,
  s3GetObject
} from "./s3-backup.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S3_INTERVAL_MS = Number(process.env.S3_BACKUP_INTERVAL_MIN || 10) * 60 * 1000;
const ARCHIVE_S3_INTERVAL_MS = Number(process.env.ARCHIVE_S3_BACKUP_INTERVAL_MIN || 30) * 60 * 1000;
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

/*
  Данные разделены на две части:
    main    — настройки, сессии, кэши (маленький файл store.json.gz):
              грузится при старте, пишется через 3 с после изменения;
    archive — архив НДР за 32 дня (большой файл archive.json.gz):
              грузится в фоне после запуска сервера, пишется раз в минуту,
              в S3 — раз в 30 минут и при остановке.
  Так перезапуск быстрый, а памяти и процессора уходит намного меньше.
*/
const ARCHIVE_KEY = /:wo-archive:/;

function createShard(name, fileName, writeDelayMs) {
  return {
    name,
    fileName,
    writeDelayMs,
    strings: new Map(), // key -> { v, exp }
    zsets: new Map(),   // key -> { members: Map(member -> score), exp }
    loaded: false,
    loading: null,
    dirty: false,
    writeTimer: null,
    writing: Promise.resolve(),
    s3Dirty: false,
    lastS3Upload: 0,
    restoredFrom: ""
  };
}

const main = createShard("main", "store.json.gz", 3000);
const archive = createShard("archive", "archive.json.gz", 60_000);
const shards = [main, archive];

const shardFor = (key) => (ARCHIVE_KEY.test(String(key)) ? archive : main);

let lastS3Error = "";
// Архив только что выделен из общего файла: пока его копии нет в S3,
// основную часть (уже без архива) туда не отправляем.
let archiveSplitPending = false;

/*
  Папка для файла хранилища. На Timeweb Cloud Apps папка приложения
  (/app) только для чтения, поэтому пробуем по порядку:
  DATA_DIR → ./data → ~/.max-mini-app-data → /tmp/max-mini-app-data
  и берём первую, куда реально можно записать.
*/
let resolvedDataDir = "";

function dataDirCandidates() {
  return [
    process.env.DATA_DIR ? path.resolve(ROOT, process.env.DATA_DIR) : "",
    path.join(ROOT, "data"),
    path.join(os.homedir() || os.tmpdir(), ".max-mini-app-data"),
    path.join(os.tmpdir(), "max-mini-app-data")
  ].filter((item, index, list) => item && list.indexOf(item) === index);
}

async function resolveDataDir() {
  if (resolvedDataDir) return resolvedDataDir;
  for (const candidate of dataDirCandidates()) {
    try {
      await fs.mkdir(candidate, { recursive: true });
      const probe = path.join(candidate, `.write-test-${process.pid}`);
      await fs.writeFile(probe, "ok");
      await fs.unlink(probe);
      resolvedDataDir = candidate;
      return candidate;
    } catch (error) {
      console.log(`Локальное хранилище: папка ${candidate} недоступна для записи (${error?.code || error})`);
    }
  }
  throw new Error("Нет папки, доступной для записи. Укажите DATA_DIR.");
}

function dataDir() {
  return resolvedDataDir || dataDirCandidates()[0];
}

function filePath(shard = main) {
  return path.join(dataDir(), shard.fileName);
}

/* ---------------- сериализация ---------------- */

async function serialize(shard) {
  const now = Date.now();
  const data = { version: 1, part: shard.name, savedAt: new Date().toISOString(), strings: [], zsets: [] };
  for (const [key, entry] of shard.strings) {
    if (entry.exp && entry.exp <= now) continue;
    data.strings.push([key, entry.v, entry.exp || 0]);
  }
  for (const [key, entry] of shard.zsets) {
    if (entry.exp && entry.exp <= now) continue;
    data.zsets.push([key, [...entry.members.entries()], entry.exp || 0]);
  }
  return gzipAsync(Buffer.from(JSON.stringify(data), "utf8"), { level: 1 });
}

/*
  Разбор файла. Старый общий файл (до разделения) содержит и архив:
  его ключи раскладываются по своим частям, обе части помечаются
  для записи — дальше они хранятся раздельно.
*/
async function restore(shard, buffer) {
  const data = JSON.parse((await gunzipAsync(buffer)).toString("utf8"));
  const now = Date.now();
  let moved = 0;
  shard.strings.clear();
  shard.zsets.clear();
  for (const [key, value, exp] of data.strings || []) {
    if (exp && exp <= now) continue;
    const target = shardFor(key);
    if (target !== shard) moved += 1;
    target.strings.set(key, { v: value, exp: exp || 0 });
  }
  for (const [key, members, exp] of data.zsets || []) {
    if (exp && exp <= now) continue;
    const target = shardFor(key);
    if (target !== shard) moved += 1;
    target.zsets.set(key, { members: new Map(members), exp: exp || 0 });
  }
  if (moved && shard === main) {
    // Архив пришёл из старого общего файла — отдельно его грузить не нужно.
    archive.loaded = true;
    archive.loading = Promise.resolve();
    archive.restoredFrom = "общий файл (перенос)";
    archiveSplitPending = true;
    markDirty(archive);
    markDirty(main);
    console.log(`Хранилище: архив НДР (${moved} ключей) выделен в отдельный файл`);
  }
  return data.savedAt || "";
}

const keyCount = (shard) => shard.strings.size + shard.zsets.size;

/* ---------------- загрузка / запись ---------------- */

async function loadShard(shard) {
  try {
    await resolveDataDir().catch((error) => console.error("Локальное хранилище:", error.message));
    const buffer = await fs.readFile(filePath(shard));
    const savedAt = await restore(shard, buffer);
    if (!shard.restoredFrom) shard.restoredFrom = `disk ${savedAt}`;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error(`Локальное хранилище (${shard.fileName}): не удалось прочитать файл:`, error);
    }
    // Нет локального файла (например, после нового деплоя) — берём из S3.
    if (isS3BackupConfigured()) {
      try {
        const buffer = await s3GetObject(s3BackupKey(shard.fileName));
        console.log(buffer
          ? `S3: найдена копия ${shard.fileName} (${Math.round(buffer.length / 1024)} КБ) — восстанавливаем`
          : `S3: копии ${shard.fileName} пока нет`);
        if (buffer) {
          const savedAt = await restore(shard, buffer);
          shard.restoredFrom = `s3 ${savedAt}`;
          markDirty(shard, { s3: false });
        }
      } catch (s3Error) {
        lastS3Error = s3Error instanceof Error ? s3Error.message : String(s3Error);
        console.error(`Локальное хранилище: восстановление ${shard.fileName} из S3 не удалось:`, lastS3Error);
      }
    }
  }
  shard.loaded = true;
  console.log(`Локальное хранилище (${shard.name === "main" ? "основное" : "архив НДР"}): ключей ${keyCount(shard)}${shard.restoredFrom ? `, восстановлено из ${shard.restoredFrom}` : ""}`);
}

function ensureShardLoaded(shard) {
  if (shard.loaded) return Promise.resolve();
  if (!shard.loading) {
    // Архив грузится только после основной части (она может его уже содержать).
    shard.loading = (shard === archive ? ensureShardLoaded(main) : Promise.resolve())
      .then(() => (shard.loaded ? undefined : loadShard(shard)));
  }
  return shard.loading;
}

export function ensureLocalStoreLoaded() {
  return ensureShardLoaded(main);
}

export function ensureArchiveStoreLoaded() {
  return ensureShardLoaded(archive);
}

/*
  Служебные данные, которые не жалко потерять за последние минуты перед
  деплоем: кэши сводок, онлайн-статус, данные сессий, архив НДР
  (он заново соберётся из чата), проверка хранилища.
  Всё остальное — настройки Центра управления — уходит в S3 сразу.
*/
const VOLATILE_KEY = /(:online$|:user:|snapshot|:sk11-|-details|:wo-archive|:healthcheck|:history-v1|:system:state)/;
const URGENT_S3_DELAY_MS = 5000;
let urgentS3Timer = null;

function scheduleUrgentS3() {
  if (!isS3BackupConfigured() || urgentS3Timer) return;
  urgentS3Timer = setTimeout(async () => {
    urgentS3Timer = null;
    await flushToDisk(main).catch(() => {});
    await backupShardToS3(main);
  }, URGENT_S3_DELAY_MS);
  urgentS3Timer.unref?.();
}

function markDirty(shard, { s3 = true } = {}) {
  shard.dirty = true;
  if (s3) shard.s3Dirty = true;
  if (shard.writeTimer) return;
  shard.writeTimer = setTimeout(() => {
    shard.writeTimer = null;
    flushToDisk(shard).catch((error) => console.error("Локальное хранилище: ошибка записи:", error));
  }, shard.writeDelayMs);
  shard.writeTimer.unref?.();
}

function scheduleWrite(key = "") {
  const shard = shardFor(key);
  markDirty(shard);
  if (key && shard === main && !VOLATILE_KEY.test(key)) scheduleUrgentS3();
}

function flushShard(shard) {
  shard.writing = shard.writing.then(async () => {
    if (!shard.dirty || !shard.loaded) return;
    shard.dirty = false;
    const buffer = await serialize(shard);
    await resolveDataDir();
    await fs.mkdir(dataDir(), { recursive: true });
    const temp = `${filePath(shard)}.${process.pid}.tmp`;
    await fs.writeFile(temp, buffer);
    await fs.rename(temp, filePath(shard));
  }).catch((error) => {
    shard.dirty = true;
    throw error;
  });
  return shard.writing;
}

export async function flushToDisk(shard) {
  if (shard) return flushShard(shard);
  for (const item of shards) await flushShard(item);
}

async function backupShardToS3(shard, { force = false } = {}) {
  if (!isS3BackupConfigured() || !shard.loaded) return false;
  if (shard === main && archiveSplitPending) {
    if (!(await backupShardToS3(archive, { force: true }))) return false;
  }
  if (!force && !shard.s3Dirty) return false;
  // Пустую часть не отправляем — чтобы не затереть хорошую копию.
  if (keyCount(shard) === 0) return false;
  shard.s3Dirty = false;
  try {
    const buffer = await serialize(shard);
    await s3PutObject(s3BackupKey(shard.fileName), buffer);
    // Раз в сутки — отдельная копия настроек на дату (защита от случайной порчи).
    if (shard === main) {
      const day = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (new Date(shard.lastS3Upload + 3 * 60 * 60 * 1000).toISOString().slice(0, 10) !== day) {
        await s3PutObject(s3BackupKey(`daily/store-${day}.json.gz`), buffer);
      }
    }
    if (!shard.lastS3Upload) console.log(`S3: копия ${shard.fileName} сохранена (${Math.round(buffer.length / 1024)} КБ)`);
    shard.lastS3Upload = Date.now();
    if (shard === archive) archiveSplitPending = false;
    lastS3Error = "";
    return true;
  } catch (error) {
    shard.s3Dirty = true;
    lastS3Error = error instanceof Error ? error.message : String(error);
    console.error(`Локальное хранилище: копия ${shard.fileName} в S3 не удалась:`, lastS3Error);
    return false;
  }
}

export async function backupToS3({ force = false } = {}) {
  // Сначала архив: если он переезжает из общего файла, основная копия
  // без архива не должна оказаться в S3 раньше него.
  const archiveSaved = await backupShardToS3(archive, { force });
  const mainSaved = await backupShardToS3(main, { force });
  return archiveSaved || mainSaved;
}

let s3Timer = null;
let archiveS3Timer = null;

function sweepExpired() {
  const now = Date.now();
  for (const shard of shards) {
    let removed = 0;
    for (const [key, entry] of shard.strings) {
      if (entry.exp && entry.exp <= now) { shard.strings.delete(key); removed += 1; }
    }
    for (const [key, entry] of shard.zsets) {
      if (entry.exp && entry.exp <= now) { shard.zsets.delete(key); removed += 1; }
    }
    if (removed) markDirty(shard);
  }
}

/*
  Одноразовый перенос данных из внешнего Redis (Upstash / Vercel KV) в своё
  хранилище. Включается переменной MIGRATE_FROM_REDIS=1 при заданных
  KV_REST_API_URL / KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_*).
  Копируются все ключи приложения (строки и упорядоченные множества)
  со сроками жизни. Повторно не выполняется (метка в хранилище),
  чтобы не перезаписать новые данные старыми.
*/
const MIGRATION_MARK = "lenenergo:max-mini-app:system:migrated-from-redis";

async function redisRest(url, token, args) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || `Redis HTTP ${response.status}`);
  }
  return payload?.result;
}

export async function migrateFromRedisIfRequested() {
  const flag = String(process.env.MIGRATE_FROM_REDIS || "").trim().toLowerCase();
  if (!["1", "true", "yes", "on"].includes(flag)) return null;

  const url = String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
  const token = String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "");
  if (!url || !token) {
    console.log("Перенос из Redis: не заданы KV_REST_API_URL / KV_REST_API_TOKEN — пропуск");
    return null;
  }

  await ensureLocalStoreLoaded();
  await ensureArchiveStoreLoaded();
  if (liveString(MIGRATION_MARK)) {
    console.log(`Перенос из Redis: уже выполнен (${liveString(MIGRATION_MARK).v}) — пропуск`);
    return null;
  }

  const pattern = String(process.env.MIGRATE_REDIS_PATTERN || "lenenergo:max-mini-app:*");
  const stats = { strings: 0, zsets: 0, skipped: 0 };
  let cursor = "0";

  do {
    const [next, keys] = await redisRest(url, token, ["SCAN", cursor, "MATCH", pattern, "COUNT", "200"]);
    cursor = String(next);
    for (const key of keys || []) {
      const type = await redisRest(url, token, ["TYPE", key]);
      const ttl = Number(await redisRest(url, token, ["PTTL", key]));
      const exp = ttl > 0 ? Date.now() + ttl : 0;

      if (type === "string") {
        const value = await redisRest(url, token, ["GET", key]);
        if (value !== null && value !== undefined) {
          shardFor(key).strings.set(key, { v: String(value), exp });
          stats.strings += 1;
        }
      } else if (type === "zset") {
        const flat = await redisRest(url, token, ["ZRANGE", key, "0", "-1", "WITHSCORES"]);
        const members = new Map();
        for (let index = 0; index + 1 < (flat || []).length; index += 2) {
          members.set(String(flat[index]), Number(flat[index + 1]));
        }
        shardFor(key).zsets.set(key, { members, exp });
        stats.zsets += 1;
      } else {
        stats.skipped += 1;
        console.log(`Перенос из Redis: ключ ${key} типа ${type} пропущен`);
      }
    }
  } while (cursor !== "0");

  main.strings.set(MIGRATION_MARK, { v: `${new Date().toISOString()} · строк ${stats.strings}, множеств ${stats.zsets}`, exp: 0 });
  markDirty(main);
  markDirty(archive);
  await flushToDisk().catch((error) => console.error("Перенос из Redis: запись на диск не удалась:", error?.message || error));
  await backupToS3({ force: true });
  console.log(`Перенос из Redis выполнен: строк ${stats.strings}, множеств ${stats.zsets}, пропущено ${stats.skipped}`);
  return stats;
}

export async function startLocalStore() {
  await ensureLocalStoreLoaded();
  try {
    await migrateFromRedisIfRequested();
  } catch (error) {
    console.error("Перенос из Redis не удался:", error instanceof Error ? error.message : error);
  }
  setInterval(sweepExpired, 60 * 60 * 1000).unref?.();
  if (isS3BackupConfigured() && !s3Timer) {
    s3Timer = setInterval(() => backupShardToS3(main), Math.max(60_000, S3_INTERVAL_MS));
    s3Timer.unref?.();
    archiveS3Timer = setInterval(() => backupShardToS3(archive), Math.max(5 * 60_000, ARCHIVE_S3_INTERVAL_MS));
    archiveS3Timer.unref?.();
  }
}

// Вызывается при остановке (в т.ч. перед новым деплоем).
export async function stopLocalStore() {
  for (const shard of shards) {
    if (shard.writeTimer) {
      clearTimeout(shard.writeTimer);
      shard.writeTimer = null;
    }
  }
  await flushToDisk().catch((error) => console.error("Локальное хранилище: запись при остановке:", error));
  await backupToS3();
}

export function localStoreInfo() {
  return {
    keys: keyCount(main) + keyCount(archive),
    mainKeys: keyCount(main),
    archiveKeys: keyCount(archive),
    archiveLoaded: archive.loaded,
    dataFile: filePath(main),
    archiveFile: filePath(archive),
    s3Backup: isS3BackupConfigured(),
    lastS3Upload: main.lastS3Upload ? new Date(main.lastS3Upload).toISOString() : null,
    lastArchiveS3Upload: archive.lastS3Upload ? new Date(archive.lastS3Upload).toISOString() : null,
    lastS3Error,
    restoredFrom: main.restoredFrom,
    archiveRestoredFrom: archive.restoredFrom,
    // Отметку о переносе показываем, только пока перенос включён переменной.
    migratedFromRedis: ["1", "true", "yes", "on"].includes(String(process.env.MIGRATE_FROM_REDIS || "").trim().toLowerCase())
      ? liveString(MIGRATION_MARK)?.v || ""
      : ""
  };
}

/* ---------------- команды ---------------- */

function liveString(key) {
  const { strings } = shardFor(key);
  const entry = strings.get(key);
  if (!entry) return null;
  if (entry.exp && entry.exp <= Date.now()) {
    strings.delete(key);
    return null;
  }
  return entry;
}

function liveZset(key) {
  const { zsets } = shardFor(key);
  const entry = zsets.get(key);
  if (!entry) return null;
  if (entry.exp && entry.exp <= Date.now()) {
    zsets.delete(key);
    return null;
  }
  return entry;
}

function scoreBound(value, fallback) {
  const text = String(value);
  if (text === "-inf") return -Infinity;
  if (text === "+inf" || text === "inf") return Infinity;
  const number = Number(text.replace(/^\(/, ""));
  return Number.isFinite(number) ? number : fallback;
}

function execute(args) {
  const [rawCommand, ...rest] = args;
  const command = String(rawCommand || "").toUpperCase();
  const key = String(rest[0] ?? "");

  switch (command) {
    case "GET":
      return liveString(key)?.v ?? null;

    case "MGET":
      return rest.map((item) => liveString(String(item))?.v ?? null);

    case "SET": {
      const value = String(rest[1] ?? "");
      let exp = 0;
      let nx = false;
      let xx = false;
      for (let index = 2; index < rest.length; index += 1) {
        const option = String(rest[index]).toUpperCase();
        if (option === "EX") exp = Date.now() + Number(rest[++index]) * 1000;
        else if (option === "PX") exp = Date.now() + Number(rest[++index]);
        else if (option === "NX") nx = true;
        else if (option === "XX") xx = true;
      }
      const exists = Boolean(liveString(key));
      if ((nx && exists) || (xx && !exists)) return null;
      shardFor(key).strings.set(key, { v: value, exp });
      scheduleWrite(key);
      return "OK";
    }

    case "DEL": {
      let removed = 0;
      for (const item of rest.map(String)) {
        const shard = shardFor(item);
        let hit = false;
        if (shard.strings.delete(item)) { removed += 1; hit = true; }
        if (shard.zsets.delete(item)) { removed += 1; hit = true; }
        if (hit) scheduleWrite(item);
      }
      return removed;
    }

    case "EXISTS":
      return rest.filter((item) => liveString(String(item)) || liveZset(String(item))).length;

    case "EXPIRE": {
      const entry = liveString(key) || liveZset(key);
      if (!entry) return 0;
      entry.exp = Date.now() + Number(rest[1]) * 1000;
      markDirty(shardFor(key));
      return 1;
    }

    case "TTL": {
      const entry = liveString(key) || liveZset(key);
      if (!entry) return -2;
      return entry.exp ? Math.max(0, Math.round((entry.exp - Date.now()) / 1000)) : -1;
    }

    case "ZADD": {
      const entry = liveZset(key) || { members: new Map(), exp: 0 };
      let added = 0;
      for (let index = 1; index + 1 < rest.length; index += 2) {
        const member = String(rest[index + 1]);
        if (!entry.members.has(member)) added += 1;
        entry.members.set(member, Number(rest[index]));
      }
      shardFor(key).zsets.set(key, entry);
      scheduleWrite(key);
      return added;
    }

    case "ZREM": {
      const entry = liveZset(key);
      if (!entry) return 0;
      let removed = 0;
      for (const member of rest.slice(1)) {
        if (entry.members.delete(String(member))) removed += 1;
      }
      if (removed) scheduleWrite(key);
      return removed;
    }

    case "ZRANGEBYSCORE": {
      const entry = liveZset(key);
      if (!entry) return [];
      const min = scoreBound(rest[1], -Infinity);
      const max = scoreBound(rest[2], Infinity);
      const withScores = rest.slice(3).some((item) => String(item).toUpperCase() === "WITHSCORES");
      const items = [...entry.members.entries()]
        .filter(([, score]) => score >= min && score <= max)
        .sort((a, b) => a[1] - b[1]);
      return withScores
        ? items.flatMap(([member, score]) => [member, String(score)])
        : items.map(([member]) => member);
    }

    case "ZREMRANGEBYSCORE": {
      const entry = liveZset(key);
      if (!entry) return 0;
      const min = scoreBound(rest[1], -Infinity);
      const max = scoreBound(rest[2], Infinity);
      let removed = 0;
      for (const [member, score] of entry.members) {
        if (score >= min && score <= max) {
          entry.members.delete(member);
          removed += 1;
        }
      }
      if (removed) scheduleWrite(key);
      return removed;
    }

    default:
      throw new Error(`Локальное хранилище: команда ${command} не поддерживается`);
  }
}

// Команды с ключами архива ждут его фоновую загрузку, остальные — нет.
const touchesArchive = (args) => args.slice(1).some((item) => ARCHIVE_KEY.test(String(item)));

export async function localCommand(...args) {
  await ensureLocalStoreLoaded();
  if (touchesArchive(args)) await ensureArchiveStoreLoaded();
  return execute(args);
}

export async function localPipeline(commands) {
  await ensureLocalStoreLoaded();
  if ((Array.isArray(commands) ? commands : []).some((args) => touchesArchive(args || []))) {
    await ensureArchiveStoreLoaded();
  }
  return (Array.isArray(commands) ? commands : []).map((args) => {
    try {
      return execute(args);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });
}
