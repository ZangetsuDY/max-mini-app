import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

import {
  DISPATCHER_UNIT_REGISTRY,
  getDispatcherUnit
} from "./dispatcher-registry.js";

const CONFIG_KEY =
  "lenenergo:max-mini-app:dispatcher:source-config";

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
        .slice(0, 50)
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
    console.error("Не удалось загрузить источники диспетчерских РЭС:", error);
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

export async function getDispatcherSourceConfig() {
  const overrides = await readOverrides();

  return DISPATCHER_UNIT_REGISTRY.map((unit) => {
    const override = overrides?.[unit.id];
    const hasOverride =
      override && Array.isArray(override.sources);

    return {
      ...unit,
      defaultSources: [...unit.defaultSources],
      sources: hasOverride
        ? normalizeSources(override.sources)
        : [...unit.defaultSources],
      customized: Boolean(hasOverride),
      updatedAt: override?.updatedAt || null,
      updatedBy: override?.updatedBy || null
    };
  });
}

export async function getDispatcherUnitConfig(unitId) {
  const unit = getDispatcherUnit(unitId);
  if (!unit) return null;

  const all = await getDispatcherSourceConfig();
  return all.find((item) => item.id === unitId) || null;
}

export async function setDispatcherUnitSources({
  unitId,
  sources,
  actor
}) {
  const unit = getDispatcherUnit(String(unitId || "").trim());
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
  return getDispatcherUnitConfig(unit.id);
}

export async function resetDispatcherUnitSources({ unitId }) {
  const unit = getDispatcherUnit(String(unitId || "").trim());
  if (!unit) throw new Error("РЭС/район не найден");

  const overrides = await readOverrides();
  delete overrides[unit.id];
  await writeOverrides(overrides);
  return getDispatcherUnitConfig(unit.id);
}
