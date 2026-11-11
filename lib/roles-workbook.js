/*
  Выгрузка «Роли по подразделениям» для Центра управления:
  какие роли СК-11 назначены каждому РЭС/району во всех подразделениях.
  Листы: «Сводка», «Роли по РЭС», «Список ролей», «Роли доступа».
*/
import { getDispatcherStructure } from "./dispatcher-structure.js";
import { getDispatcherSourceConfig } from "./dispatcher-config.js";
import { getWorkordersSourceConfig } from "./dispatcher-workorders-config.js";
import { getDispatcherRoleHierarchyConfig } from "./dispatcher-role-hierarchy-config.js";
import { getOutageDivisions } from "./outage-config.js";
import { getRoleDefinitions, PANEL_REGISTRY } from "./access-control.js";
import {
  Sheet,
  createStyleSheet,
  writeHeaderBlock,
  estimateLines,
  formatMsk,
  packWorkbook
} from "./outages-workbook.js";

const NONE = "—";

/* ------------------------------------------------------------------ */
/* Данные                                                              */
/* ------------------------------------------------------------------ */

function outageLines(unit, divisionsById) {
  if (unit.outageSelectionMode === "roles") {
    return unit.outageSelections.map((selection) => {
      const division = divisionsById.get(String(selection.divisionId));
      return {
        division: division?.name || `Удалённое подразделение (${selection.divisionId})`,
        roles: selection.sources
      };
    });
  }
  if (unit.outageSelectionMode === "legacy") {
    return unit.outageDivisionIds.map((divisionId) => {
      const division = divisionsById.get(String(divisionId));
      return {
        division: division?.name || `Удалённое подразделение (${divisionId})`,
        roles: Array.isArray(division?.sources) ? division.sources : [],
        allRoles: true
      };
    });
  }
  return [];
}

export async function getRolesWorkbookDataset(generatedAt = new Date()) {
  const [structure, requests, workorders, hierarchy, divisions, accessRoles] = await Promise.all([
    getDispatcherStructure(),
    getDispatcherSourceConfig(),
    getWorkordersSourceConfig(),
    getDispatcherRoleHierarchyConfig(),
    getOutageDivisions().catch(() => []),
    getRoleDefinitions().catch(() => [])
  ]);

  const requestsById = new Map(requests.map((item) => [item.id, item]));
  const workordersById = new Map(workorders.map((item) => [item.id, item]));
  const hierarchyById = new Map(hierarchy.map((item) => [item.unitId, item]));
  const divisionsById = new Map((divisions || []).map((item) => [String(item.id), item]));

  const groups = structure.groups.map((group) => ({
    ...group,
    units: structure.units
      .filter((unit) => unit.groupId === group.id)
      .map((unit) => {
        const request = requestsById.get(unit.id) || {};
        const workorder = workordersById.get(unit.id) || {};
        const roleTree = hierarchyById.get(unit.id) || {};
        const changed = [];
        if (request.customized) changed.push("Заявки");
        if (workorder.customized) changed.push("НДР");
        if (request.outageCustomized) changed.push("Отключения");
        if (roleTree.customized) changed.push("Иерархия");
        return {
          id: unit.id,
          name: unit.name,
          requestRoles: request.sources || [],
          requestDefault: !request.customized,
          workorderRoles: workorder.sources || [],
          outages: outageLines(request, divisionsById),
          mainRole: roleTree.mainRole || "",
          subordinateRoles: roleTree.subordinateRoles || [],
          changed
        };
      })
  })).filter((group) => group.units.length);

  return { generatedAt, groups, divisions: divisions || [], accessRoles: accessRoles || [] };
}

/* ------------------------------------------------------------------ */
/* Листы                                                               */
/* ------------------------------------------------------------------ */

const bullet = (items) => items.map((item) => `• ${item}`).join("\n");

function outageText(outages) {
  return outages
    .map((item) => {
      const roles = item.roles.length ? item.roles.join(", ") : "роли не выбраны";
      return `▸ ${item.division}${item.allRoles ? " (все роли)" : ""}:\n   ${roles}`;
    })
    .join("\n");
}

function countOutageRoles(outages) {
  return outages.reduce((sum, item) => sum + item.roles.length, 0);
}

function buildSummarySheet(styles, data) {
  const sheet = new Sheet("Сводка", styles);
  sheet.landscape = false;
  sheet.widths = [12, 38, 10, 12, 10, 14, 14, 16];
  const lastCol = 7;
  const units = data.groups.flatMap((group) => group.units);

  let row = writeHeaderBlock(sheet, {
    title: "Роли по подразделениям",
    subtitle: "ПАО «Россети Ленэнерго» · настройки ролей СК-11 для Интерфейса Диспетчера",
    meta: `Сформировано: ${formatMsk(data.generatedAt)} МСК · подразделений: ${data.groups.length} · РЭС/районов: ${units.length}`,
    warnings: [],
    lastCol
  });

  sheet.cell(row, 0, "КАК ЧИТАТЬ", "section");
  sheet.height(row, 20);
  row += 1;
  const legend = [
    ["Заявки", "строки «Источник» из СК-11, по которым РЭС видит заявки"],
    ["НДР", "журналы нарядов-допусков и распоряжений, назначенные РЭС"],
    ["Отключения", "подразделения раздела отключений и выбранные в них роли"],
    ["Иерархия", "главная роль РЭС и подчинённые ей роли"],
    ["Изменено", "раздел настроен вручную в центре управления (иначе — значения по умолчанию)"]
  ];
  for (const [label, text] of legend) {
    sheet.cell(row, 0, label, "kpiLabel");
    sheet.cell(row, 1, text, "text");
    for (let col = 2; col <= lastCol; col += 1) sheet.cell(row, col, "", "text");
    sheet.merge(row, 1, row, lastCol);
    row += 1;
  }
  row += 1;

  sheet.cell(row, 0, "ИТОГИ ПО ПОДРАЗДЕЛЕНИЯМ", "section");
  sheet.height(row, 20);
  row += 1;
  const headers = ["Код", "Подразделение", "РЭС / районов", "Ролей в заявках", "Журналов НДР", "Ролей в отключениях", "Иерархий ролей", "Изменено вручную"];
  headers.forEach((label, col) => sheet.cell(row, col, label, "header"));
  sheet.height(row, 30);
  row += 1;

  const totals = [0, 0, 0, 0, 0, 0];
  data.groups.forEach((group, index) => {
    const alt = index % 2 ? "Alt" : "";
    const values = [
      group.units.length,
      group.units.reduce((sum, unit) => sum + unit.requestRoles.length, 0),
      group.units.reduce((sum, unit) => sum + unit.workorderRoles.length, 0),
      group.units.reduce((sum, unit) => sum + countOutageRoles(unit.outages), 0),
      group.units.filter((unit) => unit.mainRole || unit.subordinateRoles.length).length,
      group.units.filter((unit) => unit.changed.length).length
    ];
    sheet.cell(row, 0, group.name, `id${alt}`);
    sheet.cell(row, 1, group.description || group.name, `text${alt}`);
    values.forEach((value, offset) => {
      totals[offset] += value;
      sheet.cell(row, 2 + offset, value, `num${alt}`, "number");
    });
    row += 1;
  });

  sheet.cell(row, 0, "ИТОГО", "totalLabel");
  sheet.cell(row, 1, "", "totalBlank");
  totals.forEach((value, offset) => sheet.cell(row, 2 + offset, value, "totalNum", "number"));
  sheet.height(row, 20);
  return sheet;
}

const ROLE_COLUMNS = [
  { label: "№", width: 5 },
  { label: "РЭС / район", width: 22 },
  { label: "Заявки — роли СК-11", width: 30 },
  { label: "НДР — журналы", width: 28 },
  { label: "Отключения — подразделение и роли", width: 40 },
  { label: "Главная роль", width: 24 },
  { label: "Подчинённые роли", width: 32 },
  { label: "Изменено вручную", width: 13 }
];

function buildRolesSheet(styles, data) {
  const sheet = new Sheet("Роли по РЭС", styles);
  sheet.widths = ROLE_COLUMNS.map((column) => column.width);
  const lastCol = ROLE_COLUMNS.length - 1;

  let row = writeHeaderBlock(sheet, {
    title: "Роли по РЭС и районам",
    subtitle: "Каждый блок — подразделение, внутри — его РЭС/районы со всеми назначенными ролями",
    meta: `Сформировано: ${formatMsk(data.generatedAt)} МСК`,
    warnings: [],
    lastCol
  });

  ROLE_COLUMNS.forEach((column, col) => sheet.cell(row, col, column.label, "header"));
  sheet.height(row, 30);
  sheet.freezeRow = row;
  row += 1;

  let number = 0;
  for (const group of data.groups) {
    const changedUnits = group.units.filter((unit) => unit.changed.length).length;
    sheet.cell(row, 0, `${group.name} — ${group.description || group.name}`, "band");
    for (let col = 1; col <= 5; col += 1) sheet.cell(row, col, "", "band");
    sheet.merge(row, 0, row, 5);
    sheet.cell(row, 6, `РЭС/районов: ${group.units.length} · изменено: ${changedUnits}`, "bandMeta");
    sheet.cell(row, 7, "", "bandMeta");
    sheet.merge(row, 6, row, 7);
    sheet.height(row, 22);
    row += 1;

    group.units.forEach((unit, index) => {
      number += 1;
      const alt = index % 2 ? "Alt" : "";
      const empty = `emptyNote${alt}`;
      const texts = [
        unit.requestRoles.length ? bullet(unit.requestRoles) : "",
        unit.workorderRoles.length ? bullet(unit.workorderRoles) : "",
        unit.outages.length ? outageText(unit.outages) : "",
        unit.mainRole,
        unit.subordinateRoles.length ? bullet(unit.subordinateRoles) : ""
      ];

      sheet.cell(row, 0, number, `num${alt}`, "number");
      sheet.cell(row, 1, unit.name, `textBold${alt}`);
      texts.forEach((text, offset) => {
        const col = 2 + offset;
        if (text) sheet.cell(row, col, text, col === 5 ? `textBold${alt}` : `text${alt}`);
        else sheet.cell(row, col, offset === 2 ? "не настроены" : "не назначены", empty);
      });
      sheet.cell(
        row,
        7,
        unit.changed.length ? unit.changed.join("\n") : "по умолчанию",
        unit.changed.length ? "flagManual" : `flagDefault${alt}`
      );

      const lines = Math.max(
        estimateLines(unit.name, ROLE_COLUMNS[1].width),
        ...texts.map((text, offset) => estimateLines(text, ROLE_COLUMNS[2 + offset].width)),
        unit.changed.length
      );
      sheet.height(row, Math.min(409, Math.max(20, lines * 13 + 6)));
      row += 1;
    });
  }
  return sheet;
}

const LIST_COLUMNS = [
  { label: "Подразделение", width: 14 },
  { label: "РЭС / район", width: 24 },
  { label: "Раздел", width: 18 },
  { label: "Подразделение отключений", width: 26 },
  { label: "Роль", width: 44 },
  { label: "Настройка", width: 15 }
];

function buildListSheet(styles, data) {
  const sheet = new Sheet("Список ролей", styles);
  sheet.widths = LIST_COLUMNS.map((column) => column.width);
  const lastCol = LIST_COLUMNS.length - 1;

  let row = writeHeaderBlock(sheet, {
    title: "Список ролей · одна строка — одна роль",
    subtitle: "Удобно фильтровать: по подразделению, РЭС, разделу или конкретной роли",
    meta: `Сформировано: ${formatMsk(data.generatedAt)} МСК`,
    warnings: [],
    lastCol
  });

  LIST_COLUMNS.forEach((column, col) => sheet.cell(row, col, column.label, "header"));
  sheet.height(row, 26);
  const headerRow = row;
  sheet.freezeRow = row;
  row += 1;

  let index = 0;
  const push = (group, unit, section, division, role, manual) => {
    const alt = index % 2 ? "Alt" : "";
    sheet.cell(row, 0, group.name, `id${alt}`);
    sheet.cell(row, 1, unit.name, `text${alt}`);
    sheet.cell(row, 2, section, `text${alt}`);
    sheet.cell(row, 3, division || "", division ? `text${alt}` : `muted${alt}`);
    sheet.cell(row, 4, role, `textBold${alt}`);
    sheet.cell(row, 5, manual ? "вручную" : "по умолчанию", manual ? "flagManual" : `flagDefault${alt}`);
    index += 1;
    row += 1;
  };

  for (const group of data.groups) {
    for (const unit of group.units) {
      const changed = new Set(unit.changed);
      unit.requestRoles.forEach((role) => push(group, unit, "Заявки", "", role, changed.has("Заявки")));
      unit.workorderRoles.forEach((role) => push(group, unit, "НДР", "", role, changed.has("НДР")));
      unit.outages.forEach((item) =>
        item.roles.forEach((role) => push(group, unit, "Отключения", item.division, role, changed.has("Отключения")))
      );
      if (unit.mainRole) push(group, unit, "Главная роль", "", unit.mainRole, changed.has("Иерархия"));
      unit.subordinateRoles.forEach((role) => push(group, unit, "Подчинённая роль", "", role, changed.has("Иерархия")));
    }
  }

  if (row > headerRow + 1) sheet.filter = `A${headerRow}:F${row - 1}`;
  return sheet;
}

const ACCESS_COLUMNS = [
  { label: "Роль доступа", width: 26 },
  { label: "Описание", width: 36 },
  { label: "Подразделение диспетчера", width: 24 },
  { label: "Доступные панели", width: 40 },
  { label: "Тип", width: 13 }
];

function buildAccessSheet(styles, data) {
  const sheet = new Sheet("Роли доступа", styles);
  sheet.widths = ACCESS_COLUMNS.map((column) => column.width);
  const lastCol = ACCESS_COLUMNS.length - 1;
  const panelNames = new Map(PANEL_REGISTRY.map((panel) => [panel.id, panel.name]));
  const groupNames = new Map(data.groups.map((group) => [group.id, `${group.name} — ${group.description || group.name}`]));

  let row = writeHeaderBlock(sheet, {
    title: "Роли доступа Mini App",
    subtitle: "Какие панели открывает каждая роль и к какому подразделению она привязана",
    meta: `Сформировано: ${formatMsk(data.generatedAt)} МСК · ролей: ${data.accessRoles.length}`,
    warnings: [],
    lastCol
  });

  ACCESS_COLUMNS.forEach((column, col) => sheet.cell(row, col, column.label, "header"));
  sheet.height(row, 26);
  sheet.freezeRow = row;
  row += 1;

  data.accessRoles.forEach((role, index) => {
    const alt = index % 2 ? "Alt" : "";
    const panels = (role.panelIds || []).map((id) => panelNames.get(id) || id);
    const division = role.dispatcherAllDivisions
      ? "Все подразделения"
      : groupNames.get(role.dispatcherDivisionId) || "";
    sheet.cell(row, 0, role.name || role.id, `textBold${alt}`);
    sheet.cell(row, 1, role.description || "", role.description ? `text${alt}` : `muted${alt}`);
    sheet.cell(row, 2, division || NONE, division ? `text${alt}` : `center${alt}`);
    sheet.cell(row, 3, panels.length ? bullet(panels) : "нет панелей", panels.length ? `text${alt}` : `emptyNote${alt}`);
    sheet.cell(row, 4, role.builtin ? "системная" : "своя", `center${alt}`);
    const lines = Math.max(
      estimateLines(role.description, ACCESS_COLUMNS[1].width),
      estimateLines(division, ACCESS_COLUMNS[2].width),
      panels.length
    );
    sheet.height(row, Math.min(409, Math.max(20, lines * 13 + 6)));
    row += 1;
  });
  return sheet;
}

export function buildRolesWorkbook(data) {
  const styles = createStyleSheet();
  const sheets = [
    buildSummarySheet(styles, data),
    buildRolesSheet(styles, data),
    buildListSheet(styles, data)
  ];
  if (data.accessRoles.length) sheets.push(buildAccessSheet(styles, data));
  return packWorkbook(sheets, styles, { title: "Роли по подразделениям", generatedAt: data.generatedAt });
}
