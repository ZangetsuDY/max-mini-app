/* Используем ту же область доступа и те же журналы НДР, что и обычная
   выгрузка. Название поля «Подразделение» внутри TXT не заменяет эту связь. */
import { resolveDetailScope } from "./detail-scope.js";
import { getWorkordersSourceConfig, getWorkordersUnitConfig } from "./dispatcher-workorders-config.js";
import { normalizeWorkorderLabel } from "./workorders-details-data.js";

export async function resolvePreparedWorkordersScope(request) {
  const url = new URL(request.url);
  const scopeUrl = new URL(url);
  scopeUrl.searchParams.set("scope", "executive");
  scopeUrl.searchParams.delete("group");
  scopeUrl.searchParams.delete("unit");
  const scope = await resolveDetailScope(new Request(scopeUrl, { headers: request.headers }), {
    getUnitConfig: getWorkordersUnitConfig,
    deniedMessage: "У вашей роли нет доступа к выгрузке НДР"
  });
  if (scope.error) return scope;

  const groupIds = new Set(scope.filters.groups.map((group) => group.id));
  const units = (await getWorkordersSourceConfig()).filter((unit) => groupIds.has(unit.groupId));
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const raw = url.searchParams.get("units");
  const whole = raw === null || raw === "all";
  const ids = whole ? units.map((unit) => unit.id) : [...new Set(raw.split("|").filter(Boolean))];
  if (!whole && (!ids.length || ids.some((id) => !byId.has(id)))) {
    return { error: new Response(JSON.stringify({ error: "Выберите доступные подразделения / РЭС для выгрузки" }), {
      status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }
    }) };
  }
  const selected = ids.map((id) => byId.get(id));
  const sources = new Set(selected.flatMap((unit) => unit.sources).map(normalizeWorkorderLabel));
  const isWholeNetwork = whole && scope.isWholeNetwork;
  const names = selected.map((unit) => {
    const group = scope.filters.groups.find((group) => group.id === unit.groupId);
    return `${group?.name || ""} · ${unit.name}`;
  });
  return {
    units,
    groups: scope.filters.groups,
    whole,
    selectedIds: whole ? [] : ids,
    include: isWholeNetwork ? () => true : (order) => sources.has(normalizeWorkorderLabel(order.journal)),
    scopeLabel: whole ? scope.scopeLabel : names.join("; ")
  };
}

export function preparedWorkordersFilters(details, scope) {
  const journals = new Map();
  const all = new Set();
  details.orders.forEach((order, index) => {
    const uid = order.uid || (order.number ? `${order.journal}\u0000${order.number}` : `row:${index}`);
    all.add(uid);
    const journal = normalizeWorkorderLabel(order.journal);
    if (!journals.has(journal)) journals.set(journal, new Set());
    journals.get(journal).add(uid);
  });
  return {
    whole: scope.whole,
    selectedIds: scope.selectedIds,
    groups: scope.groups,
    total: all.size,
    units: scope.units.map((unit) => {
      const seen = new Set();
      for (const source of unit.sources) {
        for (const uid of journals.get(normalizeWorkorderLabel(source)) || []) seen.add(uid);
      }
      return { id: unit.id, groupId: unit.groupId, name: unit.name, count: seen.size, configured: Boolean(unit.sources.length) };
    })
  };
}
