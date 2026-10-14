import crypto from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";

import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

import {
  getDutyPersonnelConfig as readDutyPersonnelConfig,
  setDutyPersonnelChatId
} from "./duty-personnel-config.js";

const MAX_API_BASE = "https://platform-api2.max.ru";
const SNAPSHOT_CACHE_KEY =
  "lenenergo:max-mini-app:dispatcher:duty-personnel-snapshot";
const PART_MATCH_WINDOW_MS = 15 * 60 * 1000;

function safeParse(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

export function normalizeDutyRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
}

function loadCertificate(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = fs.readFileSync(fileUrl);
  return new crypto.X509Certificate(raw).toString();
}

let maxHttpsAgent = null;

function getMaxHttpsAgent() {
  if (maxHttpsAgent) return maxHttpsAgent;

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

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
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
      request.destroy(new Error("Таймаут соединения с API MAX"));
    });

    request.on("error", reject);
    request.end();
  });
}

function getCacheSeconds() {
  const value = Number(
    process.env.DUTY_PERSONNEL_CACHE_SECONDS ||
    process.env.DISPATCHER_CACHE_SECONDS ||
    15
  );

  if (!Number.isFinite(value)) return 15;
  return Math.max(5, Math.min(Math.round(value), 120));
}

async function readCachedSnapshot() {
  if (!isRuntimeStoreConfigured()) return null;

  try {
    const raw = await redisCommand("GET", SNAPSHOT_CACHE_KEY);
    return safeParse(raw, null);
  } catch {
    return null;
  }
}

async function writeCachedSnapshot(snapshot) {
  if (!isRuntimeStoreConfigured()) return;

  try {
    await redisCommand(
      "SET",
      SNAPSHOT_CACHE_KEY,
      JSON.stringify(snapshot)
    );
  } catch (error) {
    console.error("Не удалось сохранить кэш дежурного персонала:", error);
  }
}

function hasDutyHeader(text) {
  return /ДЕЖУРНЫЙ\s+ПЕРСОНАЛ\s+СК-11/i.test(cleanText(text));
}

function getPartInfo(text) {
  const match = cleanText(text).match(/Часть\s*(\d+)\s*\/\s*(\d+)/i);
  if (!match) return null;

  const part = Number(match[1]);
  const total = Number(match[2]);

  if (
    !Number.isInteger(part) ||
    !Number.isInteger(total) ||
    part < 1 ||
    total < 1 ||
    part > total ||
    total > 20
  ) {
    return null;
  }

  return { part, total };
}

function getStateSignature(text) {
  const value = cleanText(text);
  const match = value.match(
    /Состояние\s+на\s+([^\n]+?)(?:\s*\(время\s+ПК\))?\s*$/im
  );
  return String(match?.[1] || "").trim();
}

function toMillis(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric < 1e12 ? numeric * 1000 : numeric;
}

export function parseDutyPersonnelMessage(text, meta = {}) {
  const value = cleanText(text);
  if (!hasDutyHeader(value)) return null;

  const assignmentMap = new Map();

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^ДЕЖУРНЫЙ\s+ПЕРСОНАЛ\s+СК-11/i.test(line)) continue;
    if (/^Состояние\s+на\s+/i.test(line)) continue;
    if (/^Сотрудников\s*:/i.test(line)) continue;
    if (/^РОЛЬ\s*[—–-]\s*ФИО/i.test(line)) continue;
    if (/^Часть\s*\d+\s*\/\s*\d+/i.test(line)) continue;
    if (/^-{3,}$/.test(line)) continue;

    const match = line.match(/^(.+?)\s+[—–-]\s+(.+)$/);
    if (!match) continue;

    const role = match[1].trim();
    const fullName = match[2].trim();
    if (!role || !fullName) continue;

    const key = normalizeDutyRole(role);
    const existing = assignmentMap.get(key);

    if (!existing) {
      assignmentMap.set(key, {
        role,
        fullName
      });
    } else if (existing.fullName !== fullName) {
      existing.fullName = [existing.fullName, fullName]
        .filter(Boolean)
        .filter((name, index, array) => array.indexOf(name) === index)
        .join(" / ");
    }
  }

  const assignments = [...assignmentMap.values()];
  if (!assignments.length) return null;

  const employeesMatch = value.match(/Сотрудников\s*:\s*(\d+)/i);
  const assignmentsMatch = value.match(/назначений\s+ролей\s*:\s*(\d+)/i);
  const stateSignature = getStateSignature(value);

  const roles = {};
  for (const item of assignments) {
    roles[normalizeDutyRole(item.role)] = item;
  }

  return {
    format: "sk11-duty-personnel-v1",
    parsedAt: new Date().toISOString(),
    messageTimestamp: Number(meta.messageTimestamp || 0) || null,
    messageId: String(meta.messageId || ""),
    messageIds: Array.isArray(meta.messageIds)
      ? meta.messageIds.filter(Boolean)
      : [],
    parts: Number(meta.parts || 1) || 1,
    sourceUpdatedAt: stateSignature,
    employees: employeesMatch ? Number(employeesMatch[1]) : null,
    reportedEmployees: employeesMatch ? Number(employeesMatch[1]) : null,
    reportedAssignments: assignmentsMatch ? Number(assignmentsMatch[1]) : null,
    assignmentCount: assignments.length,
    assignments,
    roles
  };
}

async function fetchLatestSnapshotFromMax(chatId) {
  const botToken = String(process.env.MAX_BOT_TOKEN || "").trim();

  if (!botToken) {
    throw new Error("Не указан MAX_BOT_TOKEN");
  }

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message: "Укажите ID чата дежурного персонала в Центре управления системой.",
      snapshot: null
    };
  }

  const url = new URL(`${MAX_API_BASE}/messages`);
  url.searchParams.set("chat_id", chatId);
  url.searchParams.set("count", "100");

  const response = await maxApiRequest(url, botToken);

  let data = null;
  try { data = JSON.parse(response.body); }
  catch { data = null; }

  if (!response.ok) {
    const details =
      data?.message ||
      data?.error ||
      response.body ||
      `HTTP ${response.status}`;
    throw new Error(`MAX API: ${details}`);
  }

  const messages = Array.isArray(data?.messages)
    ? [...data.messages]
    : [];

  messages.sort(
    (a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0)
  );

  const headerIndex = messages.findIndex(
    (message) => hasDutyHeader(message?.body?.text)
  );

  if (headerIndex < 0) {
    return {
      configured: true,
      status: "no_data",
      message: "В последних 100 сообщениях не найдена сводка «ДЕЖУРНЫЙ ПЕРСОНАЛ СК-11».",
      snapshot: null
    };
  }

  const newest = messages[headerIndex];
  const newestText = String(newest?.body?.text || "");
  const newestPart = getPartInfo(newestText);
  const stateSignature = getStateSignature(newestText);

  const singleSnapshot = () => parseDutyPersonnelMessage(newestText, {
    messageTimestamp: newest?.timestamp,
    messageId: newest?.body?.mid || newest?.mid || "",
    messageIds: [newest?.body?.mid || newest?.mid || ""],
    parts: 1
  });

  if (!newestPart || newestPart.total <= 1) {
    const snapshot = singleSnapshot();
    return snapshot
      ? { configured: true, status: "ok", message: "", snapshot }
      : {
          configured: true,
          status: "parse_error",
          message: "Сводка дежурного персонала найдена, но роли и ФИО не распознаны.",
          snapshot: null
        };
  }

  const parts = new Map();
  parts.set(newestPart.part, newest);
  const newestTimestampMs = toMillis(newest?.timestamp);

  for (let part = 1; part <= newestPart.total; part += 1) {
    if (parts.has(part)) continue;

    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const message of messages) {
      if (message === newest) continue;
      const text = String(message?.body?.text || "");
      const info = getPartInfo(text);
      if (!info || info.total !== newestPart.total || info.part !== part) continue;
      if (!hasDutyHeader(text)) continue;

      const candidateSignature = getStateSignature(text);
      if (stateSignature && candidateSignature !== stateSignature) continue;

      const timestampMs = toMillis(message?.timestamp);
      const distance = newestTimestampMs && timestampMs
        ? Math.abs(timestampMs - newestTimestampMs)
        : Math.abs(messages.indexOf(message) - headerIndex) * 1000;

      if (distance <= PART_MATCH_WINDOW_MS && distance < bestDistance) {
        best = message;
        bestDistance = distance;
      }
    }

    if (best) parts.set(part, best);
  }

  if (parts.size !== newestPart.total) {
    const missing = [];
    for (let part = 1; part <= newestPart.total; part += 1) {
      if (!parts.has(part)) missing.push(part);
    }

    return {
      configured: true,
      status: "partial",
      message: `Получена новая волна дежурного персонала, ожидаются части: ${missing.join(", ")} из ${newestPart.total}.`,
      snapshot: null
    };
  }

  const ordered = [];
  for (let part = 1; part <= newestPart.total; part += 1) {
    ordered.push(parts.get(part));
  }

  const combinedText = ordered
    .map((message) => String(message?.body?.text || ""))
    .join("\n\n");

  const messageIds = ordered
    .map((message) => message?.body?.mid || message?.mid || "")
    .filter(Boolean);

  const snapshot = parseDutyPersonnelMessage(combinedText, {
    messageTimestamp: newest?.timestamp,
    messageId: messageIds[0] || "",
    messageIds,
    parts: newestPart.total
  });

  return snapshot
    ? { configured: true, status: "ok", message: "", snapshot }
    : {
        configured: true,
        status: "parse_error",
        message: "Все части сводки дежурного персонала найдены, но роли и ФИО не распознаны.",
        snapshot: null
      };
}

export async function getLatestDutyPersonnelSnapshot({ force = false } = {}) {
  const config = await readDutyPersonnelConfig();
  const chatId = String(config.chatId || "").trim();

  if (!chatId) {
    return {
      configured: false,
      status: "not_configured",
      message: "Укажите ID чата дежурного персонала в Центре управления системой.",
      snapshot: null,
      stale: false,
      cached: false,
      config
    };
  }

  const cacheSeconds = getCacheSeconds();
  const cachedRaw = await readCachedSnapshot();
  const cached = cachedRaw?.chatId === chatId ? cachedRaw : null;

  if (
    !force &&
    cached?.snapshot &&
    cached?.cachedAt &&
    Date.now() - Date.parse(cached.cachedAt) < cacheSeconds * 1000
  ) {
    return {
      ...cached,
      cached: true,
      stale: false,
      config
    };
  }

  try {
    const fresh = await fetchLatestSnapshotFromMax(chatId);

    if (fresh.status === "partial" && cached?.snapshot) {
      return {
        ...cached,
        cached: true,
        stale: true,
        status: "waiting_parts",
        message: `${fresh.message} Показана последняя полная смена.`,
        config
      };
    }

    const payload = {
      ...fresh,
      chatId,
      cachedAt: new Date().toISOString(),
      cached: false,
      stale: false
    };

    if (fresh.snapshot) {
      await writeCachedSnapshot(payload);
      return { ...payload, config };
    }

    if (cached?.snapshot) {
      return {
        ...cached,
        cached: true,
        stale: true,
        status: "stale",
        message: `${fresh.message || "Новая сводка пока не распознана."} Показана последняя сохранённая смена.`,
        config
      };
    }

    return { ...payload, config };
  } catch (error) {
    if (cached?.snapshot) {
      return {
        ...cached,
        cached: true,
        stale: true,
        status: "stale",
        message: `MAX временно недоступен. Показаны последние сохранённые данные. ${error instanceof Error ? error.message : String(error)}`,
        config
      };
    }

    return {
      configured: true,
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      snapshot: null,
      stale: false,
      cached: false,
      config
    };
  }
}

export function getDutyPersonForRole(snapshot, role) {
  const key = normalizeDutyRole(role);
  if (!key || !snapshot?.roles) return null;
  return snapshot.roles[key] || null;
}


export async function getDutyPersonnelConfig() {
  return readDutyPersonnelConfig();
}

export async function setDutyPersonnelConfig({ chatId, actor }) {
  return setDutyPersonnelChatId({ chatId, actor });
}

export function getPersonnelNamesForRole(snapshot, role) {
  const person = getDutyPersonForRole(snapshot, role);
  if (!person?.fullName) return [];
  return String(person.fullName)
    .split(/\s*\/\s*/)
    .map((value) => value.trim())
    .filter(Boolean);
}
