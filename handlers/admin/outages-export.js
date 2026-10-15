import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess,
  hasPanel
} from "../../lib/access-control.js";

import {
  getOutagesWorkbookDataset,
  buildOutagesWorkbook
} from "../../lib/outages-workbook.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/*
  Полная Excel-выгрузка аварийных и плановых отключений.
  Доступна всем, у кого есть доступ к Центру управления.
*/
export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    let session;
    try {
      session = getSession(request);
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : "Ошибка сессии"
      }, 500);
    }

    if (!session) {
      return json({ error: "Требуется авторизация" }, 401);
    }

    const access = await resolveSessionAccess(session);
    if (!access || !hasPanel(access, "system-control")) {
      return json({ error: "Недостаточно прав для выгрузки отключений" }, 403);
    }

    try {
      const generatedAt = new Date();
      const data = await getOutagesWorkbookDataset(generatedAt);
      const workbook = buildOutagesWorkbook(data);
      const stamp = new Date(generatedAt.getTime() + 3 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16)
        .replace("T", "_")
        .replace(":", "-");
      const fileName = `Отключения_аварийные_и_плановые_${stamp}.xlsx`;

      return new Response(workbook, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="outages_${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Cache-Control": "no-store",
          "Content-Length": String(workbook.length),
          "X-Outages-Emergency": String(data.emergency.rows.length),
          "X-Outages-Planned": String(data.planned.rows.length)
        }
      });
    } catch (error) {
      console.error("Outages export error:", error);
      return json({
        error: error instanceof Error
          ? error.message
          : "Не удалось сформировать выгрузку отключений"
      }, 500);
    }
  }
};
