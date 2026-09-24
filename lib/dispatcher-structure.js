import crypto from "node:crypto";

import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

import {
  DISPATCHER_GROUP_REGISTRY,
  DISPATCHER_UNIT_REGISTRY
} from "./dispatcher-registry.js";

const STRUCTURE_KEY =
  "lenenergo:max-mini-app:dispatcher:structure-v1";

function safeParse(value, fallback) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
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

function cleanName(value, maxLength = 80) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function normalizeState(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    deletedGroupIds: [
      ...new Set(
        (Array.isArray(source.deletedGroupIds)
          ? source.deletedGroupIds
          : []
        )
          .map(cleanId)
          .filter(Boolean)
      )
    ],
    deletedUnitIds: [
      ...new Set(
        (Array.isArray(source.deletedUnitIds)
          ? source.deletedUnitIds
          : []
        )
          .map(cleanId)
          .filter(Boolean)
      )
    ],
    customGroups: (Array.isArray(source.customGroups)
      ? source.customGroups
      : []
    )
      .map((group) => ({
        id: cleanId(group?.id),
        name: cleanName(group?.name),
        description: cleanName(group?.description, 160),
        createdAt: group?.createdAt || null,
        createdBy: group?.createdBy || null
      }))
      .filter((group) => group.id && group.name),
    customUnits: (Array.isArray(source.customUnits)
      ? source.customUnits
      : []
    )
      .map((unit) => ({
        id: cleanId(unit?.id),
        groupId: cleanId(unit?.groupId),
        name: cleanName(unit?.name),
        defaultSources: [],
        createdAt: unit?.createdAt || null,
        createdBy: unit?.createdBy || null
      }))
      .filter(
        (unit) =>
          unit.id &&
          unit.groupId &&
          unit.name
      ),
    updatedAt: source.updatedAt || null,
    updatedBy: source.updatedBy || null
  };
}

async function readState() {
  if (!isRuntimeStoreConfigured()) {
    return normalizeState({});
  }

  try {
    const raw = await redisCommand(
      "GET",
      STRUCTURE_KEY
    );

    return normalizeState(
      safeParse(raw, {})
    );
  } catch (error) {
    console.error(
      "Не удалось загрузить структуру диспетчерского интерфейса:",
      error
    );

    return normalizeState({});
  }
}

async function writeState(state, actor) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error(
      "Хранилище состояния не подключено"
    );
  }

  const payload = normalizeState({
    ...state,
    updatedAt: new Date().toISOString(),
    updatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  });

  await redisCommand(
    "SET",
    STRUCTURE_KEY,
    JSON.stringify(payload)
  );

  return payload;
}

function buildEffectiveStructure(state) {
  const deletedGroups =
    new Set(state.deletedGroupIds);
  const deletedUnits =
    new Set(state.deletedUnitIds);

  const groups = [
    ...DISPATCHER_GROUP_REGISTRY
      .filter(
        (group) =>
          !deletedGroups.has(group.id)
      )
      .map((group) => ({
        ...group,
        builtin: true,
        managed: false
      })),
    ...state.customGroups
      .filter(
        (group) =>
          !deletedGroups.has(group.id)
      )
      .map((group) => ({
        ...group,
        builtin: false,
        managed: true
      }))
  ];

  const groupIds =
    new Set(groups.map((group) => group.id));

  const units = [
    ...DISPATCHER_UNIT_REGISTRY
      .filter(
        (unit) =>
          !deletedUnits.has(unit.id) &&
          groupIds.has(unit.groupId)
      )
      .map((unit) => ({
        ...unit,
        defaultSources:
          Array.isArray(unit.defaultSources)
            ? [...unit.defaultSources]
            : [],
        builtin: true,
        managed: false
      })),
    ...state.customUnits
      .filter(
        (unit) =>
          !deletedUnits.has(unit.id) &&
          groupIds.has(unit.groupId)
      )
      .map((unit) => ({
        ...unit,
        defaultSources: [],
        builtin: false,
        managed: true
      }))
  ];

  return {
    groups,
    units,
    state,
    storageConfigured:
      isRuntimeStoreConfigured()
  };
}

export async function getDispatcherStructure() {
  const state = await readState();
  return buildEffectiveStructure(state);
}

export async function getDispatcherGroupRuntime(
  groupId
) {
  const id = cleanId(groupId);
  const { groups } =
    await getDispatcherStructure();

  return (
    groups.find((group) => group.id === id) ||
    null
  );
}

export async function getDispatcherUnitRuntime(
  unitId
) {
  const id = cleanId(unitId);
  const { units } =
    await getDispatcherStructure();

  return (
    units.find((unit) => unit.id === id) ||
    null
  );
}

export async function getDispatcherUnitsForGroupRuntime(
  groupId
) {
  const id = cleanId(groupId);
  const { units } =
    await getDispatcherStructure();

  return units.filter(
    (unit) => unit.groupId === id
  );
}

function makeId(prefix) {
  return (
    `${prefix}-` +
    crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 14)
  );
}

export async function createDispatcherGroup({
  name,
  description = "",
  actor
}) {
  const cleanGroupName = cleanName(name);

  if (!cleanGroupName) {
    throw new Error(
      "Укажите название подразделения"
    );
  }

  const structure =
    await getDispatcherStructure();

  if (
    structure.groups.some(
      (group) =>
        group.name.toLowerCase() ===
        cleanGroupName.toLowerCase()
    )
  ) {
    throw new Error(
      "Подразделение с таким названием уже существует"
    );
  }

  const state = structure.state;
  const now = new Date().toISOString();

  const group = {
    id: makeId("grp"),
    name: cleanGroupName,
    description:
      cleanName(description, 160),
    createdAt: now,
    createdBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  };

  state.customGroups.push(group);
  await writeState(state, actor);

  return {
    ...group,
    builtin: false,
    managed: true
  };
}

export async function deleteDispatcherGroup({
  groupId,
  actor
}) {
  const id = cleanId(groupId);

  if (!id) {
    throw new Error(
      "Не указано подразделение"
    );
  }

  const structure =
    await getDispatcherStructure();

  const group =
    structure.groups.find(
      (item) => item.id === id
    );

  if (!group) {
    throw new Error(
      "Подразделение не найдено"
    );
  }

  const state = structure.state;
  const builtinGroupIds =
    new Set(
      DISPATCHER_GROUP_REGISTRY.map(
        (item) => item.id
      )
    );
  const builtinUnitIds =
    new Set(
      DISPATCHER_UNIT_REGISTRY.map(
        (item) => item.id
      )
    );

  if (builtinGroupIds.has(id)) {
    state.deletedGroupIds.push(id);
  } else {
    state.customGroups =
      state.customGroups.filter(
        (item) => item.id !== id
      );
  }

  const unitIdsInGroup =
    structure.units
      .filter((unit) => unit.groupId === id)
      .map((unit) => unit.id);

  for (const unitId of unitIdsInGroup) {
    if (builtinUnitIds.has(unitId)) {
      state.deletedUnitIds.push(unitId);
    }
  }

  state.customUnits =
    state.customUnits.filter(
      (unit) => unit.groupId !== id
    );

  state.deletedGroupIds =
    [...new Set(state.deletedGroupIds)];
  state.deletedUnitIds =
    [...new Set(state.deletedUnitIds)];

  await writeState(state, actor);
  return true;
}

export async function createDispatcherUnit({
  groupId,
  name,
  actor
}) {
  const id = cleanId(groupId);
  const cleanUnitName = cleanName(name);

  if (!id) {
    throw new Error(
      "Выберите подразделение"
    );
  }

  if (!cleanUnitName) {
    throw new Error(
      "Укажите название РЭС / района"
    );
  }

  const structure =
    await getDispatcherStructure();

  const group =
    structure.groups.find(
      (item) => item.id === id
    );

  if (!group) {
    throw new Error(
      "Подразделение не найдено"
    );
  }

  if (
    structure.units.some(
      (unit) =>
        unit.groupId === id &&
        unit.name.toLowerCase() ===
        cleanUnitName.toLowerCase()
    )
  ) {
    throw new Error(
      "РЭС / район с таким названием уже существует в подразделении"
    );
  }

  const state = structure.state;
  const now = new Date().toISOString();

  const unit = {
    id: makeId("unit"),
    groupId: id,
    name: cleanUnitName,
    defaultSources: [],
    createdAt: now,
    createdBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  };

  state.customUnits.push(unit);
  await writeState(state, actor);

  return {
    ...unit,
    builtin: false,
    managed: true
  };
}

export async function deleteDispatcherUnit({
  unitId,
  actor
}) {
  const id = cleanId(unitId);

  if (!id) {
    throw new Error(
      "Не указан РЭС / район"
    );
  }

  const structure =
    await getDispatcherStructure();

  const unit =
    structure.units.find(
      (item) => item.id === id
    );

  if (!unit) {
    throw new Error(
      "РЭС / район не найден"
    );
  }

  const state = structure.state;
  const builtinIds =
    new Set(
      DISPATCHER_UNIT_REGISTRY.map(
        (item) => item.id
      )
    );

  if (builtinIds.has(id)) {
    state.deletedUnitIds.push(id);
    state.deletedUnitIds =
      [...new Set(state.deletedUnitIds)];
  } else {
    state.customUnits =
      state.customUnits.filter(
        (item) => item.id !== id
      );
  }

  await writeState(state, actor);
  return true;
}
