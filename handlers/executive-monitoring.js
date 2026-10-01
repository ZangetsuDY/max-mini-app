import { getSession } from "../lib/security.js";
import { resolveSessionAccess, hasPanel } from "../lib/access-control.js";
import { getDispatcherStructure } from "../lib/dispatcher-structure.js";
import { getDispatcherUnitConfig } from "../lib/dispatcher-config.js";
import { getWorkordersUnitConfig } from "../lib/dispatcher-workorders-config.js";
import { getLatestDispatcherSnapshot, aggregateDispatcherSources } from "../lib/dispatcher-data.js";
import { getLatestWorkordersSnapshot, aggregateWorkordersSources } from "../lib/dispatcher-workorders-data.js";
import { getOutageDivisions } from "../lib/outage-config.js";
import { getLatestOutageSnapshot, aggregateOutageSources } from "../lib/outage-data.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
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

function sumBy(items, selector) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(selector(item) || 0), 0);
}

function summarizeRequestUnits(units) {
  return {
    review: sumBy(units, (item) => item.requests.review),
    approved: sumBy(units, (item) => item.requests.approved),
    open: sumBy(units, (item) => item.requests.open),
    closed: sumBy(units, (item) => item.requests.closed),
    acknowledged: sumBy(units, (item) => item.requests.acknowledged),
    total: sumBy(units, (item) => item.requests.total)
  };
}

function summarizeWorkorderUnits(units) {
  return {
    registered: sumBy(units, (item) => item.workorders.registered),
    created: sumBy(units, (item) => item.workorders.created),
    admission: sumBy(units, (item) => item.workorders.admission),
    preparation: sumBy(units, (item) => item.workorders.preparation),
    break: sumBy(units, (item) => item.workorders.break),
    total: sumBy(units, (item) => item.workorders.total)
  };
}

function buildSourceLookup(unitSummary) {
  const lookup = new Set();
  const unit = unitSummary?.unit || {};
  const requestSources = Array.isArray(unitSummary?.requestSources) ? unitSummary.requestSources : [];
  const workorderSources = Array.isArray(unitSummary?.workorderSources) ? unitSummary.workorderSources : [];
  const defaultSources = Array.isArray(unit?.defaultSources) ? unit.defaultSources : [];

  [unit.name, ...defaultSources, ...requestSources, ...workorderSources]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .forEach((value) => lookup.add(value.toLowerCase()));

  return lookup;
}

function matchOutageUnitCount(outageDivision, unitSummary) {
  const breakdown = Array.isArray(outageDivision?.sourceBreakdown) ? outageDivision.sourceBreakdown : [];
  const lookup = buildSourceLookup(unitSummary);

  if (!lookup.size) {
    return Number(outageDivision?.count || 0);
  }

  return breakdown.reduce((sum, source) => {
    const label = String(source?.label || source?.source || "").trim();
    const lower = label.toLowerCase();
    const matched = [...lookup].some((token) => lower === token || lower.includes(token) || token.includes(lower));
    return sum + (matched ? Number(source?.count || 0) : 0);
  }, 0);
}

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

    const access = await resolveSessionAccess(session);

    if (!access || !hasPanel(access, "executive-monitoring")) {
      return json({
        allowed: false,
        code: "NOT_EXECUTIVE_MONITORING",
        message: "У вашей роли нет доступа к панели «Диспетчерский мониторинг»"
      }, 403);
    }

    const structure = await getDispatcherStructure();
    const groupMap = new Map(structure.groups.map((group) => [group.id, group]));
    const isDeveloper = Boolean(access.isDeveloper);

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

    const hasAllGroups = isDeveloper || Boolean(access.dispatcherAllDivisions) || !assignedGroupIds.length;

    const availableGroups = hasAllGroups
      ? structure.groups
      : structure.groups.filter((group) => assignedGroupIds.includes(group.id));

    const availableGroupIds = new Set(availableGroups.map((group) => group.id));

    const allAvailableUnits = structure.units.filter((unit) => availableGroupIds.has(unit.groupId));

    const url = new URL(request.url);
    const selectedGroupId = cleanId(url.searchParams.get("group"));
    const selectedUnitId = cleanId(url.searchParams.get("unit"));

    if (selectedGroupId && !availableGroupIds.has(selectedGroupId)) {
      return json({
        allowed: false,
        code: "GROUP_SCOPE_DENIED",
        message: "У вашей роли нет доступа к выбранному подразделению"
      }, 403);
    }

    const unitsForSelectedGroup = selectedGroupId
      ? allAvailableUnits.filter((unit) => unit.groupId === selectedGroupId)
      : allAvailableUnits;

    if (selectedUnitId && !unitsForSelectedGroup.some((unit) => unit.id === selectedUnitId)) {
      return json({
        allowed: false,
        code: "UNIT_SCOPE_DENIED",
        message: "У вашей роли нет доступа к выбранному РЭС / району"
      }, 403);
    }

    const visibleUnits = selectedUnitId
      ? unitsForSelectedGroup.filter((unit) => unit.id === selectedUnitId)
      : unitsForSelectedGroup;

    const [dispatcherSnapshotState, workordersSnapshotState, outageSnapshotState, outageDivisions] = await Promise.all([
      getLatestDispatcherSnapshot(),
      getLatestWorkordersSnapshot(),
      getLatestOutageSnapshot(),
      getOutageDivisions()
    ]);

    const outageSnapshot = outageSnapshotState.snapshot;
    const outageDivisionSummaries = outageDivisions.map((division) => {
      const aggregate = aggregateOutageSources(outageSnapshot, division.sources);
      return {
        id: division.id,
        name: division.name,
        count: Number(aggregate.count || 0),
        sourceBreakdown: aggregate.sourceBreakdown,
        sourceCount: Number((aggregate.sourceBreakdown || []).length || 0)
      };
    });

    const outageDivisionMap = new Map(outageDivisionSummaries.map((division) => [cleanId(division.id), division]));

    const unitSummaries = await Promise.all(
      allAvailableUnits.map(async (unit) => {
        const [requestConfig, workorderConfig] = await Promise.all([
          getDispatcherUnitConfig(unit.id),
          getWorkordersUnitConfig(unit.id)
        ]);

        const requestAggregation = aggregateDispatcherSources(
          dispatcherSnapshotState.snapshot,
          requestConfig?.sources || []
        );

        const workorderAggregation = aggregateWorkordersSources(
          workordersSnapshotState.snapshot,
          workorderConfig?.sources || []
        );

        const group = groupMap.get(unit.groupId) || null;
        const relatedOutageDivision = outageDivisionMap.get(cleanId(unit.groupId)) || null;

        return {
          id: unit.id,
          name: unit.name,
          groupId: unit.groupId,
          groupName: group?.name || "",
          unit,
          requestSources: requestConfig?.sources || [],
          workorderSources: workorderConfig?.sources || [],
          requests: {
            review: Number(requestAggregation.review || 0),
            approved: Number(requestAggregation.approved || 0),
            open: Number(requestAggregation.open || 0),
            closed: Number(requestAggregation.closed || 0),
            acknowledged: Number(requestAggregation.acknowledged || 0),
            total: Number(requestAggregation.total || 0)
          },
          workorders: {
            registered: Number(workorderAggregation.registered || 0),
            created: Number(workorderAggregation.created || 0),
            admission: Number(workorderAggregation.admission || 0),
            preparation: Number(workorderAggregation.preparation || 0),
            break: Number(workorderAggregation.break || 0),
            total: Number(workorderAggregation.total || 0)
          },
          outages: {
            total: matchOutageUnitCount(relatedOutageDivision, {
              unit,
              requestSources: requestConfig?.sources || [],
              workorderSources: workorderConfig?.sources || []
            })
          }
        };
      })
    );

    const selectedGroup = selectedGroupId ? groupMap.get(selectedGroupId) || null : null;
    const selectedUnit = selectedUnitId ? allAvailableUnits.find((unit) => unit.id === selectedUnitId) || null : null;
    const filteredUnits = visibleUnits.length
      ? unitSummaries.filter((item) => visibleUnits.some((unit) => unit.id === item.id))
      : [];

    const requestSummary = summarizeRequestUnits(filteredUnits);
    const workorderSummary = summarizeWorkorderUnits(filteredUnits);

    const outagesSummary = (() => {
      if (selectedUnitId && filteredUnits.length) {
        return {
          total: sumBy(filteredUnits, (item) => item.outages.total),
          cards: filteredUnits.map((item) => ({ id: item.id, name: `${item.groupName} · ${item.name}`, count: item.outages.total })),
          scopeLabel: `${filteredUnits[0].groupName} · ${filteredUnits[0].name}`
        };
      }

      if (selectedGroupId) {
        const division = outageDivisionMap.get(selectedGroupId);
        return {
          total: Number(division?.count || 0),
          cards: division ? [division] : [],
          scopeLabel: selectedGroup?.name || "Подразделение"
        };
      }

      return {
        total: sumBy(outageDivisionSummaries, (item) => item.count),
        cards: outageDivisionSummaries,
        scopeLabel: "Все подразделения"
      };
    })();

    const rankedOutages = [...outagesSummary.cards]
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 8);

    const rankedRequests = [...filteredUnits]
      .sort((a, b) => Number(b.requests.total || 0) - Number(a.requests.total || 0))
      .slice(0, 8)
      .map((item) => ({ id: item.id, name: `${item.groupName} · ${item.name}`, count: item.requests.total }));

    const rankedWorkorders = [...filteredUnits]
      .sort((a, b) => Number(b.workorders.total || 0) - Number(a.workorders.total || 0))
      .slice(0, 8)
      .map((item) => ({ id: item.id, name: `${item.groupName} · ${item.name}`, count: item.workorders.total }));

    const requestLeader = rankedRequests[0] || null;
    const workorderLeader = rankedWorkorders[0] || null;
    const outageLeader = rankedOutages[0] || null;

    return json({
      allowed: true,
      code: "READY",
      isDeveloper,
      hasAllGroups,
      availableGroups,
      availableUnits: unitsForSelectedGroup,
      filter: {
        groupId: selectedGroupId || "",
        unitId: selectedUnitId || "",
        groupName: selectedGroup?.name || "",
        unitName: selectedUnit?.name || ""
      },
      scope: {
        groupCount: availableGroups.length,
        unitCount: unitsForSelectedGroup.length,
        visibleUnitCount: filteredUnits.length
      },
      headline: {
        outagesTotal: Number(outagesSummary.total || 0),
        requestsTotal: Number(requestSummary.total || 0),
        workordersTotal: Number(workorderSummary.total || 0),
        divisions: availableGroups.length,
        units: filteredUnits.length
      },
      outages: {
        status: outageSnapshotState.status,
        message: outageSnapshotState.message || "",
        stale: Boolean(outageSnapshotState.stale),
        sourceUpdatedAt: outageSnapshot?.sourceUpdatedAt || "",
        reportedTotal: outageSnapshot?.reportedTotal ?? outageSnapshot?.emergencyTotal ?? null,
        total: Number(outagesSummary.total || 0),
        scopeLabel: outagesSummary.scopeLabel,
        cards: outagesSummary.cards,
        ranked: rankedOutages
      },
      requests: {
        status: dispatcherSnapshotState.status,
        message: dispatcherSnapshotState.message || "",
        stale: Boolean(dispatcherSnapshotState.stale),
        sourceUpdatedAt: dispatcherSnapshotState.snapshot?.sourceUpdatedAt || "",
        period: dispatcherSnapshotState.snapshot?.period || "",
        rowCount: dispatcherSnapshotState.snapshot?.rowCount || 0,
        counts: requestSummary,
        ranked: rankedRequests
      },
      workorders: {
        status: workordersSnapshotState.status,
        message: workordersSnapshotState.message || "",
        stale: Boolean(workordersSnapshotState.stale),
        sourceUpdatedAt: workordersSnapshotState.snapshot?.sourceUpdatedAt || "",
        period: workordersSnapshotState.snapshot?.period || "",
        rowCount: workordersSnapshotState.snapshot?.rowCount || 0,
        counted: workordersSnapshotState.snapshot?.counted ?? null,
        received: workordersSnapshotState.snapshot?.received ?? null,
        counts: workorderSummary,
        ranked: rankedWorkorders
      },
      highlights: {
        outageLeader,
        requestLeader,
        workorderLeader
      },
      updatedAt: new Date().toISOString()
    });
  }
};
