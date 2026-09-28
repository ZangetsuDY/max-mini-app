import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

import {
  getDispatcherStructure,
  getDispatcherUnitRuntime
} from "./dispatcher-structure.js";

const CONFIG_KEY =
  "lenenergo:max-mini-app:dispatcher:workorders-source-config";

function safeParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return [
    ...new Set(
      sources
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .slice(0, 80)
    )
  ];
}

async function readOverrides() {
  if (!isRuntimeStoreConfigured()) return {};

  try {
    const raw = await redisCommand("GET", CONFIG_KEY);
    const parsed = safeParse(raw, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    console.error("Не удалось загрузить источники нарядов/допусков:", error);
    return {};
  }
}

async function writeOverrides(overrides) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error("Хранилище состояния не подключено");
  }

  await redisCommand(
    "SET",
    CONFIG_KEY,
    JSON.stringify(overrides)
  );
}

export async function getWorkordersSourceConfig() {
  const [overrides, structure] = await Promise.all([
    readOverrides(),
    getDispatcherStructure()
  ]);

  return structure.units.map((unit) => {
    const override = overrides?.[unit.id];
    const hasOverride =
      override && Array.isArray(override.sources);

    return {
      ...unit,
      sources: hasOverride
        ? normalizeSources(override.sources)
        : [],
      customized: Boolean(hasOverride),
      updatedAt: override?.updatedAt || null,
      updatedBy: override?.updatedBy || null
    };
  });
}

export async function getWorkordersUnitConfig(unitId) {
  const unit = await getDispatcherUnitRuntime(unitId);
  if (!unit) return null;

  const all = await getWorkordersSourceConfig();
  return all.find((item) => item.id === unit.id) || null;
}

export async function setWorkordersUnitSources({
  unitId,
  sources,
  actor
}) {
  const unit = await getDispatcherUnitRuntime(
    String(unitId || "").trim()
  );

  if (!unit) {
    throw new Error("РЭС/район не найден");
  }

  const overrides = await readOverrides();
  const cleanSources = normalizeSources(sources);

  overrides[unit.id] = {
    sources: cleanSources,
    updatedAt: new Date().toISOString(),
    updatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  };

  await writeOverrides(overrides);
  return getWorkordersUnitConfig(unit.id);
}

export async function resetWorkordersUnitSources({ unitId }) {
  const unit = await getDispatcherUnitRuntime(
    String(unitId || "").trim()
  );

  if (!unit) {
    throw new Error("РЭС/район не найден");
  }

  const overrides = await readOverrides();
  delete overrides[unit.id];
  await writeOverrides(overrides);
  return getWorkordersUnitConfig(unit.id);
}
