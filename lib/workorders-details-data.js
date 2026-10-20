/*
  Детальные наряды / распоряжения (НДР) СК-11 из txt-файла, который бот
  присылает в чат НДР сообщением «СК-11 — НДР (детально, файл)».
  Из этого же файла строится и счётчик НДР для панелей (вместо старых
  многочастных сообщений «СК-11 • Наряды / допуски»).
*/
import { createAttachmentSource } from "./max-attachment-source.js";

const DETAILS_HEADER = /СК-11\s*[—–-]\s*НДР/i;

export function normalizeWorkorderLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
}

// Группы ТЗ (воронка). Файл сам указывает группу в квадратных скобках.
export const WORKORDER_GROUPS = [
  { key: "notChecked", label: "Не проверен", pattern: /^не\s+проверен/i },
  { key: "checked", label: "Проверен, не начат", pattern: /^проверен,?\s+не\s+начат/i },
  { key: "started", label: "Работы начаты", pattern: /^работы\s+начаты/i },
  { key: "notAdmitted", label: "Допуск не производился", pattern: /^допуск\s+не\s+производ/i },
  { key: "other", label: "Прочие", pattern: /^прочие/i }
];

function groupKey(label) {
  const text = String(label || "").trim();
  return (WORKORDER_GROUPS.find((group) => group.pattern.test(text)) || WORKORDER_GROUPS[4]).key;
}

// Статусы счётчика на панелях (как раньше: 5 статусов СК-11).
const COUNTER_STATUS = [
  [/^зарегистрирован/i, "registered"],
  [/^создан/i, "created"],
  [/^допуск$/i, "admission"],
  [/^подготовка\s+р\.?\s*м/i, "preparation"],
  [/^перерыв/i, "break"]
];

// Служебные статусы СК-11 на английском — для показа по-русски.
const STATUS_RU = {
  work: "Работа",
  checked: "Проверен",
  closed: "Закрыт",
  canceled: "Отменён",
  cancelled: "Отменён",
  declined: "Отклонён",
  instructionnotperformed: "Инструктаж не проведён"
};

function counterKey(status) {
  const text = String(status || "").trim();
  for (const [pattern, key] of COUNTER_STATUS) {
    if (pattern.test(text)) return key;
  }
  return "";
}

function dash(value) {
  const text = String(value || "").trim();
  return text === "—" || text === "-" ? "" : text;
}

function splitPipes(value) {
  const result = {};
  for (const part of String(value || "").split("|")) {
    const match = part.match(/^\s*([^:]+?)\s*:\s*(.*?)\s*$/);
    if (match) result[match[1].toLowerCase()] = dash(match[2]);
  }
  return result;
}

export function parseWorkordersDetailsText(rawText) {
  const text = String(rawText || "")
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n");

  if (!/СК-11\s*[—–-]\s*НДР/i.test(text.slice(0, 400))) {
    return null;
  }

  const lines = text.split("\n");
  const orders = [];
  const organizations = [];
  let current = null;
  let inSummary = false;

  const finish = () => {
    if (current) orders.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      finish();
      continue;
    }

    if (/^СВОДКА\s+ПО\s+ПОДРАЗДЕЛЕНИЯМ/i.test(line)) {
      inSummary = true;
      continue;
    }

    if (inSummary) {
      const summary = line.match(/^(.+?):\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)/);
      if (summary && !/^ИТОГО/i.test(summary[1])) {
        organizations.push({
          name: summary[1].trim(),
          notChecked: Number(summary[2]),
          checked: Number(summary[3]),
          started: Number(summary[4]),
          notAdmitted: Number(summary[5]),
          other: Number(summary[6]),
          total: Number(summary[7])
        });
      }
      if (/^■/.test(line)) inSummary = false;
      else continue;
    }

    if (/^■/.test(line)) {
      finish();
      continue;
    }

    const head = line.match(/^№\s*(\S+)\s*[—–-]\s*(.+?)\s*(?:\[(.+?)\])?\s*$/);
    if (head) {
      finish();
      const rawStatus = head[2].trim();
      const groupLabel = (head[3] || "Прочие").trim();
      current = {
        number: head[1] === "?" ? "" : head[1],
        statusRaw: rawStatus,
        status: STATUS_RU[rawStatus.toLowerCase()] || rawStatus,
        statusKey: counterKey(rawStatus),
        group: groupKey(groupLabel),
        groupLabel,
        organization: "",
        journal: "",
        object: "",
        places: "",
        works: "",
        planStart: "",
        planEnd: "",
        startsInShift: false,
        issuedAt: "",
        checkedAt: "",
        admittedAt: "",
        actualStartAt: "",
        admissionMinutes: null,
        stageSince: "",
        stageBy: "",
        issuer: "",
        responsible: "",
        producer: "",
        brigade: [],
        brigadeCount: 0,
        notes: "",
        preparation: "",
        result: "",
        otherDates: "",
        uid: ""
      };
      continue;
    }

    if (!current) continue;

    const field = line.match(/^([^:]{2,40}?):\s*(.*)$/);
    if (!field) continue;
    const key = field[1].trim().toLowerCase();
    const value = field[2].trim();

    if (key === "подразделение") {
      const parts = splitPipes(line);
      current.organization = parts["подразделение"] || "";
      current.journal = parts["журнал"] || "";
    } else if (key === "объект") {
      const parts = splitPipes(line);
      current.object = parts["объект"] || "";
      current.places = parts["места"] || "";
    } else if (key === "работы") {
      current.works = value;
    } else if (key === "план") {
      const match = value.match(/^(.*?)\s*[—–-]\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}|—)?\s*(\(.*\))?$/);
      current.planStart = dash(match ? match[1] : value);
      current.planEnd = dash(match?.[2] || "");
      current.startsInShift = /начало\s+в\s+смену/i.test(value);
    } else if (key === "выдан") {
      current.issuedAt = dash(value);
    } else if (key === "проверка п.р.м.") {
      const parts = splitPipes(line);
      current.checkedAt = parts["проверка п.р.м."] || "";
      current.admittedAt = parts["допуск"] || "";
      current.actualStartAt = parts["факт. начало"] || "";
    } else if (key === "длительность допуска") {
      const minutes = value.match(/(-?\d+(?:[.,]\d+)?)/);
      current.admissionMinutes = minutes ? Number(minutes[1].replace(",", ".")) : null;
    } else if (key === "текущий этап с") {
      const match = value.match(/^(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})\s*(?:\((.*)\))?$/);
      current.stageSince = match ? match[1] : value;
      current.stageBy = match?.[2] || "";
    } else if (key === "выдающий") {
      current.issuer = value;
    } else if (key === "ответственный руководитель") {
      current.responsible = value;
    } else if (key === "производитель работ") {
      current.producer = value;
    } else if (/^бригада/.test(key)) {
      current.brigade = value.split(/\s*,\s*/).filter(Boolean);
      const count = field[1].match(/\((\d+)\)/);
      current.brigadeCount = count ? Number(count[1]) : current.brigade.length;
    } else if (key === "доп. указания") {
      current.notes = value;
    } else if (key === "подготовка р.м.") {
      current.preparation = value;
    } else if (key === "результат") {
      current.result = value;
    } else if (key === "прочие даты") {
      current.otherDates = value;
    } else if (key === "uid") {
      current.uid = value;
    }
  }
  finish();

  const header = text.slice(0, 600);
  const shiftMatch = header.match(/Смена\s+([^:\n]+):\s*([^\n(]+)/i);
  const generatedMatch = header.match(/Сформировано:\s*([^\n]+)/i);
  const totalMatch = header.match(/Нарядов:\s*(\d+)/i);

  return {
    format: "sk11-workorders-details-v1",
    shift: shiftMatch ? shiftMatch[1].trim() : "",
    period: shiftMatch ? shiftMatch[2].trim() : "",
    generatedAt: generatedMatch ? generatedMatch[1].trim() : "",
    reportedTotal: totalMatch ? Number(totalMatch[1]) : orders.length,
    organizations,
    orders
  };
}

export const getLatestWorkordersDetails = createAttachmentSource({
  getChatId: () => String(
    process.env.DISPATCHER_WORKORDERS_CHAT_ID ||
    process.env.WORKORDERS_CHAT_ID ||
    ""
  ).trim(),
  chatEnvName: "DISPATCHER_WORKORDERS_CHAT_ID",
  header: DETAILS_HEADER,
  headerLabel: "СК-11 — НДР (детально, файл)",
  cacheKey: "lenenergo:max-mini-app:dispatcher:sk11-workorders-details",
  parse: parseWorkordersDetailsText,
  noun: "нарядов"
});

export function filterWorkordersBySources(details, sourceLabels) {
  const keys = new Set(
    (Array.isArray(sourceLabels) ? sourceLabels : [])
      .map(normalizeWorkorderLabel)
      .filter(Boolean)
  );
  const orders = Array.isArray(details?.orders) ? details.orders : [];
  if (!keys.size) return [];
  return orders.filter((item) => keys.has(normalizeWorkorderLabel(item.journal)));
}

/*
  Снимок счётчика в старом формате (строка на журнал, 5 статусов),
  чтобы панели и aggregateWorkordersSources работали без изменений.
*/
export function workordersDetailsToCounterSnapshot(details) {
  const rows = {};
  const rowList = [];

  for (const order of Array.isArray(details?.orders) ? details.orders : []) {
    if (!order.journal || !order.statusKey) continue;
    const key = normalizeWorkorderLabel(order.journal);
    let row = rows[key];
    if (!row) {
      row = { label: order.journal, registered: 0, created: 0, admission: 0, preparation: 0, break: 0, total: 0 };
      rows[key] = row;
      rowList.push(row);
    }
    row[order.statusKey] += 1;
    row.total += 1;
  }

  return {
    format: "sk11-workorders-from-details-v1",
    parsedAt: new Date().toISOString(),
    messageTimestamp: details?.messageTimestamp || null,
    messageId: details?.messageId || "",
    messageIds: details?.messageId ? [details.messageId] : [],
    parts: 1,
    period: details?.period || "",
    sourceUpdatedAt: details?.generatedAt || "",
    received: rowList.reduce((sum, row) => sum + row.total, 0),
    counted: rowList.reduce((sum, row) => sum + row.total, 0),
    withoutJournal: null,
    journals: rowList.length,
    rowCount: rowList.length,
    rows,
    rowList
  };
}
