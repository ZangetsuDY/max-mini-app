import {
  getSession
} from "../lib/security.js";

import {
  resolveSessionAccess,
  hasPanel
} from "../lib/access-control.js";

import {
  DISPATCHER_GROUP_REGISTRY,
  getDispatcherGroup,
  getDispatcherUnit,
  getDispatcherUnitsForGroup
} from "../lib/dispatcher-registry.js";

import {
  getDispatcherUnitConfig
} from "../lib/dispatcher-config.js";

import {
  getLatestDispatcherSnapshot,
  aggregateDispatcherSources
} from "../lib/dispatcher-data.js";

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

    const isDeveloper = Boolean(access.isDeveloper);

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
                Boolean(
                  getDispatcherGroup(
                    groupId
                  )
                )
            )
        )
      ];

    const assignedGroupId =
      assignedGroupIds[0] || "";

    if (!isDeveloper && !assignedGroupIds.length) {
      return json(
        {
          allowed: false,
          code: "DISPATCHER_SCOPE_NOT_CONFIGURED",
          message:
            "Для вашей диспетчерской роли не назначено подразделение. Обратитесь к разработчику."
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

    const availableGroups = isDeveloper
      ? DISPATCHER_GROUP_REGISTRY
      : DISPATCHER_GROUP_REGISTRY.filter(
          (group) =>
            assignedGroupIds.includes(
              group.id
            )
        );

    const allowedGroupIds =
      new Set(availableGroups.map((group) => group.id));

    const selectedGroupId =
      allowedGroupIds.has(requestedGroupId)
        ? requestedGroupId
        : (
            isDeveloper
              ? availableGroups[0]?.id
              : assignedGroupId
          );

    const selectedGroup =
      getDispatcherGroup(selectedGroupId) ||
      availableGroups[0] ||
      null;

    const availableUnits = selectedGroup
      ? getDispatcherUnitsForGroup(selectedGroup.id)
      : [];

    const requestedUnitId =
      String(url.searchParams.get("unit") || "")
        .trim()
        .toLowerCase();

    const selectedUnit =
      availableUnits.find((unit) => unit.id === requestedUnitId) ||
      availableUnits[0] ||
      null;

    if (!selectedUnit) {
      return json(
        {
          allowed: true,
          code: "NO_UNITS",
          group: selectedGroup,
          availableGroups,
          availableUnits: [],
          message: "Для выбранного подразделения пока не настроены РЭС/районы."
        },
        200
      );
    }

    const unitConfig =
      await getDispatcherUnitConfig(selectedUnit.id);

    const snapshotState =
      await getLatestDispatcherSnapshot();

    const aggregation =
      aggregateDispatcherSources(
        snapshotState.snapshot,
        unitConfig?.sources || []
      );

    return json({
      allowed: true,
      code: "READY",
      isDeveloper,
      assignedGroupId,
      assignedGroupIds,
      assignedGroupName:
        assignedGroupIds
          .map(
            (groupId) =>
              getDispatcherGroup(groupId)?.name
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
          aggregation.missingSources
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
        total:
          aggregation.total,
        ending: null
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
          snapshotState.snapshot?.reportedTotal ?? null
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
