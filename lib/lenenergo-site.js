/*
  Публичный «График плановых работ» rosseti-lenenergo.ru (1С-Битрикс).
  API у сайта нет: страница отдаёт HTML-таблицу, фильтры — GET-параметры
  формы #plannedWork (reg, res, street, date_start, date_finish),
  страницы — PAGEN_1. Сайт закрыт DDoS-Guard: блокировку распознаём
  и показываем в центре управления.
*/
import crypto from "node:crypto";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";
import zlib from "node:zlib";

const SITE_ORIGIN = "https://rosseti-lenenergo.ru";
const PLANNED_PATH = "/clients/planned_work/";
const MAX_PAGE_BYTES = 6 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export const LENENERGO_REGIONS = Object.freeze([
  { id: "4", name: "Санкт-Петербург" },
  { id: "5", name: "Ленинградская область" }
]);

// Коды РЭС из фильтра на сайте.
export const LENENERGO_RES = Object.freeze([
  ["71", "Выборгский РЭС"], ["72", "Приозерский РЭС"], ["73", "Рощинский РЭС"], ["74", "Сосновский РЭС"],
  ["67", "Гатчинский РЭС"], ["77", "Тосненский РЭС"], ["78", "Кингисеппский РЭС"], ["79", "Лужский РЭС"],
  ["80", "Волховский РЭС"], ["81", "Лодейнопольский РЭС"], ["52", "Бокситогорский РЭС"], ["53", "Тихвинский РЭС"],
  ["51", "Всеволожский РЭС"], ["55", "Сертоловский РЭС"], ["54", "Курортный РЭС"], ["76", "Зеленогорский РЭС"],
  ["68", "Сестрорецкий РЭС"], ["59", "Красносельский РЭС"], ["75", "Ломоносовский РЭС"], ["83", "Петродворцовый РЭС"],
  ["82", "Пушкинский РЭС"], ["58", "Колпинский РЭС"], ["50", "Невский РЭС"], ["56", "Восточный РЭС"],
  ["57", "Западный РЭС"], ["60", "Островной РЭС"], ["61", "Песочинский РЭС"], ["62", "Правобережный РЭС"],
  ["63", "Северный РЭС"], ["64", "Центральный РЭС"], ["65", "Юго-Западный РЭС"], ["66", "Южный РЭС"],
  ["69", "район №1"], ["70", "район №2"]
].map(([id, name]) => ({ id, name })));

let agent = null;
function getAgent() {
  if (agent) return agent;
  const russianRoot = new crypto.X509Certificate(
    fs.readFileSync(new URL("../certs/Russian_Trusted_Root_CA.cer", import.meta.url))
  ).toString();
  agent = new https.Agent({ keepAlive: true, ca: [...tls.rootCertificates, russianRoot] });
  return agent;
}

// Куки DDoS-Guard (__ddg*) и PHPSESSID живут между запросами процесса.
const cookieJar = new Map();

function rememberCookies(setCookie) {
  for (const line of [].concat(setCookie || [])) {
    const pair = String(line).split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) cookieJar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function cookieHeader() {
  return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function request(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const startedAt = Date.now();
    const headers = {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru,en;q=0.9",
      "Accept-Encoding": "gzip, deflate",
      Referer: `${SITE_ORIGIN}${PLANNED_PATH}`
    };
    const cookies = cookieHeader();
    if (cookies) headers.Cookie = cookies;

    const req = https.request(target, { method: "GET", agent: getAgent(), headers, timeout: 20000 }, (res) => {
      rememberCookies(res.headers["set-cookie"]);
      const status = Number(res.statusCode || 0);
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        res.resume();
        const next = new URL(res.headers.location, target);
        if (next.hostname !== target.hostname) {
          reject(new Error(`Сайт перенаправил на другой домен: ${next.hostname}`));
          return;
        }
        resolve(request(next, redirects - 1));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_PAGE_BYTES) req.destroy(new Error("Страница слишком большая"));
        else chunks.push(chunk);
      });
      res.on("end", () => {
        let body = Buffer.concat(chunks);
        try {
          const encoding = String(res.headers["content-encoding"] || "");
          if (encoding.includes("gzip")) body = zlib.gunzipSync(body);
          else if (encoding.includes("deflate")) body = zlib.inflateSync(body);
        } catch {
          // Оставляем как есть — ниже это распознается как «не таблица».
        }
        resolve({
          status,
          ms: Date.now() - startedAt,
          server: String(res.headers.server || ""),
          html: body.toString("utf8")
        });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Сайт не ответил за 20 секунд")));
    req.on("error", reject);
    req.end();
  });
}

const ENTITIES = { nbsp: " ", amp: "&", quot: "\"", lt: "<", gt: ">", laquo: "«", raquo: "»", mdash: "—", ndash: "–", apos: "'" };

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

function cellLines(cellHtml) {
  return decodeEntities(
    cellHtml
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<\/span>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

function cellText(cellHtml) {
  return decodeEntities(cellHtml.replace(/<svg[\s\S]*?<\/svg>/gi, "").replace(/<[^>]+>/g, ""))
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Строки таблицы плановых работ → объекты.
export function parsePlannedWorkHtml(html) {
  const rows = [];
  const rowPattern = /<tr id="bx_\d+_(\d+)">([\s\S]*?)<\/tr>/g;
  let match;
  while ((match = rowPattern.exec(html))) {
    const cells = match[2].split(/<td[^>]*>/i).slice(1).map((cell) => cell.replace(/<\/td>[\s\S]*$/i, ""));
    if (cells.length < 7) continue;
    const place = cellLines(cells[0]);
    rows.push({
      id: match[1],
      region: place[0] || "",
      district: place.slice(1).join(", "),
      addresses: cellLines(cells[1]),
      start: cellLines(cells[2]).join(" "),
      end: cellLines(cells[3]).join(" "),
      branch: cellLines(cells[4]).join(" "),
      res: cellLines(cells[5]).join(" "),
      comment: cellText(cells[6]),
      fias: cells[7] ? [...new Set(cellLines(cells[7]))] : []
    });
  }
  const pages = [...html.matchAll(/PAGEN_1=(\d+)/g)].map((item) => Number(item[1]));
  return { rows, totalPages: pages.length ? Math.max(...pages) : 1 };
}

function detectBlock(response, parsed) {
  const html = response.html;
  if (/DDoS-Guard/i.test(html) && !parsed.rows.length) {
    if (/restricted access from your current IP/i.test(html)) {
      return "DDoS-Guard блокирует IP-адрес сервера (доступ закрыт по стране или сети)";
    }
    return "DDoS-Guard показал проверку браузера вместо страницы";
  }
  if (response.status >= 400) return `Сайт ответил ошибкой HTTP ${response.status}`;
  if (!/plannedWork/i.test(html)) return "Пришла страница без таблицы плановых работ";
  return "";
}

export function buildPlannedWorkUrl({ reg = "", res = "", street = "", page = 1 } = {}) {
  const url = new URL(PLANNED_PATH, SITE_ORIGIN);
  if (reg) url.searchParams.set("reg", reg);
  if (res) url.searchParams.set("res", res);
  if (street) url.searchParams.set("street", street);
  if (page > 1) url.searchParams.set("PAGEN_1", String(page));
  return url.toString();
}

/*
  Проверка доступа и пробная выборка. district — дополнительный фильтр
  по району (сайт сам по району не фильтрует), maxPages — сколько страниц
  результата читать (по 50 строк).
*/
export async function probePlannedWork({ reg = "", res = "", street = "", district = "", maxPages = 3 } = {}) {
  const steps = [];
  const rows = [];
  let totalPages = 1;
  let blocked = "";

  for (let page = 1; page <= Math.max(1, Math.min(maxPages, 5)); page += 1) {
    const url = buildPlannedWorkUrl({ reg, res, street, page });
    let response;
    try {
      response = await request(url);
      // DDoS-Guard часто пускает со второго запроса, когда куки уже выданы.
      if (page === 1 && /DDoS-Guard/i.test(response.html) && !/plannedWork/i.test(response.html) && cookieJar.size) {
        steps.push({ url, status: response.status, ms: response.ms, note: "первый ответ — DDoS-Guard, повтор с куками" });
        response = await request(url);
      }
    } catch (error) {
      steps.push({ url, status: 0, ms: 0, note: error instanceof Error ? error.message : "Ошибка соединения" });
      blocked = "Нет соединения с сайтом";
      break;
    }

    const parsed = parsePlannedWorkHtml(response.html);
    blocked = detectBlock(response, parsed);
    steps.push({ url, status: response.status, ms: response.ms, server: response.server, rows: parsed.rows.length, note: blocked });
    if (blocked) break;

    totalPages = parsed.totalPages;
    rows.push(...parsed.rows);
    if (page >= totalPages) break;
  }

  const districtFilter = district.trim().toLowerCase();
  const filtered = districtFilter
    ? rows.filter((row) => `${row.district} ${row.addresses.join(" ")} ${row.res}`.toLowerCase().includes(districtFilter))
    : rows;

  return {
    ok: !blocked,
    blocked,
    checkedAt: new Date().toISOString(),
    query: { reg, res, street, district },
    totalPages,
    fetchedRows: rows.length,
    rows: filtered,
    steps
  };
}
