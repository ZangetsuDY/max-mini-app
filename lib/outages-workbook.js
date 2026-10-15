/*
  Полная выгрузка аварийных и плановых отключений в одну книгу Excel:
  «Сводка», «Аварийные», «Плановые». Используется Центром управления.
*/
import { getOutageDivisions } from "./outage-config.js";
import {
  getLatestOutageSnapshot as getLatestEmergencyOutageSnapshot,
  normalizeOutageSourceLabel
} from "./outage-data.js";
import {
  getLatestOutageSnapshot as getLatestPlannedOutageSnapshot
} from "./planned-outage-data.js";
import {
  zipStore,
  xmlEscape,
  colName,
  safeSpreadsheetText,
  textDisplayWidth
} from "./xlsx-export.js";

const UNMAPPED_DIVISION = "Без привязки к подразделению";
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Данные                                                              */
/* ------------------------------------------------------------------ */

/*
  «Создано» приходит текстом из сводки СК-11 OMS. Поддерживаем
  ДД.ММ.ГГГГ ЧЧ:ММ[:СС], ГГГГ-ММ-ДД ЧЧ:ММ[:СС] и ISO. Время без
  часового пояса считаем московским. Возвращает UTC-миллисекунды или null.
*/
export function parseOutageDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  let match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    return Date.UTC(year, Number(match[2]) - 1, Number(match[1]),
      Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)) - MSK_OFFSET_MS;
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (match) {
    if (match[7]) {
      const parsed = Date.parse(text.replace(" ", "T"));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]),
      Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)) - MSK_OFFSET_MS;
  }

  return null;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days} д ${hours} ч ${minutes} мин`;
  if (hours) return `${hours} ч ${minutes} мин`;
  return `${minutes} мин`;
}

function formatMsk(date) {
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function buildKindDataset(kind, sourceState, divisions, generatedAt) {
  const snapshot = sourceState?.snapshot || null;
  const divisionsBySource = new Map();

  for (const division of divisions) {
    for (const source of Array.isArray(division?.sources) ? division.sources : []) {
      const key = normalizeOutageSourceLabel(source);
      if (!key) continue;
      const list = divisionsBySource.get(key) || [];
      if (!list.some((item) => item.id === division.id)) list.push(division);
      divisionsBySource.set(key, list);
    }
  }

  const rows = [];
  const seen = new Set();
  const sourceRows = Array.isArray(snapshot?.rowList) ? snapshot.rowList : [];

  for (const sourceRow of sourceRows) {
    const sourceKey = normalizeOutageSourceLabel(sourceRow?.label);
    const owners = divisionsBySource.get(sourceKey) || [];
    const divisionName = owners.length
      ? owners.map((item) => String(item.name || "")).join(" / ")
      : UNMAPPED_DIVISION;
    const divisionOrder = owners.length
      ? Math.min(...owners.map((item) => divisions.indexOf(item)))
      : Number.MAX_SAFE_INTEGER;

    for (const outage of Array.isArray(sourceRow?.outages) ? sourceRow.outages : []) {
      const identity = `${sourceKey}|${outage?.id || ""}|${outage?.createdAt || ""}`;
      if (seen.has(identity)) continue;
      seen.add(identity);

      const objects = Array.isArray(outage?.disconnectedObjects)
        ? outage.disconnectedObjects.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const createdMs = parseOutageDate(outage?.createdAt);

      rows.push({
        kind,
        divisionName,
        divisionOrder,
        mapped: owners.length > 0,
        sourceLabel: String(sourceRow?.label || ""),
        outageId: String(outage?.id || ""),
        createdAtText: String(outage?.createdAt || ""),
        createdMs,
        elapsed: createdMs === null ? "" : formatDuration(generatedAt.getTime() - createdMs),
        createdBy: String(outage?.createdBy || ""),
        equipment: String(outage?.equipment || ""),
        energyObject: String(outage?.energyObject || ""),
        objects,
        appeals: Number(outage?.appeals || 0)
      });
    }
  }

  rows.sort((a, b) =>
    a.divisionOrder - b.divisionOrder ||
    a.divisionName.localeCompare(b.divisionName, "ru") ||
    a.sourceLabel.localeCompare(b.sourceLabel, "ru") ||
    (a.createdMs ?? Infinity) - (b.createdMs ?? Infinity) ||
    a.outageId.localeCompare(b.outageId, "ru", { numeric: true })
  );

  return {
    kind,
    rows,
    status: {
      configured: Boolean(sourceState?.configured),
      status: String(sourceState?.status || ""),
      message: String(sourceState?.message || ""),
      stale: Boolean(sourceState?.stale),
      sourceUpdatedAt: String(snapshot?.sourceUpdatedAt || ""),
      reportedTotal: snapshot
        ? Number(snapshot.reportedTotal ?? snapshot.plannedTotal ?? snapshot.emergencyTotal ?? rows.length)
        : null
    }
  };
}

export async function getOutagesWorkbookDataset(generatedAt = new Date()) {
  const [divisions, emergencyState, plannedState] = await Promise.all([
    getOutageDivisions(),
    getLatestEmergencyOutageSnapshot(),
    getLatestPlannedOutageSnapshot()
  ]);

  return {
    generatedAt,
    divisions,
    emergency: buildKindDataset("emergency", emergencyState, divisions, generatedAt),
    planned: buildKindDataset("planned", plannedState, divisions, generatedAt)
  };
}

/* ------------------------------------------------------------------ */
/* Оформление                                                          */
/* ------------------------------------------------------------------ */

const C = {
  navy: "12334A",
  gold: "D6A446",
  ink: "17212B",
  muted: "5B6B7A",
  line: "D3DCE3",
  zebra: "F3F7F9",
  band: "E6EDF2",
  white: "FFFFFF",
  red: "B83A3A",
  redSoft: "FBEAEA",
  blue: "2C6496",
  blueSoft: "E7F0F8"
};

function font({ size = 10, bold = false, italic = false, color = C.ink } = {}) {
  return `<font>${bold ? "<b/>" : ""}${italic ? "<i/>" : ""}<sz val="${size}"/><color rgb="FF${color}"/><name val="Calibri"/><family val="2"/></font>`;
}

function fill(color) {
  return `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`;
}

/*
  Стили собираются один раз: каждый ключ — сочетание шрифта, заливки,
  выравнивания, рамки и формата числа.
*/
function createStyleSheet() {
  const fonts = [font({ size: 11 })];
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>'
  ];
  const borders = [
    "<border><left/><right/><top/><bottom/><diagonal/></border>",
    `<border><left style="thin"><color rgb="FF${C.line}"/></left><right style="thin"><color rgb="FF${C.line}"/></right><top style="thin"><color rgb="FF${C.line}"/></top><bottom style="thin"><color rgb="FF${C.line}"/></bottom><diagonal/></border>`,
    `<border><left style="thin"><color rgb="FF${C.line}"/></left><right style="thin"><color rgb="FF${C.line}"/></right><top style="medium"><color rgb="FF${C.navy}"/></top><bottom style="medium"><color rgb="FF${C.navy}"/></bottom><diagonal/></border>`
  ];
  const numFmts = [
    '<numFmt numFmtId="164" formatCode="dd.mm.yyyy hh:mm"/>',
    '<numFmt numFmtId="165" formatCode="#,##0"/>'
  ];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const ids = {};
  const fontIds = new Map();
  const fillIds = new Map();

  const fontId = (spec) => {
    const xml = font(spec);
    if (!fontIds.has(xml)) {
      fontIds.set(xml, fonts.length);
      fonts.push(xml);
    }
    return fontIds.get(xml);
  };

  const fillId = (color) => {
    if (!color) return 0;
    if (!fillIds.has(color)) {
      fillIds.set(color, fills.length);
      fills.push(fill(color));
    }
    return fillIds.get(color);
  };

  const add = (name, { font: fontSpec = {}, fill: fillColor = "", align = "left", valign = "center", wrap = false, border = 1, numFmt = 0, indent = 0 } = {}) => {
    ids[name] = xfs.length;
    xfs.push(
      `<xf numFmtId="${numFmt}" fontId="${fontId(fontSpec)}" fillId="${fillId(fillColor)}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${numFmt ? ' applyNumberFormat="1"' : ""}>` +
      `<alignment horizontal="${align}" vertical="${valign}" wrapText="${wrap ? 1 : 0}"${indent ? ` indent="${indent}"` : ""}/></xf>`
    );
  };

  add("title", { font: { size: 16, bold: true, color: C.white }, fill: C.navy, border: 0, indent: 1 });
  add("titleBand", { fill: C.navy, border: 0 });
  add("subtitle", { font: { size: 10, color: C.muted }, border: 0, indent: 1 });
  add("meta", { font: { size: 9, italic: true, color: C.muted }, border: 0, indent: 1 });
  add("warning", { font: { size: 9, bold: true, color: C.red }, border: 0, indent: 1, wrap: true });
  add("section", { font: { size: 12, bold: true, color: C.navy }, border: 0 });
  add("header", { font: { size: 10, bold: true, color: "15100A" }, fill: C.gold, align: "center", wrap: true });

  for (const [suffix, bg] of [["", C.white], ["Alt", C.zebra]]) {
    add(`text${suffix}`, { fill: bg, wrap: true, valign: "top" });
    add(`textBold${suffix}`, { font: { bold: true }, fill: bg, wrap: true, valign: "top" });
    add(`center${suffix}`, { fill: bg, align: "center", valign: "top", wrap: true });
    add(`id${suffix}`, { font: { bold: true, color: C.navy }, fill: bg, align: "center", valign: "top" });
    add(`date${suffix}`, { fill: bg, align: "center", valign: "top", numFmt: 164 });
    add(`num${suffix}`, { fill: bg, align: "center", valign: "top", numFmt: 165 });
    add(`numBold${suffix}`, { font: { bold: true }, fill: bg, align: "center", valign: "top", numFmt: 165 });
    add(`muted${suffix}`, { font: { italic: true, color: C.muted }, fill: bg, wrap: true, valign: "top" });
  }

  add("totalLabel", { font: { bold: true, color: C.navy }, fill: C.band, border: 2 });
  add("totalNum", { font: { bold: true, color: C.navy }, fill: C.band, align: "center", border: 2, numFmt: 165 });
  add("totalBlank", { fill: C.band, border: 2 });

  add("kpiLabel", { font: { bold: true }, fill: C.zebra });
  add("kpiEmergency", { font: { size: 14, bold: true, color: C.red }, fill: C.redSoft, align: "center", numFmt: 165 });
  add("kpiPlanned", { font: { size: 14, bold: true, color: C.blue }, fill: C.blueSoft, align: "center", numFmt: 165 });
  add("kpiTotal", { font: { size: 14, bold: true, color: C.navy }, fill: C.band, align: "center", numFmt: 165 });
  add("kpiText", { fill: C.white, align: "center", wrap: true });
  add("headEmergency", { font: { size: 10, bold: true, color: C.white }, fill: C.red, align: "center", wrap: true });
  add("headPlanned", { font: { size: 10, bold: true, color: C.white }, fill: C.blue, align: "center", wrap: true });
  add("headTotal", { font: { size: 10, bold: true, color: C.white }, fill: C.navy, align: "center", wrap: true });

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="${numFmts.length}">${numFmts.join("")}</numFmts>
<fonts count="${fonts.length}">${fonts.join("")}</fonts>
<fills count="${fills.length}">${fills.join("")}</fills>
<borders count="${borders.length}">${borders.join("")}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  return { xml, ids };
}

/* ------------------------------------------------------------------ */
/* Лист                                                                */
/* ------------------------------------------------------------------ */

function excelSerial(utcMs) {
  // Excel хранит дату как число дней с 1899-12-30 (в «настенном» МСК-времени).
  return (utcMs + MSK_OFFSET_MS) / 86400000 + 25569;
}

class Sheet {
  constructor(name, styles) {
    this.name = name;
    this.s = styles.ids;
    this.rows = new Map();
    this.heights = new Map();
    this.merges = [];
    this.widths = [];
    this.freezeRow = 0;
    this.filter = "";
    this.landscape = true;
  }

  cell(row, col, value, style, type = "text") {
    const ref = `${colName(col)}${row}`;
    const styleId = this.s[style] ?? 0;
    let xml;
    if (value === null || value === undefined || value === "") {
      xml = `<c r="${ref}" s="${styleId}"/>`;
    } else if (type === "number" && Number.isFinite(Number(value))) {
      xml = `<c r="${ref}" s="${styleId}"><v>${Number(value)}</v></c>`;
    } else {
      xml = `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(safeSpreadsheetText(value))}</t></is></c>`;
    }
    const cells = this.rows.get(row) || new Map();
    cells.set(col, xml);
    this.rows.set(row, cells);
  }

  height(row, value) {
    this.heights.set(row, value);
  }

  merge(fromRow, fromCol, toRow, toCol) {
    this.merges.push(`${colName(fromCol)}${fromRow}:${colName(toCol)}${toRow}`);
  }

  xml() {
    const rowNumbers = [...new Set([...this.rows.keys(), ...this.heights.keys()])].sort((a, b) => a - b);
    const rowsXml = rowNumbers.map((row) => {
      const cells = this.rows.get(row) || new Map();
      const cellXml = [...cells.entries()].sort((a, b) => a[0] - b[0]).map(([, xml]) => xml).join("");
      const height = this.heights.get(row);
      return `<row r="${row}"${height ? ` ht="${height}" customHeight="1"` : ""}>${cellXml}</row>`;
    }).join("");

    const cols = this.widths.map((width, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    ).join("");

    const view = this.freezeRow
      ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="100"><pane ySplit="${this.freezeRow}" topLeftCell="A${this.freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      : `<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>${view}<sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${rowsXml}</sheetData>${this.filter ? `<autoFilter ref="${this.filter}"/>` : ""}${this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : ""}<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.45" bottom="0.45" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="${this.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  }
}

function writeHeaderBlock(sheet, { title, subtitle, meta, warnings, lastCol }) {
  sheet.cell(1, 0, title, "title");
  for (let col = 1; col <= lastCol; col += 1) sheet.cell(1, col, "", "titleBand");
  sheet.merge(1, 0, 1, lastCol);
  sheet.height(1, 30);

  sheet.cell(2, 0, subtitle, "subtitle");
  sheet.merge(2, 0, 2, lastCol);
  sheet.height(2, 18);

  sheet.cell(3, 0, meta, "meta");
  sheet.merge(3, 0, 3, lastCol);
  sheet.height(3, 16);

  let row = 4;
  for (const warning of warnings) {
    sheet.cell(row, 0, warning, "warning");
    sheet.merge(row, 0, row, lastCol);
    sheet.height(row, 18);
    row += 1;
  }
  return row + 1;
}

function sourceWarnings(label, status) {
  const warnings = [];
  if (!status.configured) {
    warnings.push(`${label}: источник данных не настроен.`);
  } else if (status.reportedTotal === null) {
    warnings.push(`${label}: не удалось получить сводку${status.message ? ` — ${status.message}` : ""}.`);
  } else if (status.stale) {
    warnings.push(`${label}: показаны последние сохранённые данные, источник сейчас недоступен.`);
  }
  return warnings;
}

const DETAIL_COLUMNS = [
  { label: "№ п/п", width: 7 },
  { label: "Подразделение", width: 22 },
  { label: "РЭС / роль-источник", width: 30 },
  { label: "№ отключения", width: 13 },
  { label: "Создано", width: 16 },
  { label: "Прошло с создания", width: 15 },
  { label: "Создал", width: 22 },
  { label: "Оборудование", width: 30 },
  { label: "Энергообъект", width: 28 },
  { label: "Обесточенные объекты", width: 44 },
  { label: "Кол-во объектов", width: 10 },
  { label: "Обращения", width: 11 }
];

function estimateLines(text, width) {
  const value = String(text || "");
  if (!value) return 1;
  const perLine = Math.max(6, Math.floor(width * 1.05));
  return value.split("\n").reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(textDisplayWidth(line) / perLine)),
    0
  );
}

function buildDetailSheet(styles, dataset, { name, title, generatedAt }) {
  const sheet = new Sheet(name, styles);
  const lastCol = DETAIL_COLUMNS.length - 1;
  const label = dataset.kind === "planned" ? "Плановые отключения" : "Аварийные отключения";
  sheet.widths = DETAIL_COLUMNS.map((column) => column.width);

  const metaBits = [`Сформировано: ${formatMsk(generatedAt)} МСК`];
  if (dataset.status.sourceUpdatedAt) metaBits.push(`Сводка СК-11 OMS: ${dataset.status.sourceUpdatedAt}`);
  metaBits.push(`Отключений в выгрузке: ${dataset.rows.length}`);

  const headerRow = writeHeaderBlock(sheet, {
    title,
    subtitle: "ПАО «Россети Ленэнерго» · СК-11 OMS · все активные отключения по всем подразделениям",
    meta: metaBits.join(" · "),
    warnings: sourceWarnings(label, dataset.status),
    lastCol
  });

  DETAIL_COLUMNS.forEach((column, index) => sheet.cell(headerRow, index, column.label, "header"));
  sheet.height(headerRow, 32);
  sheet.freezeRow = headerRow;

  if (!dataset.rows.length) {
    const row = headerRow + 1;
    sheet.cell(row, 0, "Активных отключений нет", "muted");
    for (let col = 1; col <= lastCol; col += 1) sheet.cell(row, col, "", "muted");
    sheet.merge(row, 0, row, lastCol);
    sheet.height(row, 22);
    return sheet;
  }

  dataset.rows.forEach((item, index) => {
    const row = headerRow + 1 + index;
    const alt = index % 2 === 1 ? "Alt" : "";
    const objectsText = item.objects.join("\n");

    sheet.cell(row, 0, index + 1, `center${alt}`, "number");
    sheet.cell(row, 1, item.divisionName, item.mapped ? `textBold${alt}` : `muted${alt}`);
    sheet.cell(row, 2, item.sourceLabel, `text${alt}`);
    sheet.cell(row, 3, item.outageId ? `№${item.outageId}` : "", `id${alt}`);
    if (item.createdMs !== null) {
      sheet.cell(row, 4, excelSerial(item.createdMs), `date${alt}`, "number");
    } else {
      sheet.cell(row, 4, item.createdAtText, `center${alt}`);
    }
    sheet.cell(row, 5, item.elapsed, `center${alt}`);
    sheet.cell(row, 6, item.createdBy, `text${alt}`);
    sheet.cell(row, 7, item.equipment, `text${alt}`);
    sheet.cell(row, 8, item.energyObject, `text${alt}`);
    sheet.cell(row, 9, objectsText, `text${alt}`);
    sheet.cell(row, 10, item.objects.length, `num${alt}`, "number");
    sheet.cell(row, 11, item.appeals, `numBold${alt}`, "number");

    const lines = Math.max(
      estimateLines(item.divisionName, DETAIL_COLUMNS[1].width),
      estimateLines(item.sourceLabel, DETAIL_COLUMNS[2].width),
      estimateLines(item.createdBy, DETAIL_COLUMNS[6].width),
      estimateLines(item.equipment, DETAIL_COLUMNS[7].width),
      estimateLines(item.energyObject, DETAIL_COLUMNS[8].width),
      estimateLines(objectsText, DETAIL_COLUMNS[9].width)
    );
    sheet.height(row, Math.min(409, Math.max(20, lines * 13.5 + 6)));
  });

  const lastDataRow = headerRow + dataset.rows.length;
  const totalRow = lastDataRow + 1;
  sheet.cell(totalRow, 0, "", "totalBlank");
  sheet.cell(totalRow, 1, `Итого: ${dataset.rows.length} отключ.`, "totalLabel");
  for (let col = 2; col <= 9; col += 1) sheet.cell(totalRow, col, "", "totalBlank");
  sheet.cell(totalRow, 10, dataset.rows.reduce((sum, item) => sum + item.objects.length, 0), "totalNum", "number");
  sheet.cell(totalRow, 11, dataset.rows.reduce((sum, item) => sum + item.appeals, 0), "totalNum", "number");
  sheet.height(totalRow, 22);

  sheet.filter = `A${headerRow}:${colName(lastCol)}${lastDataRow}`;
  return sheet;
}

function summarizeByDivision(dataset) {
  const map = new Map();
  for (const item of dataset.rows) {
    const entry = map.get(item.divisionName) || { count: 0, appeals: 0, objects: 0 };
    entry.count += 1;
    entry.appeals += item.appeals;
    entry.objects += item.objects.length;
    map.set(item.divisionName, entry);
  }
  return map;
}

function buildSummarySheet(styles, data) {
  const sheet = new Sheet("Сводка", styles);
  sheet.landscape = false;
  sheet.widths = [34, 14, 14, 14, 14, 14, 14, 14];
  const lastCol = 7;
  const { emergency, planned, generatedAt } = data;

  const warnings = [
    ...sourceWarnings("Аварийные", emergency.status),
    ...sourceWarnings("Плановые", planned.status)
  ];

  let row = writeHeaderBlock(sheet, {
    title: "Отключения · аварийные и плановые",
    subtitle: "ПАО «Россети Ленэнерго» · сводная выгрузка Центра управления Mini App",
    meta: `Сформировано: ${formatMsk(generatedAt)} МСК`,
    warnings,
    lastCol
  });

  // KPI
  sheet.cell(row, 0, "ОБЩИЕ ПОКАЗАТЕЛИ", "section");
  sheet.height(row, 20);
  row += 1;
  sheet.cell(row, 0, "Показатель", "header");
  sheet.cell(row, 1, "Аварийные", "headEmergency");
  sheet.cell(row, 2, "Плановые", "headPlanned");
  sheet.cell(row, 3, "Всего", "headTotal");
  sheet.height(row, 24);
  row += 1;

  const sum = (dataset, pick) => dataset.rows.reduce((acc, item) => acc + pick(item), 0);
  const divisionsWith = (dataset) => new Set(dataset.rows.filter((item) => item.mapped).map((item) => item.divisionName)).size;
  const kpis = [
    ["Активных отключений", emergency.rows.length, planned.rows.length],
    ["Обращений", sum(emergency, (item) => item.appeals), sum(planned, (item) => item.appeals)],
    ["Обесточенных объектов", sum(emergency, (item) => item.objects.length), sum(planned, (item) => item.objects.length)],
    ["Подразделений с отключениями", divisionsWith(emergency), divisionsWith(planned)]
  ];

  for (const [label, emergencyValue, plannedValue] of kpis) {
    sheet.cell(row, 0, label, "kpiLabel");
    sheet.cell(row, 1, emergencyValue, "kpiEmergency", "number");
    sheet.cell(row, 2, plannedValue, "kpiPlanned", "number");
    sheet.cell(row, 3, emergencyValue + plannedValue, "kpiTotal", "number");
    sheet.height(row, 26);
    row += 1;
  }

  sheet.cell(row, 0, "Сводка СК-11 OMS обновлена", "kpiLabel");
  sheet.cell(row, 1, emergency.status.sourceUpdatedAt || "—", "kpiText");
  sheet.cell(row, 2, planned.status.sourceUpdatedAt || "—", "kpiText");
  sheet.cell(row, 3, "", "kpiText");
  sheet.height(row, 22);
  row += 2;

  // По подразделениям
  sheet.cell(row, 0, "ПО ПОДРАЗДЕЛЕНИЯМ", "section");
  sheet.height(row, 20);
  row += 1;
  const head = [
    ["Подразделение", "header"],
    ["Аварийные", "headEmergency"],
    ["Обращения", "headEmergency"],
    ["Обесточ. объекты", "headEmergency"],
    ["Плановые", "headPlanned"],
    ["Обращения", "headPlanned"],
    ["Обесточ. объекты", "headPlanned"],
    ["Всего отключений", "headTotal"]
  ];
  head.forEach(([text, style], col) => sheet.cell(row, col, text, style));
  sheet.height(row, 30);
  const tableHeader = row;
  row += 1;

  const emergencyByDivision = summarizeByDivision(emergency);
  const plannedByDivision = summarizeByDivision(planned);
  const names = data.divisions.map((division) => String(division.name || ""));
  for (const name of [...emergencyByDivision.keys(), ...plannedByDivision.keys()]) {
    if (!names.includes(name)) names.push(name);
  }

  const empty = { count: 0, appeals: 0, objects: 0 };
  const totals = new Array(7).fill(0);
  names.forEach((name, index) => {
    const e = emergencyByDivision.get(name) || empty;
    const p = plannedByDivision.get(name) || empty;
    const values = [e.count, e.appeals, e.objects, p.count, p.appeals, p.objects, e.count + p.count];
    const alt = index % 2 === 1 ? "Alt" : "";
    sheet.cell(row, 0, name, name === UNMAPPED_DIVISION ? `muted${alt}` : `textBold${alt}`);
    values.forEach((value, col) => {
      totals[col] += value;
      sheet.cell(row, col + 1, value, col === 6 ? `numBold${alt}` : `num${alt}`, "number");
    });
    sheet.height(row, 20);
    row += 1;
  });

  sheet.cell(row, 0, "Итого", "totalLabel");
  totals.forEach((value, col) => sheet.cell(row, col + 1, value, "totalNum", "number"));
  sheet.height(row, 22);

  sheet.freezeRow = 0;
  sheet.filter = names.length ? `A${tableHeader}:${colName(lastCol)}${row - 1}` : "";
  return sheet;
}

/* ------------------------------------------------------------------ */
/* Книга                                                               */
/* ------------------------------------------------------------------ */

export function buildOutagesWorkbook(data) {
  const styles = createStyleSheet();
  const sheets = [
    buildSummarySheet(styles, data),
    buildDetailSheet(styles, data.emergency, { name: "Аварийные", title: "Аварийные отключения", generatedAt: data.generatedAt }),
    buildDetailSheet(styles, data.planned, { name: "Плановые", title: "Плановые отключения", generatedAt: data.generatedAt })
  ];

  // Именованные диапазоны автофильтра — без них Excel может «чинить» файл.
  const definedNames = sheets
    .map((sheet, index) => sheet.filter
      ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">'${xmlEscape(sheet.name)}'!$${sheet.filter.replace(/([A-Z]+)(\d+):([A-Z]+)(\d+)/, "$1$$$2:$$$3$$$4")}</definedName>`
      : "")
    .join("");

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets>${definedNames ? `<definedNames>${definedNames}</definedNames>` : ""}</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;

  const timestamp = data.generatedAt.toISOString().replace(/\.\d{3}Z$/, "Z");
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Отключения · аварийные и плановые</dc:title><dc:creator>ПАО «Россети Ленэнерго» Mini App</dc:creator><cp:lastModifiedBy>Mini App</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified></cp:coreProperties>`;
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Lenenergo MAX Mini App</Application></Properties>`;

  return zipStore([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "docProps/core.xml", data: coreXml },
    { name: "docProps/app.xml", data: appXml },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
    { name: "xl/styles.xml", data: styles.xml },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: sheet.xml() }))
  ]);
}
