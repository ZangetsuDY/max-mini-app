function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crc32Table();

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: day };
}

function zipStore(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const now = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(String(entry.data || ""), "utf8");
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(now.time, 12);
    central.writeUInt16LE(now.date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuffer, end]);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function argb(hex, fallback = "FFFFFFFF") {
  const clean = String(hex || "").replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(clean) ? `FF${clean}` : fallback;
}

function colName(index) {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    result = String.fromCharCode(65 + r) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function safeSpreadsheetText(value) {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function makeCell(ref, value, styleId, type = "text") {
  if (type === "number" && Number.isFinite(Number(value))) {
    return `<c r="${ref}" s="${styleId}"><v>${Number(value)}</v></c>`;
  }
  const text = safeSpreadsheetText(value);
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function fontXml({ size = 10, bold = false, color = "#17212B", name = "Calibri" }) {
  return `<font>${bold ? "<b/>" : ""}<sz val="${size}"/><color rgb="${argb(color)}"/><name val="${xmlEscape(name)}"/><family val="2"/></font>`;
}

function fillXml(color) {
  return `<fill><patternFill patternType="solid"><fgColor rgb="${argb(color)}"/><bgColor indexed="64"/></patternFill></fill>`;
}

function alignmentXml({ align = "left", wrap = true } = {}) {
  return `<alignment horizontal="${align}" vertical="center" wrapText="${wrap ? 1 : 0}"/>`;
}

function makeStyles(config) {
  const fonts = [
    fontXml({ size: 11, color: "#17212B" }),
    fontXml(config.titleStyle),
    fontXml({
      size: Math.max(8, Number(config.bodyStyle.fontSize || 10) - 1),
      bold: false,
      color: "#667788"
    }),
    fontXml(config.headerStyle)
  ];

  const fills = [
    "<fill><patternFill patternType=\"none\"/></fill>",
    "<fill><patternFill patternType=\"gray125\"/></fill>",
    fillXml(config.titleStyle.fill),
    fillXml(config.headerStyle.fill),
    fillXml(config.bodyStyle.fill),
    fillXml(config.bodyStyle.alternateFill)
  ];

  const xfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alignmentXml({ align: config.titleStyle.align, wrap: true })}</xf>`,
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">${alignmentXml({ align: "left", wrap: true })}</xf>`,
    `<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alignmentXml({ align: config.headerStyle.align, wrap: true })}</xf>`
  ];

  const bodyStyleIds = [];
  const altStyleIds = [];

  for (const column of config.columns) {
    const fontId = fonts.length;
    fonts.push(fontXml({
      size: column.fontSize || config.bodyStyle.fontSize,
      bold: column.bold,
      color: config.bodyStyle.color
    }));

    const baseStyleId = xfs.length;
    xfs.push(`<xf numFmtId="0" fontId="${fontId}" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alignmentXml({ align: column.align, wrap: column.wrap })}</xf>`);
    bodyStyleIds.push(baseStyleId);

    const altStyleId = xfs.length;
    xfs.push(`<xf numFmtId="0" fontId="${fontId}" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alignmentXml({ align: column.align, wrap: column.wrap })}</xf>`);
    altStyleIds.push(altStyleId);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${fonts.length}">${fonts.join("")}</fonts>
<fills count="${fills.length}">${fills.join("")}</fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFD9E0E5"/></left><right style="thin"><color rgb="FFD9E0E5"/></right><top style="thin"><color rgb="FFD9E0E5"/></top><bottom style="thin"><color rgb="FFD9E0E5"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  return {
    xml,
    titleStyleId: 1,
    metaStyleId: 2,
    headerStyleId: 3,
    bodyStyleIds,
    altStyleIds
  };
}

function valueForField(row, field, index) {
  if (field === "index") return index + 1;
  if (field === "disconnectedObjects") {
    return Array.isArray(row?.disconnectedObjects)
      ? row.disconnectedObjects.join(", ")
      : String(row?.disconnectedObjects || "");
  }
  return row?.[field] ?? "";
}

export function buildEmergencyOutagesXlsx({ config, rows, sourceUpdatedAt = "", generatedAt = new Date() }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const columns = config.columns;
  const styles = makeStyles(config);
  const lastCol = colName(Math.max(0, columns.length - 1));
  const headerRow = Number(config.tableStartRow || 5);
  const dataStart = headerRow + 1;
  const dataEnd = Math.max(dataStart, dataStart + safeRows.length - 1);

  const sheetRows = [];
  sheetRows.push(
    `<row r="1" ht="${config.titleStyle.rowHeight}" customHeight="1">${makeCell("A1", config.title, styles.titleStyleId)}</row>`
  );

  if (config.subtitle) {
    sheetRows.push(`<row r="2" ht="20" customHeight="1">${makeCell("A2", config.subtitle, styles.metaStyleId)}</row>`);
  }

  const meta = [];
  if (config.showGeneratedAt) {
    meta.push(`Сформировано: ${generatedAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`);
  }
  if (config.showSourceUpdatedAt && sourceUpdatedAt) {
    meta.push(`Источник обновлён: ${sourceUpdatedAt}`);
  }
  if (meta.length && headerRow > 3) {
    sheetRows.push(`<row r="3" ht="18" customHeight="1">${makeCell("A3", meta.join(" · "), styles.metaStyleId)}</row>`);
  }

  const headerCells = columns.map((column, index) =>
    makeCell(`${colName(index)}${headerRow}`, column.label, styles.headerStyleId)
  ).join("");
  sheetRows.push(`<row r="${headerRow}" ht="${config.headerStyle.rowHeight}" customHeight="1">${headerCells}</row>`);

  safeRows.forEach((row, rowIndex) => {
    const excelRow = dataStart + rowIndex;
    const isAlt = rowIndex % 2 === 1;
    const cells = columns.map((column, columnIndex) => {
      const fieldOption = column.field;
      const value = valueForField(row, fieldOption, rowIndex);
      const type = ["index", "appeals"].includes(fieldOption) ? "number" : "text";
      const styleId = isAlt
        ? styles.altStyleIds[columnIndex]
        : styles.bodyStyleIds[columnIndex];
      return makeCell(`${colName(columnIndex)}${excelRow}`, value, styleId, type);
    }).join("");
    sheetRows.push(`<row r="${excelRow}" ht="${config.bodyStyle.rowHeight}" customHeight="1">${cells}</row>`);
  });

  const colsXml = columns.map((column, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`
  ).join("");

  const mergeCells = `<mergeCells count="1"><mergeCell ref="A1:${lastCol}1"/></mergeCells>`;
  const pane = config.freezeHeader
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  const autoFilter = config.autoFilter && safeRows.length
    ? `<autoFilter ref="A${headerRow}:${lastCol}${dataEnd}"/>`
    : "";

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${pane}<sheetFormatPr defaultRowHeight="15"/><cols>${colsXml}</cols><sheetData>${sheetRows.join("")}</sheetData>${mergeCells}${autoFilter}<pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;

  const sheetName = xmlEscape(config.sheetName || "Аварийные отключения");
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;

  const timestamp = generatedAt.toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>ПАО «Россети Ленэнерго» Mini App</dc:creator><cp:lastModifiedBy>Mini App</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified></cp:coreProperties>`;
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Lenenergo MAX Mini App</Application></Properties>`;

  return zipStore([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "docProps/core.xml", data: coreXml },
    { name: "docProps/app.xml", data: appXml },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
    { name: "xl/styles.xml", data: styles.xml },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml }
  ]);
}
