/*
  Общая область видимости для детальных окон (заявки, НДР):
  проверка сессии и прав, выбор подразделения / РЭС с теми же правилами,
  что в интерфейсе диспетчера (scope=dispatcher, всегда конкретный РЭС)
  и в «Диспетчерском мониторинге» (scope=executive).
*/
import { getSession } from "./security.js";
import { resolveSessionAccess, hasPanel } from "./access-control.js";
import { getDispatcherStructure } from "./dispatcher-structure.js";

export function jsonResponse(data, status = 200) {
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

/*
  getUnitConfig(unitId) → { sources: [...] }
  Возвращает { error } (готовый Response) или
  { scope, scopeLabel, groupId, unitId, sources, isWholeNetwork }.
*/
export async function resolveDetailScope(request, { getUnitConfig, deniedMessage }) {
  if (request.method !== "GET") {
    return { error: jsonResponse({ error: "Method not allowed" }, 405) };
  }

  let session;
  try {
    session = getSession(request);
  } catch (error) {
    return { error: jsonResponse({ error: error instanceof Error ? error.message : "Ошибка сессии" }, 500) };
  }
  if (!session) {
    return { error: jsonResponse({ error: "Требуется авторизация" }, 401) };
  }

  const url = new URL(request.url);
  const scope = cleanId(url.searchParams.get("scope")) === "executive" ? "executive" : "dispatcher";
  const panel = scope === "executive" ? "executive-monitoring" : "dispatcher";

  const access = await resolveSessionAccess(session);
  if (!access || !hasPanel(access, panel)) {
    return { error: jsonResponse({ error: deniedMessage || "У вашей роли нет доступа к этому разделу" }, 403) };
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
    return { error: jsonResponse({ error: "Для вашей роли не назначено подразделение" }, 403) };
  }

  const availableGroups = hasAllGroups
    ? structure.groups
    : structure.groups.filter((group) => assignedGroupIds.includes(group.id));
  const availableGroupIds = new Set(availableGroups.map((group) => group.id));

  let groupId = cleanId(url.searchParams.get("group"));
  const unitId = cleanId(url.searchParams.get("unit"));

  if (groupId && !availableGroupIds.has(groupId)) {
    return { error: jsonResponse({ error: "У вашей роли нет доступа к выбранному подразделению" }, 403) };
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
      return { error: jsonResponse({ error: "У вашей роли нет доступа к выбранному РЭС / району" }, 403) };
    }
  } else if (scope === "dispatcher") {
    visibleUnits = scopeUnits.slice(0, 1);
  }

  const unitConfigs = await Promise.all(visibleUnits.map((unit) => getUnitConfig(unit.id)));
  const sources = [
    ...new Set(unitConfigs.flatMap((config) => (Array.isArray(config?.sources) ? config.sources : [])))
  ];

  const group = groupId ? groupMap.get(groupId) : null;
  const unit = unitId || scope === "dispatcher" ? visibleUnits[0] : null;
  const scopeLabel = unit
    ? `${group?.name || ""} · ${unit.name}`.replace(/^ · /, "")
    : group
      ? group.name
      : "Все подразделения";

  return {
    scope,
    scopeLabel,
    groupId: groupId || "",
    unitId: unit?.id || "",
    sources,
    // «Все подразделения» у пользователя с полным доступом — вся сеть целиком.
    isWholeNetwork: scope === "executive" && !groupId && !unitId && hasAllGroups,
    // Для переключателя в окне: только то, что доступно роли.
    filters: {
      allowAllGroups: scope === "executive",
      allowAllUnits: scope === "executive",
      groups: availableGroups.map((item) => ({ id: item.id, name: item.name })),
      units: groupId ? scopeUnits.map((item) => ({ id: item.id, name: item.name })) : []
    }
  };
}
