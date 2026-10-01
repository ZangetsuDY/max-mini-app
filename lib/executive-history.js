import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const HISTORY_KEY =
  "lenenergo:max-mini-app:executive:history-v1";

const MAX_POINTS = 72;

function safeParse(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function metricShape(value) {
  return {
    outages: Number(value?.outages || 0),
    requests: Number(value?.requests || 0),
    workorders: Number(value?.workorders || 0)
  };
}

function normalizePoint(value) {
  if (!value || typeof value !== "object") return null;

  return {
    signature: String(value.signature || ""),
    timestamp: String(value.timestamp || ""),
    label: String(value.label || ""),
    global: metricShape(value.global),
    groups:
      value.groups && typeof value.groups === "object"
        ? Object.fromEntries(
            Object.entries(value.groups).map(([key, item]) => [
              String(key),
              metricShape(item)
            ])
          )
        : {},
    units:
      value.units && typeof value.units === "object"
        ? Object.fromEntries(
            Object.entries(value.units).map(([key, item]) => [
              String(key),
              metricShape(item)
            ])
          )
        : {}
  };
}

async function readHistory() {
  if (!isRuntimeStoreConfigured()) {
    return [];
  }

  try {
    const raw = await redisCommand("GET", HISTORY_KEY);
    const parsed = safeParse(raw, []);

    return (Array.isArray(parsed) ? parsed : [])
      .map(normalizePoint)
      .filter(Boolean)
      .slice(-MAX_POINTS);
  } catch (error) {
    console.error("Executive history read failed:", error);
    return [];
  }
}

async function writeHistory(points) {
  if (!isRuntimeStoreConfigured()) return false;

  try {
    await redisCommand(
      "SET",
      HISTORY_KEY,
      JSON.stringify(points.slice(-MAX_POINTS))
    );
    return true;
  } catch (error) {
    console.error("Executive history write failed:", error);
    return false;
  }
}

export async function recordExecutivePoint(point) {
  const normalized = normalizePoint(point);

  if (!normalized || !normalized.signature) {
    return await readHistory();
  }

  const history = await readHistory();
  const last = history.at(-1);

  if (last?.signature === normalized.signature) {
    return history;
  }

  const next = [...history, normalized].slice(-MAX_POINTS);
  await writeHistory(next);
  return next;
}

export function selectExecutiveHistory(history, {
  groupId = "",
  unitId = ""
} = {}) {
  const list = Array.isArray(history) ? history : [];

  return list
    .map((point) => {
      const metrics = unitId
        ? point?.units?.[unitId]
        : groupId
          ? point?.groups?.[groupId]
          : point?.global;

      if (!metrics) return null;

      return {
        timestamp: point.timestamp,
        label: point.label,
        outages: Number(metrics.outages || 0),
        requests: Number(metrics.requests || 0),
        workorders: Number(metrics.workorders || 0)
      };
    })
    .filter(Boolean)
    .slice(-24);
}
