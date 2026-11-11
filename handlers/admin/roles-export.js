import { getSession } from "../../lib/security.js";
import { resolveSessionAccess } from "../../lib/access-control.js";
import {
  getRolesWorkbookDataset,
  buildRolesWorkbook
} from "../../lib/roles-workbook.js";

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
  Excel «Роли по подразделениям»: какие роли СК-11 назначены каждому
  РЭС/району во всех подразделениях. Только для разработчика — как и
  сами настройки ролей.
*/
export default {
  async fetch(request) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

    let session;
    try {
      session = getSession(request);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Ошибка сессии" }, 500);
    }
    if (!session) return json({ error: "Требуется авторизация" }, 401);

    const access = await resolveSessionAccess(session);
    if (!access?.isDeveloper) return json({ error: "Недостаточно прав" }, 403);

    try {
      const generatedAt = new Date();
      const data = await getRolesWorkbookDataset(generatedAt);
      const workbook = buildRolesWorkbook(data);
      const stamp = new Date(generatedAt.getTime() + 3 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16)
        .replace("T", "_")
        .replace(":", "-");
      const fileName = `Роли_по_подразделениям_${stamp}.xlsx`;
      const units = data.groups.reduce((sum, group) => sum + group.units.length, 0);

      return new Response(workbook, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="roles_${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Cache-Control": "no-store",
          "Content-Length": String(workbook.length),
          "X-Roles-Groups": String(data.groups.length),
          "X-Roles-Units": String(units)
        }
      });
    } catch (error) {
      console.error("Roles export error:", error);
      return json({ error: error instanceof Error ? error.message : "Не удалось сформировать выгрузку ролей" }, 500);
    }
  }
};
