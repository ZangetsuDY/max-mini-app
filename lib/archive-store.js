/*
  Хранилище архива НДР: ключ → строка с ограниченным сроком жизни.
  Работает через общее хранилище приложения (runtime-store):
  внешний Redis, если он задан, иначе собственное хранилище сервера
  (диск + резервная копия в S3, см. lib/local-store.js).
*/
import {
  redisPipeline,
  runtimeStoreBackend
} from "./runtime-store.js";

const BATCH = 150;

function chunks(list, size = BATCH) {
  const result = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
}

export function archiveBackend() {
  return runtimeStoreBackend();
}

export async function storeGet(key) {
  const [value] = await redisPipeline([["GET", key]]);
  return typeof value === "string" ? value : null;
}

export async function storeGetMany(keys) {
  const list = Array.isArray(keys) ? keys : [];
  const result = [];
  for (const part of chunks(list)) {
    const [values] = await redisPipeline([["MGET", ...part]]);
    result.push(...(Array.isArray(values) ? values : part.map(() => null)));
  }
  return result.map((value) => (typeof value === "string" ? value : null));
}

// entries: [[key, value], ...]
export async function storeSetMany(entries, ttlSeconds) {
  const list = Array.isArray(entries) ? entries.filter(([key]) => key) : [];
  for (const part of chunks(list, 60)) {
    await redisPipeline(part.map(([key, value]) =>
      ttlSeconds ? ["SET", key, value, "EX", String(ttlSeconds)] : ["SET", key, value]
    ));
  }
}

export async function storeSet(key, value, ttlSeconds) {
  return storeSetMany([[key, value]], ttlSeconds);
}

export async function storeExpireMany(keys, ttlSeconds) {
  const list = Array.isArray(keys) ? keys.filter(Boolean) : [];
  for (const part of chunks(list, 300)) {
    await redisPipeline(part.map((key) => ["EXPIRE", key, String(ttlSeconds)]));
  }
}

// Просроченные ключи удаляет само хранилище (Redis / локальное — при записи).
export async function storeSweep() {
  return 0;
}
