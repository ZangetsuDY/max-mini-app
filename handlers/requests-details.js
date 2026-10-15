import {
  getSession
} from "../lib/security.js";

import {
  resolveSessionAccess,
  hasPanel
} from "../lib/access-control.js";

import {
  getDispatcherStructure
} from "../lib/dispatcher-structure.js";

import {
  getDispatcherUnitConfig
} from "../lib/dispatcher-config.js";

import {
  getLatestRequestsDetails,
  filterRequestsBySources
} from "../lib/requests-details-data.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanId(value) {
  return String(value || "").trim().toLowerCase();
}

const STATUS_ORDER = ["review", "approved", "open", "closed", "acknowledged", "other"];

/*
  Детальный список заявок для выбранного подразделения / РЭС.
  scope=dispatcher — те же правила области, что и в интерфейсе диспетчера
  (всегда конкретный РЭС); scope=executive — как в «Диспетчерском мониторинге»
  (можно все подразделения, подразделение целиком или один РЭС).
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
      return json({ error: error instanceof Error ? error.message : "Ошибка сессии" }, 500);
    }
    if (!session) {
      return json({ error: "Требуется авторизация" }, 401);
    }

    const url = new URL(request.url);
    const scope = cleanId(url.searchParams.get("scope")) === "executive" ? "executive" : "dispatcher";
    const panel = scope === "executive" ? "executive-monitoring" : "dispatcher";

    const access = await resolveSessionAccess(session);
    if (!access || !hasPanel(access, panel)) {
      return json({ error: "У вашей роли нет доступа к заявкам этого раздела" }, 403);
    }

    const structure = await getDispatcherStructure();
    const groupMap = new Map(structure.groups.map((group) => [group.id, group]));
    const assignedGroupIds = [
      ...new Set(
        (Array.isArray(access.dispatcherDivisionIds)
          ? access.dispatcherDivisionIds
          : [access.dispatcherDivisionId]
        )
          .map(cleanId)
          .filter((groupId) => groupMap.has(groupId))
      )
    ];

    const hasAllGroups =
      Boolean(access.isDeveloper) ||
      Boolean(access.dispatcherAllDivisions) ||
      (scope === "executive" && !assignedGroupIds.length);

    if (!hasAllGroups && !assignedGroupIds.length) {
      return json({ error: "Для вашей роли не назначено подразделение" }, 403);
    }

    const availableGroups = hasAllGroups
      ? structure.groups
      : structure.groups.filter((group) => assignedGroupIds.includes(group.id));
    const availableGroupIds = new Set(availableGroups.map((group) => group.id));

    let groupId = cleanId(url.searchParams.get("group"));
    const unitId = cleanId(url.searchParams.get("unit"));

    if (groupId && !availableGroupIds.has(groupId)) {
      return json({ error: "У вашей роли нет доступа к выбранному подразделению" }, 403);
    }

    if (scope === "dispatcher" && !groupId) {
      groupId = hasAllGroups ? availableGroups[0]?.id || "" : assignedGroupIds[0];
    }

    const scopeUnits = structure.units.filter((unit) =>
      groupId ? unit.groupId === groupId : availableGroupIds.has(unit.groupId)
    );

    let visibleUnits = scopeUnits;
    if (unitId) {
      visibleUnits = scopeUnits.filter((unit) => unit.id === unitId);
      if (!visibleUnits.length) {
        return json({ error: "У вашей роли нет доступа к выбранному РЭС / району" }, 403);
      }
    } else if (scope === "dispatcher") {
      visibleUnits = scopeUnits.slice(0, 1);
    }

    const [sourceState, unitConfigs] = await Promise.all([
      getLatestRequestsDetails(),
      Promise.all(visibleUnits.map((unit) => getDispatcherUnitConfig(unit.id)))
    ]);

    const sources = [
      ...new Set(unitConfigs.flatMap((config) => (Array.isArray(config?.sources) ? config.sources : [])))
    ];

    const details = sourceState.details;
    const requests = details ? filterRequestsBySources(details, sources) : [];

    const counts = { review: 0, approved: 0, open: 0, closed: 0, acknowledged: 0, other: 0, ending: 0, total: requests.length };
    for (const item of requests) {
      counts[item.statusKey] = (counts[item.statusKey] || 0) + 1;
      if (item.ending) counts.ending += 1;
    }

    const group = groupId ? groupMap.get(groupId) : null;
    const unit = unitId ? visibleUnits[0] : scope === "dispatcher" ? visibleUnits[0] : null;
    const scopeLabel = unit
      ? `${group?.name || ""} · ${unit.name}`.replace(/^ · /, "")
      : group
        ? group.name
        : "Все подразделения";

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

    return json({
      scope,
      scopeLabel,
      groupId: groupId || "",
      unitId: unit?.id || "",
      status: sourceState.status,
      message: sourceState.message || "",
      stale: Boolean(sourceState.stale),
      configured: Boolean(sourceState.configured),
      sources,
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
