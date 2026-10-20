/*
  Хранилище архива (НДР): ключ → строка с ограниченным сроком жизни.
  - Redis (Upstash / Vercel KV), если настроен — основной вариант;
  - иначе файлы в каталоге ARCHIVE_DATA_DIR (по умолчанию ./data/archive).
    На Timeweb Cloud Apps локальный диск может очищаться при новом деплое,
    поэтому для надёжного хранения 32 дней нужен Redis или постоянный том.
*/
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  isRuntimeStoreConfigured,
  redisPipeline
} from "./runtime-store.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = 150;

function dataDir() {
  return path.resolve(ROOT, process.env.ARCHIVE_DATA_DIR || "data/archive");
}

function fileFor(key) {
  return path.join(dataDir(), `${createHash("sha1").update(key).digest("hex")}.json`);
}

function chunks(list, size = BATCH) {
  const result = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
}

export function archiveBackend() {
  return isRuntimeStoreConfigured() ? "redis" : "file";
}

/* ---------------- файловый вариант ---------------- */

async function fileGet(key) {
  try {
    const raw = JSON.parse(await fs.readFile(fileFor(key), "utf8"));
    if (raw.exp && raw.exp < Date.now()) return null;
    return raw.v;
  } catch {
    return null;
  }
}

async function fileSet(key, value, ttlSeconds) {
  await fs.mkdir(dataDir(), { recursive: true });
  const target = fileFor(key);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify({ k: key, v: value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 }));
  await fs.rename(temp, target);
}

async function fileExpire(key, ttlSeconds) {
  const value = await fileGet(key);
  if (value !== null) await fileSet(key, value, ttlSeconds);
}

/* ---------------- общий интерфейс ---------------- */

export async function storeGet(key) {
  if (archiveBackend() === "redis") {
    const [value] = await redisPipeline([["GET", key]]);
    return typeof value === "string" ? value : null;
  }
  return fileGet(key);
}

export async function storeGetMany(keys) {
  const list = Array.isArray(keys) ? keys : [];
  if (!list.length) return [];

  if (archiveBackend() === "redis") {
    const result = [];
    for (const part of chunks(list)) {
      const [values] = await redisPipeline([["MGET", ...part]]);
      result.push(...(Array.isArray(values) ? values : part.map(() => null)));
    }
    return result.map((value) => (typeof value === "string" ? value : null));
  }

  return Promise.all(list.map(fileGet));
}

// entries: [[key, value], ...]
export async function storeSetMany(entries, ttlSeconds) {
  const list = Array.isArray(entries) ? entries.filter(([key]) => key) : [];
  if (!list.length) return;

  if (archiveBackend() === "redis") {
    for (const part of chunks(list, 60)) {
      await redisPipeline(part.map(([key, value]) =>
        ttlSeconds ? ["SET", key, value, "EX", String(ttlSeconds)] : ["SET", key, value]
      ));
    }
    return;
  }

  for (const [key, value] of list) {
    await fileSet(key, value, ttlSeconds);
  }
}

export async function storeSet(key, value, ttlSeconds) {
  return storeSetMany([[key, value]], ttlSeconds);
}

export async function storeExpireMany(keys, ttlSeconds) {
  const list = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (!list.length) return;

  if (archiveBackend() === "redis") {
    for (const part of chunks(list, 300)) {
      await redisPipeline(part.map((key) => ["EXPIRE", key, String(ttlSeconds)]));
    }
    return;
  }

  for (const key of list) {
    await fileExpire(key, ttlSeconds);
  }
}

// Удаление просроченных файлов (для Redis срок жизни отслеживает сам Redis).
export async function storeSweep() {
  if (archiveBackend() === "redis") return 0;
  let removed = 0;
  let names = [];
  try {
    names = await fs.readdir(dataDir());
  } catch {
    return 0;
  }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(dataDir(), name);
    try {
      const raw = JSON.parse(await fs.readFile(file, "utf8"));
      if (raw.exp && raw.exp < Date.now()) {
        await fs.unlink(file);
        removed += 1;
      }
    } catch {
      // повреждённый или занятый файл — пропускаем
    }
  }
  return removed;
}
