/*
  Excel «НДР по дням»: выбранные статусы и группы за период.
  Листы: «По дням» (или «По сменам») — сколько разных нарядов было
  в статусе за срез; «На конец дня» — сколько осталось в последней
  сводке среза; «Наряды» — сами наряды с фильтрами.
*/
import {
  Sheet,
  createStyleSheet,
  writeHeaderBlock,
  estimateLines,
  formatMsk,
  packWorkbook
} from "./outages-workbook.js";
import { colName } from "./xlsx-export.js";

const MAX_DETAIL_ROWS = 60000;

function columnLabels(columns) {
  const groupNames = new Set(columns.filter((item) => item.kind === "group").map((item) => item.value.toLowerCase()));
  return columns.map((item) =>
    item.kind === "status" && groupNames.has(item.value.toLowerCase()) ? `${item.value} (статус)` : item.value
  );
}

function buildCountsSheet(styles, data, columns, { name, title, subtitle, pick, totals, meta }) {
  const isShift = data.split === "shift";
  const fixed = isShift
    ? [{ label: "Дата", width: 12 }, { label: "День", width: 7 }, { label: "Смена", width: 15 }]
    : [{ label: "Дата", width: 12 }, { label: "День", width: 7 }];
  const labels = columnLabels(columns);
  const sheet = new Sheet(name, styles);
  sheet.widths = [
    ...fixed.map((item) => item.width),
    ...labels.map((label) => Math.min(22, Math.max(12, Math.ceil(label.length * 0.9) + 2))),
    10
  ];
  const lastCol = sheet.widths.length - 1;
  sheet.landscape = sheet.widths.length > 7;

  let row = writeHeaderBlock(sheet, { title, subtitle, meta, warnings: [], lastCol });

  fixed.forEach((item, col) => sheet.cell(row, col, item.label, "header"));
  labels.forEach((label, offset) => {
    sheet.cell(row, fixed.length + offset, label, columns[offset].kind === "group" ? "headPlanned" : "header");
  });
  sheet.cell(row, lastCol, "Сводок", "headTotal");
  const headerLines = Math.max(...labels.map((label, offset) => estimateLines(label, sheet.widths[fixed.length + offset])));
  sheet.height(row, Math.max(30, headerLines * 13 + 8));
  sheet.freezeRow = row;
  row += 1;

  data.buckets.forEach((bucket, index) => {
    const weekend = bucket.weekday === "сб" || bucket.weekday === "вс";
    const alt = index % 2 ? "Alt" : "";
    sheet.cell(row, 0, bucket.date, `id${alt}`);
    sheet.cell(row, 1, bucket.weekday, weekend ? `numBold${alt}` : `center${alt}`);
    if (isShift) sheet.cell(row, 2, bucket.shift, `text${alt}`);
    columns.forEach((column, offset) => {
      const value = pick(bucket)[column.key] || 0;
      sheet.cell(row, fixed.length + offset, value, value ? `numBold${alt}` : `num${alt}`, "number");
    });
    sheet.cell(row, lastCol, bucket.snapshots, `num${alt}`, "number");
    sheet.height(row, 18);
    row += 1;
  });

  if (totals) {
    sheet.cell(row, 0, totals.label, "totalLabel");
    for (let col = 1; col < fixed.length; col += 1) sheet.cell(row, col, "", "totalBlank");
    sheet.merge(row, 0, row, fixed.length - 1);
    columns.forEach((column, offset) => {
      sheet.cell(row, fixed.length + offset, totals.values[column.key] || 0, "totalNum", "number");
    });
    sheet.cell(row, lastCol, data.snapshots, "totalNum", "number");
    sheet.height(row, 30);
    row += 1;
  }

  return sheet;
}

const DETAIL_COLUMNS = [
  { label: "Дата", width: 11 },
  { label: "День", width: 6 },
  { label: "Смена", width: 14 },
  { label: "Статус / группа", width: 22 },
  { label: "№ наряда", width: 20 },
  { label: "Журнал", width: 24 },
  { label: "Объект", width: 34 },
  { label: "Работы", width: 40 },
  { label: "Организация", width: 22 },
  { label: "План начало", width: 16 },
  { label: "План конец", width: 16 },
  { label: "Впервые в сводке", width: 16 }
];

function buildDetailSheet(styles, data, columns, meta) {
  const isShift = data.split === "shift";
  const cols = isShift ? DETAIL_COLUMNS : DETAIL_COLUMNS.filter((item) => item.label !== "Смена");
  const sheet = new Sheet("Наряды", styles);
  sheet.widths = cols.map((item) => item.width);
  const lastCol = cols.length - 1;

  const wanted = new Map(columns.map((column, index) => [column.key, columnLabels(columns)[index]]));
  const bucketMap = new Map(data.buckets.map((bucket) => [bucket.key, bucket]));
  const order = new Map(columns.map((column, index) => [column.key, index]));
  const rows = data.details
    .filter((item) => wanted.has(item.key))
    .sort((a, b) =>
      a.bucket.localeCompare(b.bucket) ||
      order.get(a.key) - order.get(b.key) ||
      String(a.order.number).localeCompare(String(b.order.number), "ru")
    );
  const shown = rows.slice(0, MAX_DETAIL_ROWS);

  let row = writeHeaderBlock(sheet, {
    title: "Наряды по выбранным статусам",
    subtitle: "Каждая строка — наряд, который был в этом статусе в этот день (смену). Фильтры — в шапке таблицы.",
    meta,
    warnings: rows.length > shown.length ? [`Показаны первые ${shown.length} строк из ${rows.length}. Сузьте период или статусы.`] : [],
    lastCol
  });

  cols.forEach((item, col) => sheet.cell(row, col, item.label, "header"));
  sheet.height(row, 26);
  sheet.freezeRow = row;
  const headerRow = row;
  row += 1;

  shown.forEach((item, index) => {
    const alt = index % 2 ? "Alt" : "";
    const bucket = bucketMap.get(item.bucket) || {};
    const values = [
      [bucket.date, `id${alt}`],
      [bucket.weekday, `center${alt}`],
      ...(isShift ? [[bucket.shift, `text${alt}`]] : []),
      [wanted.get(item.key), `textBold${alt}`],
      [item.order.number || "без номера", `text${alt}`],
      [item.order.journal, `text${alt}`],
      [item.order.object, `text${alt}`],
      [item.order.works, `text${alt}`],
      [item.order.organization, `text${alt}`],
      [item.order.planStart, `center${alt}`],
      [item.order.planEnd, `center${alt}`],
      [String(item.at || "").split(" ")[1] || item.at, `center${alt}`]
    ];
    values.forEach(([value, style], col) => sheet.cell(row, col, value, style));
    const worksCol = cols.findIndex((column) => column.label === "Работы");
    const objectCol = cols.findIndex((column) => column.label === "Объект");
    const lines = Math.min(4, Math.max(
      estimateLines(item.order.works, cols[worksCol].width),
      estimateLines(item.order.object, cols[objectCol].width)
    ));
    sheet.height(row, Math.max(18, lines * 13 + 5));
    row += 1;
  });

  if (shown.length) sheet.filter = `A${headerRow}:${colName(lastCol)}${row - 1}`;
  return sheet;
}

export function buildWorkordersPeriodWorkbook(data, { keys, scopeLabel = "", generatedAt = new Date() }) {
  const optionMap = new Map(data.options.map((item) => [item.key, item]));
  const columns = keys.map((key) => optionMap.get(key)).filter(Boolean);
  const unit = data.split === "shift" ? "смену" : "день";
  const meta = `${scopeLabel ? `${scopeLabel} · ` : ""}Период: ${data.periodLabel} МСК · сводок: ${data.snapshots} · сформировано ${formatMsk(generatedAt)} МСК`;

  const styles = createStyleSheet();
  const sheets = [
    buildCountsSheet(styles, data, columns, {
      name: data.split === "shift" ? "По сменам" : "По дням",
      title: data.split === "shift" ? "НДР по сменам" : "НДР по дням",
      subtitle: `Сколько разных нарядов было в статусе за ${unit} (по всем сводкам за ${unit}). Синие колонки — группы, золотые — статусы СК-11.`,
      pick: (bucket) => bucket.seen,
      totals: { label: "За весь период (разных нарядов)", values: data.periodTotals },
      meta
    }),
    buildCountsSheet(styles, data, columns, {
      name: data.split === "shift" ? "На конец смены" : "На конец дня",
      title: data.split === "shift" ? "НДР на конец смены" : "НДР на конец дня",
      subtitle: `Сколько нарядов было в статусе в последней сводке за ${unit}.`,
      pick: (bucket) => bucket.last,
      totals: null,
      meta
    }),
    buildDetailSheet(styles, data, columns, meta)
  ];
  return packWorkbook(sheets, styles, { title: "НДР по дням", generatedAt });
}
