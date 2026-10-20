import {
  getWorkordersUnitConfig
} from "../lib/dispatcher-workorders-config.js";

import {
  getLatestWorkordersDetails,
  filterWorkordersBySources
} from "../lib/workorders-details-data.js";

import {
  resolveDetailScope,
  jsonResponse
} from "../lib/detail-scope.js";

import {
  loadWorkorderSnapshot,
  archiveInBackground,
  archiveInfo
} from "../lib/workorders-archive.js";

const GROUP_ORDER = ["notChecked", "checked", "started", "notAdmitted", "other"];

/*
  Детальные НДР для дашборда и списка нарядов.
  Наряд попадает в область, если его журнал подключён к выбранным РЭС
  (те же источники, что у счётчика НДР). «Все подразделения» при полном
  доступе — все наряды файла, включая подрядчиков и наряды без журнала.
  Агрегаты для графиков считает клиент — по уже отфильтрованному списку.
*/
export default {
  async fetch(request) {
    const scope = await resolveDetailScope(request, {
      getUnitConfig: getWorkordersUnitConfig,
      deniedMessage: "У вашей роли нет доступа к НДР этого раздела"
    });
    if (scope.error) return scope.error;

    // Архивная сводка (?snapshot=ID) или текущая из чата.
    const snapshotId = String(new URL(request.url).searchParams.get("snapshot") || "").trim();
    let sourceState;
    if (snapshotId) {
      const archived = await loadWorkorderSnapshot(snapshotId).catch(() => null);
      if (!archived) {
        return jsonResponse({ error: "Сводка не найдена в архиве (хранится 32 дня)" }, 404);
      }
      sourceState = { configured: true, status: "ok", message: "", stale: false, details: archived };
    } else {
      sourceState = await getLatestWorkordersDetails();
      archiveInBackground();
    }
    const details = sourceState.details;
    const orders = !details
      ? []
      : [...(scope.isWholeNetwork
        ? details.orders
        : filterWorkordersBySources(details, scope.sources))];

    // Группа (воронка), затем «начало в смену», затем плановое начало.
    const timeKey = (value) => {
      const match = String(value || "").match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
      return match ? `${match[3]}${match[2]}${match[1]}${match[4]}${match[5]}` : "99999999999999";
    };
    orders.sort((a, b) =>
      GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) ||
      Number(b.startsInShift) - Number(a.startsInShift) ||
      timeKey(a.planStart).localeCompare(timeKey(b.planStart))
    );

    return jsonResponse({
      scope: scope.scope,
      scopeLabel: scope.scopeLabel,
      groupId: scope.groupId,
      unitId: scope.unitId,
      status: sourceState.status,
      message: sourceState.message || "",
      stale: Boolean(sourceState.stale),
      configured: Boolean(sourceState.configured),
      sources: scope.sources,
      shift: details?.shift || "",
      period: details?.period || "",
      generatedAt: details?.generatedAt || "",
      fileName: details?.fileName || "",
      reportedTotal: details?.reportedTotal ?? null,
      snapshotId: snapshotId || "",
      isArchive: Boolean(snapshotId),
      archive: archiveInfo(),
      orders,
      updatedAt: new Date().toISOString()
    });
  }
};
