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
  getWorkordersUnitConfig
} from "../lib/dispatcher-workorders-config.js";

import {
  getLatestDispatcherSnapshot,
  aggregateDispatcherSources
} from "../lib/dispatcher-data.js";

import {
  getLatestWorkordersSnapshot,
  aggregateWorkordersSources
} from "../lib/dispatcher-workorders-data.js";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json(
        { error: "Method not allowed" },
        405
      );
    }

    let session;

    try {
      session = getSession(request);
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Ошибка сессии"
        },
        500
      );
    }

    if (!session) {
      return json(
        { error: "Требуется авторизация" },
        401
      );
    }

    const access =
      await resolveSessionAccess(session);

    if (
      !access ||
      !hasPanel(access, "dispatcher")
    ) {
      return json(
        {
          allowed: false,
          code: "NOT_DISPATCHER",
          message:
            "У вашей роли нет доступа к интерфейсу диспетчера"
        },
        403
      );
    }

    const structure =
      await getDispatcherStructure();

    const groups = structure.groups;
    const units = structure.units;
    const groupMap =
      new Map(
        groups.map((group) => [
          group.id,
          group
        ])
      );

    const isDeveloper =
      Boolean(access.isDeveloper);

    const hasAllDispatcherGroups =
      isDeveloper ||
      Boolean(
        access.dispatcherAllDivisions
      );

    const assignedGroupIds =
      [
        ...new Set(
          (
            Array.isArray(
              access.dispatcherDivisionIds
            )
              ? access.dispatcherDivisionIds
              : [
                  access.dispatcherDivisionId
                ]
          )
            .map(
              (value) =>
                String(value || "")
                  .trim()
                  .toLowerCase()
            )
            .filter(
              (groupId) =>
                groupMap.has(groupId)
            )
        )
      ];

    const assignedGroupId =
      assignedGroupIds[0] || "";

    if (
      !hasAllDispatcherGroups &&
      !assignedGroupIds.length
    ) {
      return json(
        {
          allowed: false,
          code: "DISPATCHER_SCOPE_NOT_CONFIGURED",
          message:
            "Для вашей диспетчерской роли не назначено действующее подразделение. Обратитесь к разработчику."
        },
        403
      );
    }

    const url = new URL(request.url);

    const requestedGroupId =
      String(
        url.searchParams.get("group") ||
        url.searchParams.get("division") ||
        ""
      )
        .trim()
        .toLowerCase();

    /*
      Серверное ограничение области доступа.
      Удалённые подразделения автоматически перестают быть доступны,
      даже если старый ID остался в роли.
    */
    const availableGroups =
      hasAllDispatcherGroups
        ? groups
        : groups.filter(
            (group) =>
              assignedGroupIds.includes(
                group.id
              )
          );

    const allowedGroupIds =
      new Set(
        availableGroups.map(
          (group) => group.id
        )
      );

    if (
      requestedGroupId &&
      !allowedGroupIds.has(
        requestedGroupId
      )
    ) {
      return json(
        {
          allowed: false,
          code: "DISPATCHER_SCOPE_DENIED",
          message:
            "У вашей роли нет доступа к выбранному подразделению"
        },
        403
      );
    }

    const selectedGroupId =
      requestedGroupId ||
      (
        hasAllDispatcherGroups
          ? availableGroups[0]?.id
          : assignedGroupId
      );

    const selectedGroup =
      groupMap.get(selectedGroupId) ||
      availableGroups[0] ||
      null;

    const availableUnits =
      selectedGroup
        ? units.filter(
            (unit) =>
              unit.groupId ===
              selectedGroup.id
          )
        : [];

    const requestedUnitId =
      String(
        url.searchParams.get("unit") ||
        ""
      )
        .trim()
        .toLowerCase();

    const selectedUnit =
      availableUnits.find(
        (unit) =>
          unit.id === requestedUnitId
      ) ||
      availableUnits[0] ||
      null;

    if (!selectedUnit) {
      return json(
        {
          allowed: true,
          code: "NO_UNITS",
          isDeveloper,
          hasAllDispatcherGroups,
          assignedGroupId,
          assignedGroupIds,
          assignedGroupName:
            hasAllDispatcherGroups
              ? "Все подразделения"
              : assignedGroupIds
                  .map(
                    (groupId) =>
                      groupMap.get(
                        groupId
                      )?.name
                  )
                  .filter(Boolean)
                  .join(" · "),
          group: selectedGroup,
          availableGroups,
          availableUnits: [],
          message:
            "Для выбранного подразделения пока не настроены РЭС/районы."
        },
        200
      );
    }

    const [
      unitConfig,
      workordersUnitConfig,
      snapshotState,
      workordersSnapshotState
    ] = await Promise.all([
      getDispatcherUnitConfig(
        selectedUnit.id
      ),
      getWorkordersUnitConfig(
        selectedUnit.id
      ),
      getLatestDispatcherSnapshot(),
      getLatestWorkordersSnapshot()
    ]);

    const aggregation =
      aggregateDispatcherSources(
        snapshotState.snapshot,
        unitConfig?.sources || []
      );

    const workordersAggregation =
      aggregateWorkordersSources(
        workordersSnapshotState.snapshot,
        workordersUnitConfig?.sources || []
      );

    return json({
      allowed: true,
      code: "READY",
      isDeveloper,
      hasAllDispatcherGroups,
      assignedGroupId,
      assignedGroupIds,
      assignedGroupName:
        hasAllDispatcherGroups
          ? "Все подразделения"
          : assignedGroupIds
              .map(
                (groupId) =>
                  groupMap.get(groupId)?.name
              )
              .filter(Boolean)
              .join(" · "),
      group: selectedGroup,
      unit: selectedUnit,
      availableGroups,
      availableUnits,
      sources: {
        configured:
          unitConfig?.sources || [],
        defaults:
          unitConfig?.defaultSources || [],
        customized:
          Boolean(unitConfig?.customized),
        matched:
          aggregation.matchedSources,
        missing:
          aggregation.missingSources,
        breakdown:
          aggregation.sourceBreakdown
      },
      requests: {
        review:
          aggregation.review,
        approved:
          aggregation.approved,
        open:
          aggregation.open,
        closed:
          aggregation.closed,
        acknowledged:
          aggregation.acknowledged,
        ending:
          aggregation.ending,
        total:
          aggregation.total
      },
      sourceData: {
        configured:
          Boolean(snapshotState.configured),
        status:
          snapshotState.status,
        message:
          snapshotState.message || "",
        stale:
          Boolean(snapshotState.stale),
        cached:
          Boolean(snapshotState.cached),
        period:
          snapshotState.snapshot?.period || "",
        sourceUpdatedAt:
          snapshotState.snapshot?.sourceUpdatedAt || "",
        messageTimestamp:
          snapshotState.snapshot?.messageTimestamp || null,
        rowCount:
          snapshotState.snapshot?.rowCount || 0,
        reportedTotal:
          snapshotState.snapshot?.reportedTotal ?? null,
        reportedEnding:
          snapshotState.snapshot?.reportedEnding ?? null
      },
      workorders: {
        counts: {
          registered:
            workordersAggregation.registered,
          created:
            workordersAggregation.created,
          admission:
            workordersAggregation.admission,
          preparation:
            workordersAggregation.preparation,
          break:
            workordersAggregation.break,
          total:
            workordersAggregation.total
        },
        sources: {
          configured:
            workordersUnitConfig?.sources || [],
          matched:
            workordersAggregation.matchedSources,
          missing:
            workordersAggregation.missingSources,
          breakdown:
            workordersAggregation.sourceBreakdown
        },
        sourceData: {
          configured:
            Boolean(workordersSnapshotState.configured),
          status:
            workordersSnapshotState.status,
          message:
            workordersSnapshotState.message || "",
          stale:
            Boolean(workordersSnapshotState.stale),
          cached:
            Boolean(workordersSnapshotState.cached),
          period:
            workordersSnapshotState.snapshot?.period || "",
          sourceUpdatedAt:
            workordersSnapshotState.snapshot?.sourceUpdatedAt || "",
          messageTimestamp:
            workordersSnapshotState.snapshot?.messageTimestamp || null,
          rowCount:
            workordersSnapshotState.snapshot?.rowCount || 0,
          parts:
            workordersSnapshotState.snapshot?.parts || 0,
          received:
            workordersSnapshotState.snapshot?.received ?? null,
          counted:
            workordersSnapshotState.snapshot?.counted ?? null,
          withoutJournal:
            workordersSnapshotState.snapshot?.withoutJournal ?? null,
          journals:
            workordersSnapshotState.snapshot?.journals ?? null
        }
      },
      defects: {
        available: false,
        message: "В разработке"
      },
      updatedAt:
        new Date().toISOString()
    });
  }
};
