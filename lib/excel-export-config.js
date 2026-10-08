import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const CONFIG_KEY =
  "lenenergo:max-mini-app:excel-export:emergency-outages:v1";

export const EXCEL_EXPORT_FIELD_OPTIONS = Object.freeze([
  { id: "pending", name: "Пока не указан", type: "text" },
  { id: "index", name: "№ п/п", type: "number" },
  { id: "divisionName", name: "Подразделение", type: "text" },
  { id: "sourceLabel", name: "Роль / источник", type: "text" },
  { id: "outageId", name: "№ отключения", type: "text" },
  { id: "createdAt", name: "Дата и время создания", type: "text" },
  { id: "createdBy", name: "Создал", type: "text" },
  { id: "equipment", name: "Оборудование", type: "text" },
  { id: "energyObject", name: "Энергообъект", type: "text" },
  { id: "disconnectedObjects", name: "Обесточенные объекты", type: "text" },
  { id: "appeals", name: "Обращения", type: "number" }
]);

const FIELD_IDS = new Set(
  EXCEL_EXPORT_FIELD_OPTIONS.map((item) => item.id)
);

const DEFAULT_COLUMNS = Object.freeze([
  { id: "col-index", field: "index", label: "№ п/п", width: 8, align: "center", fontSize: 10, bold: false, wrap: false, autoWidth: false, autoHeight: false },
  { id: "col-division", field: "divisionName", label: "Подразделение", width: 20, align: "left", fontSize: 10, bold: true, wrap: true, autoWidth: false, autoHeight: false },
  { id: "col-source", field: "sourceLabel", label: "Роль / источник", width: 32, align: "left", fontSize: 10, bold: false, wrap: true, autoWidth: false, autoHeight: false },
  { id: "col-outage", field: "outageId", label: "№ отключения", width: 14, align: "center", fontSize: 10, bold: true, wrap: false, autoWidth: false, autoHeight: false },
  { id: "col-created", field: "createdAt", label: "Создано", width: 20, align: "center", fontSize: 10, bold: false, wrap: true, autoWidth: false, autoHeight: false },
  { id: "col-equipment", field: "equipment", label: "Оборудование", width: 28, align: "left", fontSize: 10, bold: false, wrap: true, autoWidth: false, autoHeight: false },
  { id: "col-energy", field: "energyObject", label: "Энергообъект", width: 28, align: "left", fontSize: 10, bold: false, wrap: true, autoWidth: false, autoHeight: false },
  { id: "col-objects", field: "disconnectedObjects", label: "Обесточенные объекты", width: 38, align: "left", fontSize: 10, bold: false, wrap: true, autoWidth: false, autoHeight: false },
  { id: "col-appeals", field: "appeals", label: "Обращения", width: 12, align: "center", fontSize: 10, bold: true, wrap: false, autoWidth: false, autoHeight: false }
]);

export const DEFAULT_EMERGENCY_EXCEL_CONFIG = Object.freeze({
  version: 1,
  name: "Аварийные отключения",
  sheetName: "Аварийные отключения",
  fileName: "Аварийные_отключения",
  title: "Аварийные отключения",
  subtitle: "Оперативная выгрузка СК-11 OMS",
  tableStartRow: 5,
  showGeneratedAt: true,
  showSourceUpdatedAt: true,
  freezeHeader: true,
  autoFilter: true,
  includeDivisionIds: [],
  titleStyle: {
    fontSize: 16,
    bold: true,
    color: "#FFFFFF",
    fill: "#12334A",
    align: "left",
    rowHeight: 28
  },
  headerStyle: {
    fontSize: 10,
    bold: true,
    color: "#15100A",
    fill: "#D6A446",
    align: "center",
    rowHeight: 24
  },
  bodyStyle: {
    fontSize: 10,
    color: "#17212B",
    fill: "#FFFFFF",
    alternateFill: "#F3F7F9",
    rowHeight: 24
  },
  columns: DEFAULT_COLUMNS
});

function safeParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function cleanText(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function cleanColor(value, fallback) {
  const color = String(value || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(color) ? color : fallback;
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeAlign(value, fallback = "left") {
  return ["left", "center", "right"].includes(value) ? value : fallback;
}

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 100)
    )
  ];
}

function normalizeStyle(style, fallback, kind) {
  const base = fallback || {};
  return {
    fontSize: boundedNumber(style?.fontSize, base.fontSize || 10, 7, 28),
    ...(kind !== "body" ? { bold: Boolean(style?.bold ?? base.bold) } : {}),
    color: cleanColor(style?.color, base.color || "#17212B"),
    fill: cleanColor(style?.fill, base.fill || "#FFFFFF"),
    ...(kind === "body"
      ? {
          alternateFill: cleanColor(
            style?.alternateFill,
            base.alternateFill || "#F3F7F9"
          )
        }
      : {}),
    ...(kind !== "body"
      ? { align: normalizeAlign(style?.align, base.align || "left") }
      : {}),
    rowHeight: boundedNumber(style?.rowHeight, base.rowHeight || 24, 14, 60)
  };
}

function normalizeColumn(column, index) {
  const field = FIELD_IDS.has(String(column?.field || ""))
    ? String(column.field)
    : "pending";
  const defaultField = EXCEL_EXPORT_FIELD_OPTIONS.find((item) => item.id === field);

  return {
    id: cleanText(column?.id, 80) || `column-${index + 1}`,
    field,
    label: cleanText(column?.label, 80) || defaultField?.name || "Столбец",
    width: boundedNumber(column?.width, 18, 6, 60),
    align: normalizeAlign(column?.align, defaultField?.type === "number" ? "center" : "left"),
    fontSize: boundedNumber(column?.fontSize, 10, 7, 20),
    bold: Boolean(column?.bold),
    wrap: Boolean(column?.wrap ?? true),
    autoWidth: Boolean(column?.autoWidth),
    autoHeight: Boolean(column?.autoHeight)
  };
}

export function normalizeEmergencyExcelConfig(value) {
  const defaults = DEFAULT_EMERGENCY_EXCEL_CONFIG;
  const rawColumns = Array.isArray(value?.columns) ? value.columns : defaults.columns;
  const columns = rawColumns
    .slice(0, 100)
    .map(normalizeColumn)
    .filter((column) => column.field && column.label);

  return {
    version: 1,
    name: cleanText(value?.name, 80) || defaults.name,
    sheetName: cleanText(value?.sheetName, 31).replace(/[\\/*?:\[\]]/g, " ") || defaults.sheetName,
    fileName: cleanText(value?.fileName, 80).replace(/[<>:"/\\|?*]+/g, "_") || defaults.fileName,
    title: cleanText(value?.title, 160) || defaults.title,
    subtitle: cleanText(value?.subtitle, 200),
    tableStartRow: Math.round(boundedNumber(value?.tableStartRow, defaults.tableStartRow, 4, 20)),
    showGeneratedAt: Boolean(value?.showGeneratedAt ?? defaults.showGeneratedAt),
    showSourceUpdatedAt: Boolean(value?.showSourceUpdatedAt ?? defaults.showSourceUpdatedAt),
    freezeHeader: Boolean(value?.freezeHeader ?? defaults.freezeHeader),
    autoFilter: Boolean(value?.autoFilter ?? defaults.autoFilter),
    includeDivisionIds: normalizeIds(value?.includeDivisionIds),
    titleStyle: normalizeStyle(value?.titleStyle, defaults.titleStyle, "title"),
    headerStyle: normalizeStyle(value?.headerStyle, defaults.headerStyle, "header"),
    bodyStyle: normalizeStyle(value?.bodyStyle, defaults.bodyStyle, "body"),
    columns: columns.length ? columns : defaults.columns.map(normalizeColumn),
    updatedAt: value?.updatedAt || null,
    updatedBy: value?.updatedBy || null
  };
}

export async function getEmergencyExcelConfig() {
  if (!isRuntimeStoreConfigured()) {
    return {
      ...normalizeEmergencyExcelConfig(DEFAULT_EMERGENCY_EXCEL_CONFIG),
      storageConfigured: false
    };
  }

  try {
    const raw = await redisCommand("GET", CONFIG_KEY);
    const parsed = safeParse(raw, null);
    return {
      ...normalizeEmergencyExcelConfig(parsed || DEFAULT_EMERGENCY_EXCEL_CONFIG),
      storageConfigured: true
    };
  } catch (error) {
    console.error("Не удалось загрузить шаблон Excel:", error);
    return {
      ...normalizeEmergencyExcelConfig(DEFAULT_EMERGENCY_EXCEL_CONFIG),
      storageConfigured: true,
      loadError: true
    };
  }
}

export async function saveEmergencyExcelConfig({ config, actor }) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error("Хранилище состояния не подключено");
  }

  const normalized = normalizeEmergencyExcelConfig({
    ...(config || {}),
    updatedAt: new Date().toISOString(),
    updatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  });

  await redisCommand("SET", CONFIG_KEY, JSON.stringify(normalized));
  return {
    ...normalized,
    storageConfigured: true
  };
}
