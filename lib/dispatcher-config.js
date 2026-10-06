import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

import {
  getDispatcherStructure,
  getDispatcherUnitRuntime
} from "./dispatcher-structure.js";

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

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .slice(0, 100)
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
  const [overrides, structure] = await Promise.all([
    readOverrides(),
    getDispatcherStructure()
  ]);

  return structure.units.map((unit) => {
    const override = overrides?.[unit.id];
    const hasOverride =
      override && Array.isArray(override.sources);
    const hasOutageOverride =
      override && (
        Array.isArray(override.outageDivisionIds) ||
        Array.isArray(override.outageSources)
      );

    const defaults =
      Array.isArray(unit.defaultSources)
        ? [...unit.defaultSources]
        : [];

    return {
      ...unit,
      defaultSources: defaults,
      sources: hasOverride
        ? normalizeSources(override.sources)
        : defaults,
      customized: Boolean(hasOverride),
      outageDivisionIds: Array.isArray(override?.outageDivisionIds)
        ? normalizeIds(override.outageDivisionIds)
        : [],
      outageSources: Array.isArray(override?.outageSources)
        ? normalizeSources(override.outageSources)
        : [],
      outageCustomized: Boolean(hasOutageOverride),
      updatedAt: override?.updatedAt || null,
      updatedBy: override?.updatedBy || null,
      outageUpdatedAt: override?.outageUpdatedAt || null,
      outageUpdatedBy: override?.outageUpdatedBy || null
    };
  });
}

export async function getDispatcherUnitConfig(unitId) {
  const unit = await getDispatcherUnitRuntime(unitId);
  if (!unit) return null;

  const all = await getDispatcherSourceConfig();
  return all.find((item) => item.id === unit.id) || null;
}

export async function setDispatcherUnitSources({
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
    ...(overrides[unit.id] || {}),
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
  const unit = await getDispatcherUnitRuntime(
    String(unitId || "").trim()
  );

  if (!unit) {
    throw new Error("РЭС/район не найден");
  }

  const overrides = await readOverrides();
  const current = overrides[unit.id] || {};
  delete current.sources;
  delete current.updatedAt;
  delete current.updatedBy;

  if (Object.keys(current).length) {
    overrides[unit.id] = current;
  } else {
    delete overrides[unit.id];
  }

  await writeOverrides(overrides);
  return getDispatcherUnitConfig(unit.id);
}

export async function setDispatcherUnitOutageSources({
  unitId,
  divisionIds,
  actor
}) {
  const unit = await getDispatcherUnitRuntime(
    String(unitId || "").trim()
  );

  if (!unit) {
    throw new Error("РЭС/район не найден");
  }

  const overrides = await readOverrides();
  const cleanDivisionIds = normalizeIds(divisionIds);

  overrides[unit.id] = {
    ...(overrides[unit.id] || {}),
    outageDivisionIds: cleanDivisionIds,
    outageUpdatedAt: new Date().toISOString(),
    outageUpdatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  };

  delete overrides[unit.id].outageSources;

  await writeOverrides(overrides);
  return getDispatcherUnitConfig(unit.id);
}

export async function resetDispatcherUnitOutageSources({ unitId }) {
  const unit = await getDispatcherUnitRuntime(
    String(unitId || "").trim()
  );

  if (!unit) {
    throw new Error("РЭС/район не найден");
  }

  const overrides = await readOverrides();
  const current = overrides[unit.id] || {};
  delete current.outageDivisionIds;
  delete current.outageSources;
  delete current.outageUpdatedAt;
  delete current.outageUpdatedBy;

  if (Object.keys(current).length) {
    overrides[unit.id] = current;
  } else {
    delete overrides[unit.id];
  }

  await writeOverrides(overrides);
  return getDispatcherUnitConfig(unit.id);
}
