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

function normalizeOutageSelections(selections) {
  if (!Array.isArray(selections)) return [];

  const byDivision = new Map();

  for (const value of selections) {
    const divisionId = String(value?.divisionId || "").trim();
    if (!divisionId) continue;

    const sources = normalizeSources(value?.sources);
    const current = byDivision.get(divisionId) || [];
    byDivision.set(divisionId, normalizeSources([...current, ...sources]));
  }

  return [...byDivision.entries()]
    .slice(0, 100)
    .map(([divisionId, sources]) => ({
      divisionId,
      sources
    }));
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
    const hasOutageSelectionsOverride =
      override && Array.isArray(override.outageSelections);
    const hasLegacyOutageOverride =
      override && (
        Array.isArray(override.outageDivisionIds) ||
        Array.isArray(override.outageSources)
      );
    const hasOutageOverride =
      Boolean(hasOutageSelectionsOverride || hasLegacyOutageOverride);

    const outageSelections = hasOutageSelectionsOverride
      ? normalizeOutageSelections(override.outageSelections)
      : [];
    const legacyOutageDivisionIds = Array.isArray(override?.outageDivisionIds)
      ? normalizeIds(override.outageDivisionIds)
      : [];

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
      outageDivisionIds: hasOutageSelectionsOverride
        ? outageSelections.map((selection) => selection.divisionId)
        : legacyOutageDivisionIds,
      outageSelections,
      outageSelectionMode: hasOutageSelectionsOverride
        ? "roles"
        : hasLegacyOutageOverride
          ? "legacy"
          : "none",
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
  selections,
  actor
}) {
  const unit = await getDispatcherUnitRuntime(
    String(unitId || "").trim()
  );

  if (!unit) {
    throw new Error("РЭС/район не найден");
  }

  const overrides = await readOverrides();
  const hasSelections = Array.isArray(selections);
  const cleanSelections = hasSelections
    ? normalizeOutageSelections(selections)
    : [];
  const cleanDivisionIds = hasSelections
    ? cleanSelections.map((selection) => selection.divisionId)
    : normalizeIds(divisionIds);

  overrides[unit.id] = {
    ...(overrides[unit.id] || {}),
    outageDivisionIds: cleanDivisionIds,
    ...(hasSelections
      ? { outageSelections: cleanSelections }
      : {}),
    outageUpdatedAt: new Date().toISOString(),
    outageUpdatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  };

  if (!hasSelections) {
    delete overrides[unit.id].outageSelections;
  }

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
  delete current.outageSelections;
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
