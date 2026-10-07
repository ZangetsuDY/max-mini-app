import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const CONFIG_KEY =
  "lenenergo:max-mini-app:executive:division-table-config";

function safeParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function cleanText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 120)
    )
  ];
}

function slugify(value) {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return base || "summary";
}

function normalizeRow(row) {
  return {
    id: cleanText(row?.id, 80).toLowerCase(),
    name: cleanText(row?.name, 80),
    description: cleanText(row?.description, 180),
    outageDivisionIds: normalizeIds(row?.outageDivisionIds),
    requestGroupIds: normalizeIds(row?.requestGroupIds),
    workorderGroupIds: normalizeIds(row?.workorderGroupIds),
    unitGroupIds: normalizeIds(row?.unitGroupIds),
    updatedAt: row?.updatedAt || null,
    updatedBy: row?.updatedBy || null
  };
}

async function readRows() {
  if (!isRuntimeStoreConfigured()) return [];

  try {
    const raw = await redisCommand("GET", CONFIG_KEY);
    const parsed = safeParse(raw, []);
    return Array.isArray(parsed)
      ? parsed.map(normalizeRow).filter((row) => row.id && row.name)
      : [];
  } catch (error) {
    console.error("Не удалось загрузить настройку сводных подразделений:", error);
    return [];
  }
}

async function writeRows(rows) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error("Хранилище состояния не подключено");
  }

  await redisCommand(
    "SET",
    CONFIG_KEY,
    JSON.stringify(rows.map(normalizeRow))
  );
}

export async function getExecutiveTableRows() {
  return readRows();
}

export async function createExecutiveTableRow({
  name,
  description,
  outageDivisionIds,
  requestGroupIds,
  workorderGroupIds,
  unitGroupIds,
  actor
}) {
  const cleanName = cleanText(name, 80);
  if (!cleanName) {
    throw new Error("Укажите название сводного подразделения");
  }

  const rows = await readRows();
  const base = slugify(cleanName);
  let id = base;
  let suffix = 2;

  while (rows.some((row) => row.id === id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  rows.push(normalizeRow({
    id,
    name: cleanName,
    description,
    outageDivisionIds,
    requestGroupIds,
    workorderGroupIds,
    unitGroupIds,
    updatedAt: new Date().toISOString(),
    updatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  }));

  await writeRows(rows);
  return rows.find((row) => row.id === id) || null;
}

export async function updateExecutiveTableRow({
  rowId,
  name,
  description,
  outageDivisionIds,
  requestGroupIds,
  workorderGroupIds,
  unitGroupIds,
  actor
}) {
  const id = cleanText(rowId, 80).toLowerCase();
  const cleanName = cleanText(name, 80);
  if (!id) throw new Error("Сводное подразделение не найдено");
  if (!cleanName) throw new Error("Укажите название сводного подразделения");

  const rows = await readRows();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("Сводное подразделение не найдено");

  rows[index] = normalizeRow({
    ...rows[index],
    name: cleanName,
    description,
    outageDivisionIds,
    requestGroupIds,
    workorderGroupIds,
    unitGroupIds,
    updatedAt: new Date().toISOString(),
    updatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  });

  await writeRows(rows);
  return rows[index];
}

export async function deleteExecutiveTableRow({ rowId }) {
  const id = cleanText(rowId, 80).toLowerCase();
  if (!id) throw new Error("Сводное подразделение не найдено");

  const rows = await readRows();
  const next = rows.filter((row) => row.id !== id);
  if (next.length === rows.length) {
    throw new Error("Сводное подразделение не найдено");
  }

  await writeRows(next);
  return true;
}
