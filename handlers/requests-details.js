import {
  getDispatcherUnitConfig
} from "../lib/dispatcher-config.js";

import {
  getLatestRequestsDetails,
  filterRequestsBySources
} from "../lib/requests-details-data.js";

import {
  resolveDetailScope,
  jsonResponse
} from "../lib/detail-scope.js";

const STATUS_ORDER = ["review", "approved", "open", "closed", "acknowledged", "other"];

/*
  Детальный список заявок для выбранного подразделения / РЭС.
  Заявка попадает, если РЭС — основной или указан в «Также РЭС».
*/
export default {
  async fetch(request) {
    const scope = await resolveDetailScope(request, {
      getUnitConfig: getDispatcherUnitConfig,
      deniedMessage: "У вашей роли нет доступа к заявкам этого раздела"
    });
    if (scope.error) return scope.error;

    const sourceState = await getLatestRequestsDetails();
    const details = sourceState.details;
    const requests = details ? filterRequestsBySources(details, scope.sources) : [];

    const counts = { review: 0, approved: 0, open: 0, closed: 0, acknowledged: 0, other: 0, ending: 0, total: requests.length };
    for (const item of requests) {
      counts[item.statusKey] = (counts[item.statusKey] || 0) + 1;
      if (item.ending) counts.ending += 1;
    }

    // Сортировка: статус, затем «заканчивается в смену» и ближайший конец.
    const endKey = (value) => {
      const match = String(value || "").match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
      return match ? `${match[3]}${match[2]}${match[1]}${match[4]}${match[5]}` : "99999999999999";
    };
    requests.sort((a, b) =>
      STATUS_ORDER.indexOf(a.statusKey) - STATUS_ORDER.indexOf(b.statusKey) ||
      Number(b.ending) - Number(a.ending) ||
      endKey(a.end).localeCompare(endKey(b.end)) ||
      Number(a.id) - Number(b.id)
    );

    return jsonResponse({
      scope: scope.scope,
      scopeLabel: scope.scopeLabel,
      groupId: scope.groupId,
      unitId: scope.unitId,
      filters: scope.filters,
      status: sourceState.status,
      message: sourceState.message || "",
      stale: Boolean(sourceState.stale),
      configured: Boolean(sourceState.configured),
      sources: scope.sources,
      shift: details?.shift || "",
      period: details?.period || "",
      generatedAt: details?.generatedAt || "",
      fileName: details?.fileName || "",
      counts,
      requests,
      updatedAt: new Date().toISOString()
    });
  }
};
