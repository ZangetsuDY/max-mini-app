import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import https from "node:https";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import {
  isPreparedWorkordersText, isPreparedWorkordersMessage
} from "../lib/workorders-message.js";
import {
  preparedPeriodFromText, listPreparedWorkorders, loadPreparedWorkorders, preparedWorkordersStats
} from "../lib/prepared-workorders.js";
import { parseWorkordersDetailsText, getLatestWorkordersDetails } from "../lib/workorders-details-data.js";
import { buildWorkordersPeriodWorkbook } from "../lib/workorders-period-workbook.js";
import { archiveWorkordersFromChat, listWorkorderSnapshots, ingestWorkordersSnapshot } from "../lib/workorders-archive.js";
import { createSessionToken } from "../lib/security.js";
import { stopLocalStore } from "../lib/local-store.js";
import router from "../api/router.js";
import { setWorkordersUnitSources } from "../lib/dispatcher-workorders-config.js";

const range = "10.09.2026 08:00 - 10.10.2026 20:00";
const generated = "16.11.2026 09:42";
const file = `СК-11 — НДР (детально, файл)
Смена АРХИВНЫЙ ПЕРИОД: ${range}
Нарядов: 2 | начаты 1 (50.0%)
Сформировано: ${generated}

№ 1 — Допуск [Работы начаты]
Подразделение: Гт | Журнал: ГтЭС. Журнал НДР
Объект: ТП-1 | Места: —
Работы: Ремонт
План: 10.09.2026 08:00 — 10.09.2026 17:00
UID: order-1

№ 2 — Создан [Не проверен]
Подразделение: СЭ | Журнал: СЭС. Журнал НДР
Объект: ТП-2 | Места: —
Работы: Осмотр
План: 09.10.2026 08:00 — 10.10.2026 20:00
UID: order-2
`;
const liveFile = file.replace("АРХИВНЫЙ ПЕРИОД", "ДНЕВНАЯ").replace(range, "16.11.2026 08:00 - 16.11.2026 20:00");
const now = Date.now();
const makeMessage = (id, text, timestamp = now) => ({
  timestamp, body: { mid: id, text, attachments: [{ type: "file", filename: `${id}.txt`, payload: { url: `https://files.max.ru/${id}.txt` } }] }
});
let chatMessages = [
  makeMessage("prepared", `СК-11 — НДР (детально, файл)\n**АРХИВНЫЙ ПЕРИОД**\nСмена ДНЕВНАЯ: ${range}\nСформировано: ${generated}`),
  makeMessage("live", "СК-11 — НДР (детально, файл)", now - 1000),
  { timestamp: now, body: { mid: "no-file", text: "АРХИВНЫЙ ПЕРИОД" } }
];
const tempDir = await mkdtemp(path.join(os.tmpdir(), "prepared-wo-test-"));
process.env.DATA_DIR = tempDir;
process.env.STORAGE_BACKEND = "local";
process.env.MAX_BOT_TOKEN = "test-only-token";
process.env.DISPATCHER_WORKORDERS_CHAT_ID = "test-chat";
process.env.AUTH_SECRET = "local-test-secret";
process.env.APP_USERS_JSON = JSON.stringify([
  { username: "developer", fullName: "Тест", salt: "test", passwordHash: "test", isDeveloper: true },
  { username: "user", fullName: "Пользователь", salt: "test", passwordHash: "test" }
]);
const originalRequest = https.request;
let failMax = false;
const downloaded = [];
const attachmentFiles = new Map();
const historyFile = await readFile(new URL("./fixtures/ndr-history.txt", import.meta.url), "utf8");
https.request = (url, options, callback) => {
  const request = new EventEmitter();
  request.destroy = (error) => request.emit("error", error);
  request.end = () => queueMicrotask(() => {
    if (failMax) { request.emit("error", new Error("MAX недоступен")); return; }
    const pathname = url.pathname;
    let body;
    if (pathname === "/messages") {
      assert.equal(url.searchParams.get("chat_id"), "test-chat");
      assert.equal(options.headers.Authorization, "test-only-token");
      body = JSON.stringify({ messages: chatMessages });
    } else {
      downloaded.push(pathname);
      body = attachmentFiles.get(pathname) ?? (pathname.includes("live") ? liveFile : file);
    }
    const response = Readable.from([Buffer.from(body)]);
    response.statusCode = 200;
    response.headers = {};
    callback(response);
  });
  return request;
};
after(async () => {
  https.request = originalRequest;
  await stopLocalStore();
  await rm(tempDir, { recursive: true, force: true });
});

function requestFor(params = {}, user = "developer") {
  const headers = user ? { "X-App-Session": createSessionToken({ username: user, fullName: "Тест", isDeveloper: user === "developer" }) } : {};
  return new Request(`http://localhost/api/admin/workorders-prepared?${new URLSearchParams(params)}`, { headers });
}

// Генератор проекта пишет ZIP без сжатия; читаем XML непосредственно из него.
function workbookEntries(buffer) {
  const entries = new Map();
  for (let offset = 0; buffer.readUInt32LE(offset) === 0x04034b50;) {
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString();
    const start = offset + 30 + nameLength + extraLength;
    entries.set(name, buffer.subarray(start, start + size).toString());
    offset = start + size;
  }
  return entries;
}

test("архивный маркер, включая выделение и перенос строки", () => {
  for (const marker of ["АРХИВНЫЙ ПЕРИОД", "**Архивный период**", "АРХИВНЫЙ\nПЕРИОД", "АРХИВНЫЙ\u00a0ПЕРИОД"]) {
    assert.equal(isPreparedWorkordersText(marker), true);
  }
  assert.equal(isPreparedWorkordersMessage(chatMessages[0]), true);
  assert.equal(isPreparedWorkordersMessage(chatMessages[1]), false);
});

test("период из заголовка, без подмены датой формирования или планом наряда", () => {
  const result = preparedPeriodFromText(file);
  assert.equal(result.label, "10.09.2026 08:00 — 10.10.2026 20:00");
  assert.equal(new Date(result.start).toISOString(), "2026-09-10T05:00:00.000Z");
  assert.equal(preparedPeriodFromText("Период: 31.02.2026 08:00 - 10.10.2026 20:00"), null);
  assert.equal(preparedPeriodFromText(`Период: ${range.split(" - ").reverse().join(" - ")}`), null);
  assert.equal(preparedPeriodFromText(file.replace(`Смена АРХИВНЫЙ ПЕРИОД: ${range}`, "")), null);
});

test("даты без времени, отдельные С/По и последний день включительно", () => {
  for (const value of [historyFile, "АРХИВНЫЙ ПЕРИОД\nС: 17.08.2026\nПо: 23.08.2026"]) {
    const period = preparedPeriodFromText(value);
    assert.equal(period.label, "17.08.2026 — 23.08.2026 (включительно)");
    assert.equal(period.end - period.start, 7 * 86400000);
    assert.equal(new Date(period.end).toISOString(), "2026-08-23T21:00:00.000Z");
  }
  assert.equal(preparedPeriodFromText("Период: 17.08.2026 - 17.08.2026").end - preparedPeriodFromText("Период: 17.08.2026 - 17.08.2026").start, 86400000);
  assert.equal(preparedPeriodFromText("Период: 31.02.2026 - 23.08.2026"), null);
});

test("архивный TXT: разделитель |, записи без номера, поля и календарные дни", () => {
  const data = parseWorkordersDetailsText(historyFile);
  assert.equal(data.orders.length, 3);
  assert.equal(data.reportedTotal, 3);
  assert.equal(data.generatedAt, "18.11.2026 11:57:57");
  assert.equal(data.orders[1].number, "");
  assert.equal(data.orders[1].uid, "test-gtes");
  assert.equal(data.orders[0].journal, "КС. Журнал учета работ по НДР");
  assert.equal(data.orders[0].object, "КЛ-ТЕСТ-КС");
  assert.equal(data.orders[0].works, "Испытание кабеля");
  assert.equal(data.orders[0].planStart, "17.08.2026 10:00");
  assert.equal(data.orders[0].planEnd, "22.08.2026 23:00");
  assert.deepEqual(data.orders[0].brigade, ["Первый", "Второй"]);
  const stats = preparedWorkordersStats({ ...data, archivePeriod: preparedPeriodFromText(historyFile) });
  assert.equal(stats.total, 3);
  assert.equal(stats.split, "day");
  assert.deepEqual(stats.buckets.map((item) => item.date), ["17.08.2026", "23.08.2026"]);
  assert.equal(stats.periodTotals["status:Закрыт"], 1);
  const entries = workbookEntries(buildWorkordersPeriodWorkbook(stats, { keys: ["group:Прочие", "group:Не проверен"] }));
  assert.match(entries.get("xl/workbook.xml"), /По дням/);
  assert.match(entries.get("xl/worksheets/sheet3.xml"), /КЛ-ТЕСТ-КС/);
  assert.match(entries.get("xl/worksheets/sheet3.xml"), /НЕ|не исторические/);
});

test("список содержит только помеченные сообщения с вложениями", async () => {
  const result = await listPreparedWorkorders({ refresh: true });
  assert.equal(result.configured, true);
  assert.deepEqual(result.items.map((item) => item.id), ["prepared"]);
  assert.equal(result.items[0].generatedAt, generated);
  assert.equal(result.items[0].period, "10.09.2026 08:00 — 10.10.2026 20:00");
});

test("TXT за старый период скачивается и не распределяется по ноябрю или вымышленным дням", async () => {
  const loaded = await loadPreparedWorkorders("prepared");
  const stats = preparedWorkordersStats(loaded);
  assert.equal(stats.total, 2);
  assert.equal(stats.buckets.length, 1);
  assert.equal(stats.split, "period");
  assert.equal(stats.periodTotals["group:Работы начаты"], 1);
  assert.equal(stats.periodTotals["status:Создан"], 1);
  const workbook = buildWorkordersPeriodWorkbook(stats, { keys: ["group:Работы начаты"] });
  const entries = workbookEntries(workbook);
  assert.match(entries.get("xl/workbook.xml"), /За период/);
  assert.match(entries.get("xl/workbook.xml"), /Состояние в файле/);
  const details = entries.get("xl/worksheets/sheet3.xml");
  assert.match(details, /10.09.2026 08:00 — 10.10.2026 20:00/);
  assert.match(details, /ТП-1/);
  assert.doesNotMatch(details, /ТП-2/);
  assert.match(details, /16.11.2026 09:42/);
});

test("обычные НДР сохраняют формат листов по дням и сменам", async () => {
  const loaded = await loadPreparedWorkorders("prepared");
  const stats = preparedWorkordersStats(loaded);
  for (const [split, sheet] of [["day", "По дням"], ["shift", "По сменам"]]) {
    const workbook = buildWorkordersPeriodWorkbook({ ...stats, prepared: false, split }, { keys: ["status:Создан"] });
    const entries = workbookEntries(workbook);
    assert.match(entries.get("xl/workbook.xml"), new RegExp(sheet));
    assert.match(entries.get("xl/worksheets/sheet3.xml"), /ТП-2/);
  }
});

test("API защищает список, разбор файла и скачивание от обычного пользователя", async () => {
  for (const query of [{}, { id: "prepared", options: "1" }, { id: "prepared", keys: "status:Создан" }]) {
    assert.equal((await router.fetch(requestFor(query, null))).status, 401);
    assert.equal((await router.fetch(requestFor(query, "user"))).status, 403);
  }
});

test("полный API: список, статусы, Excel, неизвестное сообщение и пустой выбор", async () => {
  let response = await router.fetch(requestFor());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).items.length, 1);
  response = await router.fetch(requestFor({ id: "prepared", options: "1" }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).options.length, 4);
  response = await router.fetch(requestFor({ id: "prepared", keys: "status:Создан" }));
  assert.equal(response.status, 200);
  assert.match(decodeURIComponent(response.headers.get("content-disposition")), /10-09-2026_08-00_10-10-2026_20-00.xlsx/);
  const entries = workbookEntries(Buffer.from(await response.arrayBuffer()));
  assert.match(entries.get("xl/worksheets/sheet3.xml"), /ТП-2/);
  assert.equal((await router.fetch(requestFor({ id: "missing", options: "1" }))).status, 404);
  assert.equal((await router.fetch(requestFor({ id: "prepared", keys: "unknown" }))).status, 400);
});

test("текущая сводка и фоновая история игнорируют архивный период", async () => {
  const current = await getLatestWorkordersDetails();
  assert.equal(current.status, "ok");
  assert.equal(current.details.messageId, "live");
  assert.equal(current.details.isPreparedPeriod, false);
  assert.equal(Object.hasOwn(current.details.orders[0], "searchDay"), false);
  assert.deepEqual(await ingestWorkordersSnapshot(parseWorkordersDetailsText(file), { id: "direct" }), { skipped: "prepared-period" });
  const result = await archiveWorkordersFromChat();
  assert.equal(result.processed, 1);
  assert.deepEqual((await listWorkorderSnapshots()).map((item) => item.id), ["live"]);
});

test("период TXT главнее подписи, а при отсутствии периода в TXT используется подпись", async () => {
  const changed = "01.08.2026 08:00 - 31.08.2026 20:00";
  chatMessages = [makeMessage("caption", `АРХИВНЫЙ ПЕРИОД\nПериод: ${changed}`)];
  await listPreparedWorkorders({ refresh: true });
  assert.equal((await loadPreparedWorkorders("caption")).archivePeriod.from, "10.09.2026 08:00");
  attachmentFiles.set("/caption-only.txt", file.replace(`Смена АРХИВНЫЙ ПЕРИОД: ${range}`, ""));
  chatMessages = [makeMessage("caption-only", `АРХИВНЫЙ ПЕРИОД\nПериод: ${changed}`)];
  await listPreparedWorkorders({ refresh: true });
  assert.equal((await loadPreparedWorkorders("caption-only")).archivePeriod.from, "01.08.2026 08:00");
});

test("ошибочный TXT и отсутствие периода дают понятную ошибку вместо ложного Excel", async () => {
  attachmentFiles.set("/bad-file.txt", "другой документ");
  chatMessages = [makeMessage("bad-file", `АРХИВНЫЙ ПЕРИОД\n${range}`)];
  await listPreparedWorkorders({ refresh: true });
  await assert.rejects(loadPreparedWorkorders("bad-file"), /Формат TXT не распознан/);
  attachmentFiles.set("/no-period.txt", file.replace(`Смена АРХИВНЫЙ ПЕРИОД: ${range}`, ""));
  chatMessages = [makeMessage("no-period", "АРХИВНЫЙ ПЕРИОД")];
  await listPreparedWorkorders({ refresh: true });
  await assert.rejects(loadPreparedWorkorders("no-period"), /Не найден корректный архивный период/);
});

test("подразделения и статусы фильтруются на сервере по источникам обычного НДР", async () => {
  await setWorkordersUnitSources({ unitId: "ks-central", sources: ["КС. Журнал учета работ по НДР"], actor: { username: "developer" } });
  await setWorkordersUnitSources({ unitId: "gtes-gatchina", sources: ["ГтЭС. Журнал учета работ по НДР. Гатчинский РЭС"], actor: { username: "developer" } });
  attachmentFiles.set("/history.txt", historyFile);
  chatMessages = [makeMessage("history", "АРХИВНЫЙ ПЕРИОД\nСК-11 - НДР\nС: 17.08.2026\nПо: 23.08.2026\nВсего НДР: 3")];
  await listPreparedWorkorders({ refresh: true });
  let response = await router.fetch(requestFor({ id: "history", options: "1" }));
  let data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.total, 3);
  assert.equal(data.filters.units.find((unit) => unit.id === "ks-central").count, 1);
  response = await router.fetch(requestFor({ id: "history", options: "1", units: "ks-central" }));
  data = await response.json();
  assert.equal(data.total, 1);
  assert.equal(data.options.find((option) => option.kind === "status").value, "Закрыт");
  response = await router.fetch(requestFor({ id: "history", keys: "status:Закрыт", units: "ks-central" }));
  assert.equal(response.status, 200);
  let entries = workbookEntries(Buffer.from(await response.arrayBuffer()));
  assert.match(entries.get("xl/worksheets/sheet3.xml"), /КЛ-ТЕСТ-КС/);
  assert.doesNotMatch(entries.get("xl/worksheets/sheet3.xml"), /ТП-ТЕСТ-ГТ|ТП-ТЕСТ-БЕЗ-ЖУРНАЛА/);
  response = await router.fetch(requestFor({ id: "history", keys: "status:Создан", units: "ks-central|gtes-gatchina" }));
  assert.equal(response.status, 200);
  entries = workbookEntries(Buffer.from(await response.arrayBuffer()));
  assert.match(entries.get("xl/worksheets/sheet3.xml"), /ТП-ТЕСТ-ГТ/);
  assert.doesNotMatch(entries.get("xl/worksheets/sheet3.xml"), /КЛ-ТЕСТ-КС|ТП-ТЕСТ-БЕЗ-ЖУРНАЛА/);
  assert.equal((await router.fetch(requestFor({ id: "history", options: "1", units: "nonexistent" }))).status, 400);
  assert.equal((await router.fetch(requestFor({ id: "history", options: "1", units: "" }))).status, 400);
});

test("пустой чат, недоступный MAX и отсутствующая конфигурация", async () => {
  chatMessages = [];
  assert.equal((await listPreparedWorkorders({ refresh: true })).items.length, 0);
  failMax = true;
  await assert.rejects(listPreparedWorkorders({ refresh: true }), /MAX недоступен/);
  failMax = false;
  delete process.env.MAX_BOT_TOKEN;
  assert.equal((await listPreparedWorkorders()).configured, false);
});
