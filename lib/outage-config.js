import crypto from "node:crypto";

import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const CONFIG_KEY =
  "lenenergo:max-mini-app:outages:division-config-v2";

const DEFAULT_DIVISIONS = [
  { id: "ves", name: "ВЭС" },
  { id: "gtes", name: "ГтЭС" },
  { id: "yues", name: "ЮЭС" },
  { id: "ses", name: "СЭС" },
  { id: "thes", name: "ТхЭС" },
  { id: "ks", name: "КС" },
  { id: "nles", name: "НлЭС" },
  { id: "knes", name: "КнЭС" },
  { id: "yuvvr", name: "ЮВВР" },
  { id: "svvr", name: "СВВР" },
  { id: "vvvr", name: "ВВВР" },
  { id: "tsvvr", name: "ЦВВР" },
  { id: "os", name: "ОС" },
  { id: "volkhov", name: "Волхов" }
].map((item) => ({
  ...item,
  sources: [],
  builtin: true,
  createdAt: null,
  updatedAt: null,
  updatedBy: null
}));

function safeParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function migrateOutageSource(value) {
  const text = String(value || "").trim();
  const normalized = text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");

  if (
    normalized === "[без shiftroles]" ||
    normalized === "без shiftroles" ||
    normalized === "[без department.name]" ||
    normalized === "без department.name" ||
    normalized === "без департамента" ||
    normalized === "не принявшие смену"
  ) {
    return "Не принявшие смену";
  }

  return text;
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];

  return [
    ...new Set(
      sources
        .map(migrateOutageSource)
        .filter(Boolean)
        .slice(0, 100)
    )
  ];
}

function normalizeName(name) {
  const value = String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);

  const normalized = value
    .toLowerCase()
    .replace(/ё/g, "е");

  if (
    normalized === "без департамента" ||
    normalized === "без department.name" ||
    normalized === "[без department.name]" ||
    normalized === "без shiftroles" ||
    normalized === "[без shiftroles]"
  ) {
    return "Не принявшие смену";
  }

  return value;
}

function cloneDefaults() {
  return DEFAULT_DIVISIONS.map((item) => ({
    ...item,
    sources: [...item.sources]
  }));
}

function normalizeDivision(value) {
  const id = String(value?.id || "").trim();
  const name = normalizeName(value?.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    sources: normalizeSources(value?.sources),
    builtin: Boolean(value?.builtin),
    createdAt: value?.createdAt || null,
    updatedAt: value?.updatedAt || null,
    updatedBy: value?.updatedBy || null
  };
}

async function readState() {
  if (!isRuntimeStoreConfigured()) {
    return {
      divisions: cloneDefaults(),
      persisted: false
    };
  }

  try {
    const raw = await redisCommand("GET", CONFIG_KEY);
    const parsed = safeParse(raw, null);

    if (!parsed || !Array.isArray(parsed.divisions)) {
      return {
        divisions: cloneDefaults(),
        persisted: false
      };
    }

    const divisions = parsed.divisions
      .map(normalizeDivision)
      .filter(Boolean);

    return {
      divisions,
      persisted: true
    };
  } catch (error) {
    console.error("Не удалось загрузить конфигурацию аварийных отключений:", error);
    return {
      divisions: cloneDefaults(),
      persisted: false
    };
  }
}

async function writeDivisions(divisions) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error("Хранилище состояния не подключено");
  }

  await redisCommand(
    "SET",
    CONFIG_KEY,
    JSON.stringify({
      version: 2,
      divisions,
      updatedAt: new Date().toISOString()
    })
  );
}

function actorInfo(actor) {
  return {
    username: String(actor?.username || ""),
    fullName: String(actor?.fullName || "")
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "division";
}

export async function getOutageDivisions() {
  const state = await readState();
  return state.divisions;
}

export async function createOutageDivision({
  name,
  sources = [],
  actor
}) {
  const cleanName = normalizeName(name);

  if (!cleanName) {
    throw new Error("Укажите название подразделения");
  }

  const state = await readState();
  const now = new Date().toISOString();
  const id =
    `outage-${slugify(cleanName)}-${crypto.randomUUID().slice(0, 8)}`;

  const division = {
    id,
    name: cleanName,
    sources: normalizeSources(sources),
    builtin: false,
    createdAt: now,
    updatedAt: now,
    updatedBy: actorInfo(actor)
  };

  const divisions = [
    ...state.divisions,
    division
  ];

  await writeDivisions(divisions);
  return division;
}

export async function updateOutageDivision({
  divisionId,
  name,
  sources = [],
  actor
}) {
  const id = String(divisionId || "").trim();
  const cleanName = normalizeName(name);

  if (!id) {
    throw new Error("Подразделение не найдено");
  }

  if (!cleanName) {
    throw new Error("Укажите название подразделения");
  }

  const state = await readState();
  const index = state.divisions.findIndex(
    (item) => item.id === id
  );

  if (index < 0) {
    throw new Error("Подразделение не найдено");
  }

  const updated = {
    ...state.divisions[index],
    name: cleanName,
    sources: normalizeSources(sources),
    updatedAt: new Date().toISOString(),
    updatedBy: actorInfo(actor)
  };

  const divisions = [...state.divisions];
  divisions[index] = updated;

  await writeDivisions(divisions);
  return updated;
}

export async function deleteOutageDivision({ divisionId }) {
  const id = String(divisionId || "").trim();
  const state = await readState();
  const exists = state.divisions.some(
    (item) => item.id === id
  );

  if (!exists) {
    throw new Error("Подразделение не найдено");
  }

  await writeDivisions(
    state.divisions.filter(
      (item) => item.id !== id
    )
  );

  return true;
}
