import { getSession } from "../lib/security.js";
import { resolveSessionAccess, hasPanel } from "../lib/access-control.js";
import { getDispatcherStructure } from "../lib/dispatcher-structure.js";
import { getDispatcherUnitConfig } from "../lib/dispatcher-config.js";
import { getWorkordersUnitConfig } from "../lib/dispatcher-workorders-config.js";
import { getLatestDispatcherSnapshot, aggregateDispatcherSources } from "../lib/dispatcher-data.js";
import { getLatestWorkordersSnapshot, aggregateWorkordersSources } from "../lib/dispatcher-workorders-data.js";
import { getOutageDivisions } from "../lib/outage-config.js";
import { getLatestOutageSnapshot, aggregateOutageSources } from "../lib/outage-data.js";
import { recordExecutivePoint, selectExecutiveHistory } from "../lib/executive-history.js";

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
  return (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + Number(selector(item) || 0),
    0
  );
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
  const requestSources = Array.isArray(unitSummary?.requestSources)
    ? unitSummary.requestSources
    : [];
  const workorderSources = Array.isArray(unitSummary?.workorderSources)
    ? unitSummary.workorderSources
    : [];
  const defaultSources = Array.isArray(unit?.defaultSources)
    ? unit.defaultSources
    : [];

  [unit.name, ...defaultSources, ...requestSources, ...workorderSources]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .forEach((value) => lookup.add(value.toLowerCase()));

  return lookup;
}

function matchOutageUnitMetrics(outageDivision, unitSummary) {
  const breakdown = Array.isArray(outageDivision?.sourceBreakdown)
    ? outageDivision.sourceBreakdown
    : [];
  const lookup = buildSourceLookup(unitSummary);

  if (!lookup.size) {
    return {
      outages: Number(outageDivision?.count || 0),
      appeals: Number(outageDivision?.appeals || 0)
    };
  }

  return breakdown.reduce((result, source) => {
    const label = String(source?.label || source?.source || "").trim();
    const lower = label.toLowerCase();
    const matched = [...lookup].some(
      (token) => lower === token || lower.includes(token) || token.includes(lower)
    );

    if (matched) {
      result.outages += Number(source?.count || 0);
      result.appeals += Number(source?.appeals || 0);
    }

    return result;
  }, { outages: 0, appeals: 0 });
}

function parseSourceTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return null;

  const [, dd, mm, yyyy, hh, min, sec = "00"] = match;
  const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function historyTimestamp(sourceTimes) {
  const parsed = sourceTimes
    .map(parseSourceTime)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  return (parsed[0] || new Date()).toISOString();
}

function historyLabel(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", "");
}

function makeDelta(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  return {
    value: currentValue - previousValue,
    current: currentValue,
    previous: previousValue,
    available: previous !== null && previous !== undefined
  };
}

function operationalStatus({ outages, requests, workorders, hasOutageData }) {
  if (!hasOutageData) {
    return {
      code: "unknown",
      label: "Нет данных",
      tone: "muted"
    };
  }

  if (Number(outages || 0) > 0) {
    return {
      code: "outages",
      label: "Есть отключения",
      tone: "alert"
    };
  }

  if (Number(requests || 0) > 0 || Number(workorders || 0) > 0) {
    return {
      code: "active",
      label: "Активная работа",
      tone: "active"
    };
  }

  return {
    code: "clear",
    label: "Без активных событий",
    tone: "ok"
  };
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
      return json({
        error: error instanceof Error ? error.message : "Ошибка сессии"
      }, 500);
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
    const groupMap = new Map(
      structure.groups.map((group) => [group.id, group])
    );
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

    const hasAllGroups =
      isDeveloper ||
      Boolean(access.dispatcherAllDivisions) ||
      !assignedGroupIds.length;

    const availableGroups = hasAllGroups
      ? structure.groups
      : structure.groups.filter((group) => assignedGroupIds.includes(group.id));

    const availableGroupIds = new Set(
      availableGroups.map((group) => group.id)
    );

    const allAvailableUnits = structure.units.filter(
      (unit) => availableGroupIds.has(unit.groupId)
    );

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

    if (
      selectedUnitId &&
      !unitsForSelectedGroup.some((unit) => unit.id === selectedUnitId)
    ) {
      return json({
        allowed: false,
        code: "UNIT_SCOPE_DENIED",
        message: "У вашей роли нет доступа к выбранному РЭС / району"
      }, 403);
    }

    const visibleUnits = selectedUnitId
      ? unitsForSelectedGroup.filter((unit) => unit.id === selectedUnitId)
      : unitsForSelectedGroup;

    const [
      dispatcherSnapshotState,
      workordersSnapshotState,
      outageSnapshotState,
      outageDivisions
    ] = await Promise.all([
      getLatestDispatcherSnapshot(),
      getLatestWorkordersSnapshot(),
      getLatestOutageSnapshot(),
      getOutageDivisions()
    ]);

    const outageSnapshot = outageSnapshotState.snapshot;
    const outageDivisionSummaries = outageDivisions.map((division) => {
      const aggregate = aggregateOutageSources(
        outageSnapshot,
        division.sources
      );

      return {
        id: division.id,
        name: division.name,
        count: Number(aggregate.count || 0),
        appeals: Number(aggregate.appeals || 0),
        sourceBreakdown: (aggregate.sourceBreakdown || []).map((source) => ({
          source: source.source,
          label: source.label,
          matched: Boolean(source.matched),
          count: Number(source.count || 0),
          appeals: Number(source.appeals || 0)
        })),
        sourceCount: Number((aggregate.sourceBreakdown || []).length || 0)
      };
    });

    const outageDivisionMap = new Map(
      outageDivisionSummaries.map((division) => [cleanId(division.id), division])
    );

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
        const relatedOutageDivision =
          outageDivisionMap.get(cleanId(unit.groupId)) || null;

        const outageMetrics = matchOutageUnitMetrics(relatedOutageDivision, {
          unit,
          requestSources: requestConfig?.sources || [],
          workorderSources: workorderConfig?.sources || []
        });

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
            total: Number(outageMetrics.outages || 0),
            appeals: Number(outageMetrics.appeals || 0)
          }
        };
      })
    );

    const groupRows = availableGroups.map((group) => {
      const groupUnits = unitSummaries.filter(
        (item) => item.groupId === group.id
      );
      const requests = summarizeRequestUnits(groupUnits);
      const workorders = summarizeWorkorderUnits(groupUnits);
      const outageDivision = outageDivisionMap.get(group.id);
      const outages = outageDivision
        ? Number(outageDivision.count || 0)
        : sumBy(groupUnits, (item) => item.outages.total);
      const appeals = outageDivision
        ? Number(outageDivision.appeals || 0)
        : sumBy(groupUnits, (item) => item.outages.appeals);

      return {
        id: group.id,
        name: group.name,
        description: group.description || "",
        outages,
        appeals,
        requests: requests.total,
        workorders: workorders.total,
        openRequests: requests.review + requests.open,
        workBreaks: workorders.break,
        units: groupUnits.length,
        status: operationalStatus({
          outages,
          requests: requests.total,
          workorders: workorders.total,
          hasOutageData: Boolean(outageSnapshot)
        })
      };
    });

    const selectedGroup = selectedGroupId
      ? groupMap.get(selectedGroupId) || null
      : null;
    const selectedUnit = selectedUnitId
      ? allAvailableUnits.find((unit) => unit.id === selectedUnitId) || null
      : null;

    const filteredUnits = visibleUnits.length
      ? unitSummaries.filter((item) =>
          visibleUnits.some((unit) => unit.id === item.id)
        )
      : [];

    const requestSummary = summarizeRequestUnits(filteredUnits);
    const workorderSummary = summarizeWorkorderUnits(filteredUnits);

    const outagesSummary = (() => {
      if (selectedUnitId && filteredUnits.length) {
        return {
          total: sumBy(filteredUnits, (item) => item.outages.total),
          appeals: sumBy(filteredUnits, (item) => item.outages.appeals),
          cards: filteredUnits.map((item) => ({
            id: item.id,
            name: `${item.groupName} · ${item.name}`,
            count: item.outages.total,
            appeals: item.outages.appeals
          })),
          scopeLabel: `${filteredUnits[0].groupName} · ${filteredUnits[0].name}`
        };
      }

      if (selectedGroupId) {
        const division = outageDivisionMap.get(selectedGroupId);
        const groupRow = groupRows.find((item) => item.id === selectedGroupId);

        return {
          total: Number(division?.count ?? groupRow?.outages ?? 0),
          appeals: Number(division?.appeals ?? groupRow?.appeals ?? 0),
          cards: division
            ? [division]
            : groupRow
              ? [{ id: groupRow.id, name: groupRow.name, count: groupRow.outages, appeals: groupRow.appeals }]
              : [],
          scopeLabel: selectedGroup?.name || "Подразделение"
        };
      }

      return {
        total: sumBy(outageDivisionSummaries, (item) => item.count),
        appeals: sumBy(outageDivisionSummaries, (item) => item.appeals),
        cards: outageDivisionSummaries,
        scopeLabel: "Все подразделения"
      };
    })();

    const rankedOutages = [...outagesSummary.cards]
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 8);

    const rankedAppeals = [...outagesSummary.cards]
      .sort((a, b) => Number(b.appeals || 0) - Number(a.appeals || 0))
      .filter((item) => Number(item.appeals || 0) > 0)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        count: Number(item.appeals || 0)
      }));

    const rankedRequests = [...filteredUnits]
      .sort((a, b) => Number(b.requests.total || 0) - Number(a.requests.total || 0))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: `${item.groupName} · ${item.name}`,
        count: item.requests.total
      }));

    const rankedWorkorders = [...filteredUnits]
      .sort((a, b) => Number(b.workorders.total || 0) - Number(a.workorders.total || 0))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: `${item.groupName} · ${item.name}`,
        count: item.workorders.total
      }));

    const requestLeader = rankedRequests[0] || null;
    const workorderLeader = rankedWorkorders[0] || null;
    const outageLeader = rankedOutages[0] || null;
    const appealLeader = rankedAppeals[0] || null;

    const outageUpdatedAt = outageSnapshot?.sourceUpdatedAt || "";
    const requestsUpdatedAt =
      dispatcherSnapshotState.snapshot?.sourceUpdatedAt || "";
    const workordersUpdatedAt =
      workordersSnapshotState.snapshot?.sourceUpdatedAt || "";

    const pointTimestamp = historyTimestamp([
      outageUpdatedAt,
      requestsUpdatedAt,
      workordersUpdatedAt
    ]);

    const historySignature = [
      outageUpdatedAt,
      requestsUpdatedAt,
      workordersUpdatedAt,
      outageSnapshot?.reportedTotal ?? outageSnapshot?.emergencyTotal ?? "",
      sumBy(outageDivisionSummaries, (item) => item.appeals),
      dispatcherSnapshotState.snapshot?.reportedTotal ?? "",
      workordersSnapshotState.snapshot?.counted ?? ""
    ].join("|");

    const groupsForHistory = Object.fromEntries(
      groupRows.map((row) => [
        row.id,
        {
          outages: row.outages,
          appeals: row.appeals,
          requests: row.requests,
          workorders: row.workorders
        }
      ])
    );

    const unitsForHistory = Object.fromEntries(
      unitSummaries.map((item) => [
        item.id,
        {
          outages: item.outages.total,
          appeals: item.outages.appeals,
          requests: item.requests.total,
          workorders: item.workorders.total
        }
      ])
    );

    const history = await recordExecutivePoint({
      signature: historySignature,
      timestamp: pointTimestamp,
      label: historyLabel(pointTimestamp),
      global: {
        outages: sumBy(outageDivisionSummaries, (item) => item.count),
        appeals: sumBy(outageDivisionSummaries, (item) => item.appeals),
        requests: summarizeRequestUnits(unitSummaries).total,
        workorders: summarizeWorkorderUnits(unitSummaries).total
      },
      groups: groupsForHistory,
      units: unitsForHistory
    });

    const selectedHistory = selectExecutiveHistory(history, {
      groupId: selectedGroupId,
      unitId: selectedUnitId
    });

    const currentHistoryPoint = selectedHistory.at(-1) || null;
    const previousHistoryPoint = selectedHistory.at(-2) || null;

    const deltas = {
      outages: makeDelta(
        currentHistoryPoint?.outages ?? outagesSummary.total,
        previousHistoryPoint?.outages
      ),
      appeals: makeDelta(
        currentHistoryPoint?.appeals ?? outagesSummary.appeals,
        previousHistoryPoint?.appeals
      ),
      requests: makeDelta(
        currentHistoryPoint?.requests ?? requestSummary.total,
        previousHistoryPoint?.requests
      ),
      workorders: makeDelta(
        currentHistoryPoint?.workorders ?? workorderSummary.total,
        previousHistoryPoint?.workorders
      )
    };

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
        appealsTotal: Number(outagesSummary.appeals || 0),
        requestsTotal: Number(requestSummary.total || 0),
        workordersTotal: Number(workorderSummary.total || 0),
        divisions: availableGroups.length,
        units: filteredUnits.length
      },
      deltas,
      history: selectedHistory,
      historyConfigured: history.length > 0,
      divisionTable: groupRows,
      outages: {
        status: outageSnapshotState.status,
        message: outageSnapshotState.message || "",
        stale: Boolean(outageSnapshotState.stale),
        sourceUpdatedAt: outageUpdatedAt,
        reportedTotal:
          outageSnapshot?.reportedTotal ?? outageSnapshot?.emergencyTotal ?? null,
        total: Number(outagesSummary.total || 0),
        appeals: Number(outagesSummary.appeals || 0),
        scopeLabel: outagesSummary.scopeLabel,
        cards: outagesSummary.cards,
        ranked: rankedOutages,
        rankedAppeals
      },
      requests: {
        status: dispatcherSnapshotState.status,
        message: dispatcherSnapshotState.message || "",
        stale: Boolean(dispatcherSnapshotState.stale),
        sourceUpdatedAt: requestsUpdatedAt,
        period: dispatcherSnapshotState.snapshot?.period || "",
        rowCount: dispatcherSnapshotState.snapshot?.rowCount || 0,
        counts: requestSummary,
        ranked: rankedRequests
      },
      workorders: {
        status: workordersSnapshotState.status,
        message: workordersSnapshotState.message || "",
        stale: Boolean(workordersSnapshotState.stale),
        sourceUpdatedAt: workordersUpdatedAt,
        period: workordersSnapshotState.snapshot?.period || "",
        rowCount: workordersSnapshotState.snapshot?.rowCount || 0,
        counted: workordersSnapshotState.snapshot?.counted ?? null,
        received: workordersSnapshotState.snapshot?.received ?? null,
        counts: workorderSummary,
        ranked: rankedWorkorders
      },
      highlights: {
        outageLeader,
        appealLeader,
        requestLeader,
        workorderLeader
      },
      updatedAt: new Date().toISOString()
    });
  }
};
