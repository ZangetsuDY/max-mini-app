/*
  Детальные заявки СК-11 из txt-файла, который бот присылает в чат заявок
  отдельным сообщением «СК-11 — заявки по РЭС (детально, файл)».
  Счётчик (первое сообщение) по-прежнему разбирает dispatcher-data.js.
*/
import { createAttachmentSource } from "./max-attachment-source.js";

const DETAILS_HEADER = /СК-11\s*[—–-]\s*заявки\s+по\s+РЭС\s*\(детально/i;

/* ------------------------------------------------------------------ */
/* Разбор файла                                                        */
/* ------------------------------------------------------------------ */

export function normalizeRequestSourceLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
}

const STATUS_KEYS = [
  [/^в\s+рассмотрении/i, "review"],
  [/^разрешена/i, "approved"],
  [/^открыта/i, "open"],
  [/^закрыта/i, "closed"],
  [/^принята\s+к\s+сведению/i, "acknowledged"]
];

function statusKey(status) {
  const text = String(status || "").trim();
  for (const [pattern, key] of STATUS_KEYS) {
    if (pattern.test(text)) return key;
  }
  return "other";
}

function splitWorks(value) {
  return String(value || "")
    .split(/;\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// Делим «Также РЭС» по запятым, но не внутри скобок:
// «Диспетчер ОДГ РЭС (Сланцевский р-н, Оредежский и Осьминский уч.)».
function splitSourceList(value) {
  const result = [];
  let depth = 0;
  let buffer = "";
  for (const char of String(value || "")) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      if (buffer.trim()) result.push(buffer.trim());
      buffer = "";
      continue;
    }
    buffer += char;
  }
  if (buffer.trim()) result.push(buffer.trim());
  return result;
}

export function parseRequestsDetailsText(rawText) {
  const text = String(rawText || "")
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n");

  if (!DETAILS_HEADER.test(text.slice(0, 400))) {
    return null;
  }

  const lines = text.split("\n");
  const requests = [];
  const sections = [];
  let section = null;
  let current = null;

  const finish = () => {
    if (current) requests.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      finish();
      continue;
    }

    const sectionMatch = line.match(/^■\s*(.+?)\s*\((\d+)\)\s*$/);
    if (sectionMatch) {
      finish();
      section = { label: sectionMatch[1].trim(), count: Number(sectionMatch[2]) };
      sections.push(section);
      continue;
    }

    const requestMatch = line.match(/^№\s*(\d+)\s*[—–-]\s*(.+)$/);
    if (requestMatch) {
      finish();
      const [statusPart, ...flags] = requestMatch[2].split("|").map((item) => item.trim());
      current = {
        id: requestMatch[1],
        status: statusPart,
        statusKey: statusKey(statusPart),
        ending: flags.some((flag) => /заканч/i.test(flag)),
        flags: flags.filter(Boolean),
        source: section?.label || "",
        object: "",
        equipment: "",
        start: "",
        end: "",
        openedAt: "",
        closedAt: "",
        works: [],
        alsoSources: []
      };
      continue;
    }

    if (!current) continue;

    const field = line.match(/^([^:]{2,30}):\s*(.*)$/);
    if (!field) {
      // Перенос длинного текста работ на следующую строку.
      if (current.works.length) {
        current.works.push(...splitWorks(line));
      }
      continue;
    }

    const key = field[1].trim().toLowerCase();
    const value = field[2].trim();

    if (key === "объект") current.object = value;
    else if (key === "оборуд." || key === "оборудование") current.equipment = value;
    else if (key === "начало") {
      const [start, end] = value.split("|").map((item) => item.trim());
      current.start = start || "";
      const endMatch = String(end || "").match(/^Конец:\s*(.*)$/i);
      current.end = endMatch ? endMatch[1].trim() : "";
    } else if (key === "конец") current.end = value;
    else if (key === "открыта") current.openedAt = value;
    else if (key === "закрыта") current.closedAt = value;
    else if (key === "работы") current.works = splitWorks(value);
    else if (key === "также рэс") {
      current.alsoSources = splitSourceList(value);
    }
  }
  finish();

  const header = text.slice(0, 600);
  const periodMatch = header.match(/Смена\s+([^:\n]+):\s*([^\n]+)/i);
  const generatedMatch = header.match(/Сформировано:\s*([^\n]+)/i);
  const totalMatch = header.match(/Заявок:\s*(\d+)/i);

  return {
    format: "sk11-requests-details-v1",
    shift: periodMatch ? periodMatch[1].trim() : "",
    period: periodMatch ? periodMatch[2].trim() : "",
    generatedAt: generatedMatch ? generatedMatch[1].trim() : "",
    reportedTotal: totalMatch ? Number(totalMatch[1]) : requests.length,
    sections,
    requests
  };
}

/* ------------------------------------------------------------------ */
/* Загрузка из MAX                                                     */
/* ------------------------------------------------------------------ */

export const getLatestRequestsDetails = createAttachmentSource({
  getChatId: () => String(
    process.env.DISPATCHER_REQUESTS_CHAT_ID ||
    process.env.SK11_CHAT_ID ||
    ""
  ).trim(),
  chatEnvName: "DISPATCHER_REQUESTS_CHAT_ID",
  header: DETAILS_HEADER,
  headerLabel: "СК-11 — заявки по РЭС (детально, файл)",
  cacheKey: "lenenergo:max-mini-app:dispatcher:sk11-details",
  parse: parseRequestsDetailsText,
  noun: "заявок"
});

/*
  Заявки для набора ролей-источников: основной РЭС или любой из «Также РЭС».
*/
export function filterRequestsBySources(details, sourceLabels) {
  const keys = new Set(
    (Array.isArray(sourceLabels) ? sourceLabels : [])
      .map(normalizeRequestSourceLabel)
      .filter(Boolean)
  );
  const requests = Array.isArray(details?.requests) ? details.requests : [];
  if (!keys.size) return [];
  return requests.filter((item) =>
    keys.has(normalizeRequestSourceLabel(item.source)) ||
    item.alsoSources.some((label) => keys.has(normalizeRequestSourceLabel(label)))
  );
}
