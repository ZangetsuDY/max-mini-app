import { getSession } from "../../lib/security.js";
import { resolveSessionAccess } from "../../lib/access-control.js";
import { listPreparedWorkorders, loadPreparedWorkorders, preparedWorkordersStats } from "../../lib/prepared-workorders.js";
import { buildWorkordersPeriodWorkbook } from "../../lib/workorders-period-workbook.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    try {
      const session = getSession(request);
      if (!session) return json({ error: "Требуется авторизация" }, 401);
      const access = await resolveSessionAccess(session);
      if (!access?.isDeveloper) return json({ error: "Недостаточно прав" }, 403);
    } catch (error) {
      console.error("Авторизация выгрузки архивного периода:", error);
      return json({ error: "Не удалось проверить права доступа" }, 500);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    try {
      if (!id) return json(await listPreparedWorkorders({ refresh: url.searchParams.get("refresh") === "1" }));
      const details = await loadPreparedWorkorders(id);
      const stats = preparedWorkordersStats(details);
      if (url.searchParams.get("options") === "1") {
        return json({ id, period: stats.periodLabel, generatedAt: details.generatedAt,
          fileName: details.fileName, total: stats.total, options: stats.options });
      }
      const known = new Set(stats.options.map((option) => option.key));
      const keys = [...new Set(String(url.searchParams.get("keys") || "").split("|"))].filter((key) => known.has(key));
      if (!keys.length) return json({ error: "Выберите хотя бы одну группу или статус" }, 400);
      const workbook = buildWorkordersPeriodWorkbook(stats, { keys, scopeLabel: "Архивный период · вся сеть" });
      const stamp = (value) => value.replace(/\./g, "-").replace(/\s+/g, "_").replace(/:/g, "-");
      const fileName = `НДР_архивный_период_${stamp(details.archivePeriod.from)}_${stamp(details.archivePeriod.to)}.xlsx`;
      return new Response(workbook, { headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="workorders_archive.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store", "Content-Length": String(workbook.length)
      } });
    } catch (error) {
      console.error("Выгрузка архивного периода НДР:", error);
      return json({ error: error instanceof Error ? error.message : "Не удалось выгрузить архивный период" }, error.status || 400);
    }
  }
};
