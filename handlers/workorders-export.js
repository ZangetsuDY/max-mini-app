import { getWorkordersUnitConfig } from "../lib/dispatcher-workorders-config.js";
import { normalizeWorkorderLabel } from "../lib/workorders-details-data.js";
import { resolveDetailScope, jsonResponse } from "../lib/detail-scope.js";
import {
  getWorkorderPeriodStats,
  parseMskDateTime
} from "../lib/workorders-archive.js";
import { buildWorkordersPeriodWorkbook } from "../lib/workorders-period-workbook.js";

/*
  Выгрузка НДР за период по дням/сменам.
    ?from=ДД.ММ.ГГГГ&to=ДД.ММ.ГГГГ&split=day|shift&options=1
        — какие статусы и группы встречались в периоде (для выбора);
    ...&keys=group:Не проверен,status:Допуск — файл Excel.
  «to» включительно: до конца указанного дня. Область — как у дашборда НДР.
*/
export default {
  async fetch(request) {
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

    const scope = await resolveDetailScope(request, {
      getUnitConfig: getWorkordersUnitConfig,
      deniedMessage: "У вашей роли нет доступа к НДР этого раздела"
    });
    if (scope.error) return scope.error;

    const url = new URL(request.url);
    const start = parseMskDateTime(url.searchParams.get("from"));
    const toDay = parseMskDateTime(url.searchParams.get("to"));
    if (start === null || toDay === null) {
      return jsonResponse({ error: "Укажите даты периода в формате ДД.ММ.ГГГГ" }, 400);
    }
    const end = toDay + 24 * 60 * 60 * 1000;
    const split = url.searchParams.get("split") === "shift" ? "shift" : "day";
    const allowed = new Set(scope.sources.map(normalizeWorkorderLabel));

    try {
      const stats = await getWorkorderPeriodStats({
        start,
        end,
        split,
        include: scope.isWholeNetwork
          ? () => true
          : (order) => allowed.has(normalizeWorkorderLabel(order.journal)),
        scopeKey: scope.isWholeNetwork ? "all" : [...allowed].sort().join("|")
      });

      if (url.searchParams.get("options") === "1") {
        return jsonResponse({
          scopeLabel: scope.scopeLabel,
          periodLabel: stats.periodLabel,
          snapshots: stats.snapshots,
          days: stats.buckets.length,
          options: stats.options
        });
      }

      const known = new Set(stats.options.map((item) => item.key));
      const keys = String(url.searchParams.get("keys") || "")
        .split("|")
        .map((key) => key.trim())
        .filter((key) => known.has(key));
      if (!keys.length) return jsonResponse({ error: "Выберите хотя бы один статус" }, 400);
      if (!stats.snapshots) return jsonResponse({ error: "За этот период в архиве нет сводок НДР" }, 404);

      const generatedAt = new Date();
      const workbook = buildWorkordersPeriodWorkbook(stats, { keys, scopeLabel: scope.scopeLabel, generatedAt });
      const fromText = String(url.searchParams.get("from")).replace(/\./g, "-");
      const toText = String(url.searchParams.get("to")).replace(/\./g, "-");
      const fileName = `НДР_${split === "shift" ? "по_сменам" : "по_дням"}_${fromText}_${toText}.xlsx`;

      return new Response(workbook, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="workorders_${fromText}_${toText}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Cache-Control": "no-store",
          "Content-Length": String(workbook.length),
          "X-Wo-Buckets": String(stats.buckets.length),
          "X-Wo-Snapshots": String(stats.snapshots)
        }
      });
    } catch (error) {
      console.error("Выгрузка НДР:", error);
      return jsonResponse({ error: error instanceof Error ? error.message : "Не удалось сформировать выгрузку" }, 400);
    }
  }
};
