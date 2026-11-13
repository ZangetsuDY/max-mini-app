import {
  getWorkordersUnitConfig
} from "../lib/dispatcher-workorders-config.js";

import {
  normalizeWorkorderLabel
} from "../lib/workorders-details-data.js";

import {
  resolveDetailScope,
  jsonResponse
} from "../lib/detail-scope.js";

import {
  listWorkorderSnapshots,
  getWorkorderHistory,
  getWorkorderShiftReport,
  getWorkorderPeriodReport,
  parseMskDateTime,
  archiveInfo
} from "../lib/workorders-archive.js";

/*
  Архив НДР:
    ?list=1      — сохранённые сводки за 32 дня (для выбора в дашборде);
    ?uid=<UID>   — жизнь наряда: все версии и что менялось;
    ?report=shift&day=ДД.ММ.ГГГГ&shift=day|night — отчёт за смену;
    ?report=period&from=ДД.ММ.ГГГГ ЧЧ:ММ&to=ДД.ММ.ГГГГ ЧЧ:ММ — за произвольный период.
  Область доступа — та же, что у дашборда НДР (scope / group / unit).
*/
export default {
  async fetch(request) {
    const scope = await resolveDetailScope(request, {
      getUnitConfig: getWorkordersUnitConfig,
      deniedMessage: "У вашей роли нет доступа к НДР этого раздела"
    });
    if (scope.error) return scope.error;

    const url = new URL(request.url);

    try {
      const reportKind = url.searchParams.get("report");
      if (reportKind === "shift" || reportKind === "period") {
        const allowed = new Set(scope.sources.map(normalizeWorkorderLabel));
        const include = scope.isWholeNetwork
          ? () => true
          : (order) => allowed.has(normalizeWorkorderLabel(order.journal));
        const scopeKey = scope.isWholeNetwork ? "all" : [...allowed].sort().join("|");
        try {
          const report = reportKind === "shift"
            ? await getWorkorderShiftReport({
              day: String(url.searchParams.get("day") || "").trim(),
              shift: url.searchParams.get("shift") === "night" ? "night" : "day",
              include,
              scopeKey
            })
            : await getWorkorderPeriodReport({
              start: parseMskDateTime(url.searchParams.get("from")) ?? NaN,
              end: parseMskDateTime(url.searchParams.get("to")) ?? NaN,
              include,
              scopeKey,
              label: "Произвольный период"
            });
          return jsonResponse({ ...report, kind: reportKind, scopeLabel: scope.scopeLabel, archive: archiveInfo() });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Не удалось построить отчёт" }, 400);
        }
      }

      const uid = String(url.searchParams.get("uid") || "").trim();
      if (uid) {
        const history = await getWorkorderHistory(uid);
        if (!history) {
          return jsonResponse({ error: "История наряда не найдена (архив хранит 32 дня)" }, 404);
        }

        if (!scope.isWholeNetwork) {
          const allowed = new Set(scope.sources.map(normalizeWorkorderLabel));
          const visible = history.events.some((event) =>
            event.state && allowed.has(normalizeWorkorderLabel(event.state.journal))
          );
          if (!visible) {
            return jsonResponse({ error: "Этот наряд не относится к выбранному подразделению" }, 403);
          }
        }

        return jsonResponse({ ...history, archive: archiveInfo() });
      }

      const snapshots = await listWorkorderSnapshots();
      return jsonResponse({
        snapshots: snapshots.map((item) => ({
          id: item.id,
          ts: item.ts,
          generatedAt: item.generatedAt,
          shift: item.shift,
          period: item.period,
          total: item.total,
          started: item.started
        })),
        archive: archiveInfo()
      });
    } catch (error) {
      console.error("Архив НДР:", error);
      return jsonResponse({ error: error instanceof Error ? error.message : "Архив недоступен" }, 500);
    }
  }
};
