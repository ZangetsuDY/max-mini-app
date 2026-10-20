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

import {
  isS3BackupConfigured,
  s3BackupKey,
  s3PutObject,
  s3GetObject
} from "./s3-backup.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE_NAME = "store.json.gz";
const WRITE_DELAY_MS = 3000;
const S3_INTERVAL_MS = Number(process.env.S3_BACKUP_INTERVAL_MIN || 10) * 60 * 1000;

const strings = new Map(); // key -> { v, exp }
const zsets = new Map();   // key -> { members: Map(member -> score), exp }

let loaded = false;
let loading = null;
let dirty = false;
let writeTimer = null;
let writing = Promise.resolve();
let s3Dirty = false;
let lastS3Upload = 0;
let lastS3Error = "";
let restoredFrom = "";

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

function filePath() {
  return path.join(dataDir(), FILE_NAME);
}

/* ---------------- сериализация ---------------- */

function serialize() {
  const now = Date.now();
  const data = { version: 1, savedAt: new Date().toISOString(), strings: [], zsets: [] };
  for (const [key, entry] of strings) {
    if (entry.exp && entry.exp <= now) continue;
    data.strings.push([key, entry.v, entry.exp || 0]);
  }
  for (const [key, entry] of zsets) {
    if (entry.exp && entry.exp <= now) continue;
    data.zsets.push([key, [...entry.members.entries()], entry.exp || 0]);
  }
  return zlib.gzipSync(Buffer.from(JSON.stringify(data), "utf8"), { level: 1 });
}

function restore(buffer) {
  const data = JSON.parse(zlib.gunzipSync(buffer).toString("utf8"));
  const now = Date.now();
  strings.clear();
  zsets.clear();
  for (const [key, value, exp] of data.strings || []) {
    if (exp && exp <= now) continue;
    strings.set(key, { v: value, exp: exp || 0 });
  }
  for (const [key, members, exp] of data.zsets || []) {
    if (exp && exp <= now) continue;
    zsets.set(key, { members: new Map(members), exp: exp || 0 });
  }
  return data.savedAt || "";
}

/* ---------------- загрузка / запись ---------------- */

export function ensureLocalStoreLoaded() {
  if (loaded) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      try {
        await resolveDataDir().catch((error) => console.error("Локальное хранилище:", error.message));
        const buffer = await fs.readFile(filePath());
        const savedAt = restore(buffer);
        restoredFrom = `disk ${savedAt}`;
      } catch (error) {
        if (error?.code !== "ENOENT") {
          console.error("Локальное хранилище: не удалось прочитать файл:", error);
        }
        // Нет локального файла (например, после нового деплоя) — берём из S3.
        if (isS3BackupConfigured()) {
          try {
            const buffer = await s3GetObject(s3BackupKey(FILE_NAME));
            console.log(buffer
              ? `S3: найдена копия хранилища (${Math.round(buffer.length / 1024)} КБ) — восстанавливаем`
              : "S3: подключение OK, копии пока нет (первый запуск)");
            if (buffer) {
              const savedAt = restore(buffer);
              restoredFrom = `s3 ${savedAt}`;
              dirty = true;
              scheduleWrite();
            }
          } catch (s3Error) {
            lastS3Error = s3Error instanceof Error ? s3Error.message : String(s3Error);
            console.error("Локальное хранилище: восстановление из S3 не удалось:", lastS3Error);
          }
        }
      }
      loaded = true;
      console.log(`Локальное хранилище: ключей ${strings.size + zsets.size}${restoredFrom ? `, восстановлено из ${restoredFrom}` : ""}`);
    })();
  }
  return loading;
}

function scheduleWrite() {
  dirty = true;
  s3Dirty = true;
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flushToDisk().catch((error) => console.error("Локальное хранилище: ошибка записи:", error));
  }, WRITE_DELAY_MS);
  writeTimer.unref?.();
}

export function flushToDisk() {
  writing = writing.then(async () => {
    if (!dirty) return;
    dirty = false;
    const buffer = serialize();
    await resolveDataDir();
    await fs.mkdir(dataDir(), { recursive: true });
    const temp = `${filePath()}.${process.pid}.tmp`;
    await fs.writeFile(temp, buffer);
    await fs.rename(temp, filePath());
  }).catch((error) => {
    dirty = true;
    throw error;
  });
  return writing;
}

export async function backupToS3({ force = false } = {}) {
  if (!isS3BackupConfigured() || !loaded) return false;
  if (!force && !s3Dirty) return false;
  // Пустое хранилище не отправляем — чтобы не затереть хорошую копию.
  if (strings.size + zsets.size === 0) return false;
  s3Dirty = false;
  try {
    const buffer = serialize();
    await s3PutObject(s3BackupKey(FILE_NAME), buffer);
    // Раз в сутки — отдельная копия на дату (защита от случайной порчи).
    const day = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (new Date(lastS3Upload + 3 * 60 * 60 * 1000).toISOString().slice(0, 10) !== day) {
      await s3PutObject(s3BackupKey(`daily/store-${day}.json.gz`), buffer);
    }
    if (!lastS3Upload) console.log(`S3: копия хранилища сохранена (${Math.round(buffer.length / 1024)} КБ)`);
    lastS3Upload = Date.now();
    lastS3Error = "";
    return true;
  } catch (error) {
    s3Dirty = true;
    lastS3Error = error instanceof Error ? error.message : String(error);
    console.error("Локальное хранилище: копия в S3 не удалась:", lastS3Error);
    return false;
  }
}

let s3Timer = null;

// Вызывается при старте сервера.
function sweepExpired() {
  const now = Date.now();
  let removed = 0;
  for (const [key, entry] of strings) {
    if (entry.exp && entry.exp <= now) { strings.delete(key); removed += 1; }
  }
  for (const [key, entry] of zsets) {
    if (entry.exp && entry.exp <= now) { zsets.delete(key); removed += 1; }
  }
  if (removed) scheduleWrite();
  return removed;
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
          strings.set(key, { v: String(value), exp });
          stats.strings += 1;
        }
      } else if (type === "zset") {
        const flat = await redisRest(url, token, ["ZRANGE", key, "0", "-1", "WITHSCORES"]);
        const members = new Map();
        for (let index = 0; index + 1 < (flat || []).length; index += 2) {
          members.set(String(flat[index]), Number(flat[index + 1]));
        }
        zsets.set(key, { members, exp });
        stats.zsets += 1;
      } else {
        stats.skipped += 1;
        console.log(`Перенос из Redis: ключ ${key} типа ${type} пропущен`);
      }
    }
  } while (cursor !== "0");

  strings.set(MIGRATION_MARK, { v: `${new Date().toISOString()} · строк ${stats.strings}, множеств ${stats.zsets}`, exp: 0 });
  scheduleWrite();
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
    s3Timer = setInterval(() => backupToS3(), Math.max(60_000, S3_INTERVAL_MS));
    s3Timer.unref?.();
  }
}

// Вызывается при остановке (в т.ч. перед новым деплоем).
export async function stopLocalStore() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  await flushToDisk().catch((error) => console.error("Локальное хранилище: запись при остановке:", error));
  await backupToS3({ force: true });
}

export function localStoreInfo() {
  return {
    keys: strings.size + zsets.size,
    dataFile: filePath(),
    s3Backup: isS3BackupConfigured(),
    lastS3Upload: lastS3Upload ? new Date(lastS3Upload).toISOString() : null,
    lastS3Error,
    restoredFrom,
    migratedFromRedis: liveString(MIGRATION_MARK)?.v || ""
  };
}

/* ---------------- команды ---------------- */

function liveString(key) {
  const entry = strings.get(key);
  if (!entry) return null;
  if (entry.exp && entry.exp <= Date.now()) {
    strings.delete(key);
    return null;
  }
  return entry;
}

function liveZset(key) {
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
      strings.set(key, { v: value, exp });
      scheduleWrite();
      return "OK";
    }

    case "DEL": {
      let removed = 0;
      for (const item of rest) {
        if (strings.delete(String(item))) removed += 1;
        if (zsets.delete(String(item))) removed += 1;
      }
      if (removed) scheduleWrite();
      return removed;
    }

    case "EXISTS":
      return rest.filter((item) => liveString(String(item)) || liveZset(String(item))).length;

    case "EXPIRE": {
      const entry = liveString(key) || liveZset(key);
      if (!entry) return 0;
      entry.exp = Date.now() + Number(rest[1]) * 1000;
      scheduleWrite();
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
      zsets.set(key, entry);
      scheduleWrite();
      return added;
    }

    case "ZREM": {
      const entry = liveZset(key);
      if (!entry) return 0;
      let removed = 0;
      for (const member of rest.slice(1)) {
        if (entry.members.delete(String(member))) removed += 1;
      }
      if (removed) scheduleWrite();
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
      if (removed) scheduleWrite();
      return removed;
    }

    default:
      throw new Error(`Локальное хранилище: команда ${command} не поддерживается`);
  }
}

export async function localCommand(...args) {
  await ensureLocalStoreLoaded();
  return execute(args);
}

export async function localPipeline(commands) {
  await ensureLocalStoreLoaded();
  return (Array.isArray(commands) ? commands : []).map((args) => {
    try {
      return execute(args);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });
}
