import {
  validateMaxInitData,
  getSession
} from "../lib/security.js";

import {
  getSystemState
} from "../lib/runtime-store.js";

import {
  resolveSessionAccess,
  hasPanel
} from "../lib/access-control.js";

import {
  getOutageDivisions
} from "../lib/outage-config.js";

import {
  getLatestOutageSnapshot,
  aggregateOutageSources
} from "../lib/outage-data.js";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
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

    const botToken =
      String(process.env.MAX_BOT_TOKEN || "").trim();

    if (!botToken) {
      return json(
        { error: "На сервере не настроен MAX_BOT_TOKEN" },
        500
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

    const access = await resolveSessionAccess(session);

    if (
      !access ||
      !hasPanel(access, "monitoring")
    ) {
      return json(
        {
          error:
            "У вашей роли нет доступа к аварийному мониторингу"
        },
        403
      );
    }

    try {
      const systemState = await getSystemState();

      if (
        systemState.mode !== "normal" &&
        !hasPanel(access, "system-control")
      ) {
        const fallback =
          systemState.mode === "maintenance"
            ? "Система временно переведена в режим технических работ."
            : "Система временно остановлена.";

        return json(
          {
            error:
              systemState.message || fallback,
            code: "SYSTEM_UNAVAILABLE",
            system: systemState
          },
          503
        );
      }
    } catch (error) {
      console.error(
        "Не удалось проверить режим системы:",
        error
      );
    }

    const initData =
      request.headers.get("X-Max-Init-Data") || "";

    const validation = validateMaxInitData(
      initData,
      botToken
    );

    if (!validation.ok) {
      return json(
        { error: validation.reason },
        401
      );
    }

    try {
      const [divisions, sourceState] = await Promise.all([
        getOutageDivisions(),
        getLatestOutageSnapshot()
      ]);

      const snapshot = sourceState.snapshot;

      const resultDivisions = divisions.map((division) => {
        const aggregate = aggregateOutageSources(
          snapshot,
          division.sources
        );

        return {
          id: division.id,
          name: division.name,
          count: aggregate.count,
          configuredSources:
            aggregate.configuredSources,
          matchedSources:
            aggregate.matchedSources,
          missingSources:
            aggregate.missingSources,
          sourceBreakdown:
            aggregate.sourceBreakdown
        };
      });

      const total = snapshot
        ? Number(
            snapshot.reportedTotal ??
            snapshot.emergencyTotal ??
            0
          )
        : null;

      return json({
        configured: Boolean(sourceState.configured),
        status: sourceState.status,
        message: sourceState.message || "",
        stale: Boolean(sourceState.stale),
        cached: Boolean(sourceState.cached),
        total,
        sourceUpdatedAt:
          snapshot?.sourceUpdatedAt || "",
        messageTimestamp:
          snapshot?.messageTimestamp || null,
        availableDepartments:
          snapshot?.rowCount || 0,
        withoutDepartment:
          snapshot?.withoutDepartment ?? null,
        divisions: resultDivisions,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);

      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось получить аварийные отключения"
        },
        502
      );
    }
  }
};
