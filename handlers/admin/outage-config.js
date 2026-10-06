import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess
} from "../../lib/access-control.js";

import {
  isRuntimeStoreConfigured
} from "../../lib/runtime-store.js";

import {
  getOutageDivisions,
  createOutageDivision,
  updateOutageDivision,
  deleteOutageDivision
} from "../../lib/outage-config.js";

import {
  getLatestOutageSnapshot as getLatestEmergencyOutageSnapshot
} from "../../lib/outage-data.js";

import {
  getLatestOutageSnapshot as getLatestPlannedOutageSnapshot
} from "../../lib/planned-outage-data.js";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

async function requireDeveloper(request) {
  let session;

  try {
    session = getSession(request);
  } catch (error) {
    return {
      error: json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Ошибка сессии"
        },
        500
      )
    };
  }

  if (!session) {
    return {
      error: json(
        { error: "Требуется авторизация" },
        401
      )
    };
  }

  const access = await resolveSessionAccess(session);

  if (!access?.isDeveloper) {
    return {
      error: json(
        { error: "Недостаточно прав" },
        403
      )
    };
  }

  return { access };
}

export default {
  async fetch(request) {
    const auth = await requireDeveloper(request);
    if (auth.error) return auth.error;

    if (request.method === "GET") {
      try {
        const [divisions, emergencyState, plannedState] = await Promise.all([
          getOutageDivisions(),
          getLatestEmergencyOutageSnapshot(),
          getLatestPlannedOutageSnapshot()
        ]);

        const availableSourceLabels = [
          ...(Array.isArray(emergencyState.snapshot?.rowList)
            ? emergencyState.snapshot.rowList.map((row) => row.label)
            : []),
          ...(Array.isArray(plannedState.snapshot?.rowList)
            ? plannedState.snapshot.rowList.map((row) => row.label)
            : [])
        ].filter(Boolean);

        return json({
          storageConfigured: isRuntimeStoreConfigured(),
          divisions,
          availableSourceLabels: [...new Set(availableSourceLabels)],
          sourceData: {
            configured: Boolean(emergencyState.configured),
            status: emergencyState.status,
            message: emergencyState.message || "",
            sourceUpdatedAt:
              emergencyState.snapshot?.sourceUpdatedAt || "",
            rowCount:
              emergencyState.snapshot?.rowCount || 0,
            emergencyTotal:
              emergencyState.snapshot?.reportedTotal ??
              emergencyState.snapshot?.emergencyTotal ??
              null,
            plannedConfigured: Boolean(plannedState.configured),
            plannedStatus: plannedState.status,
            plannedMessage: plannedState.message || "",
            plannedSourceUpdatedAt:
              plannedState.snapshot?.sourceUpdatedAt || "",
            plannedRowCount:
              plannedState.snapshot?.rowCount || 0,
            plannedTotal:
              plannedState.snapshot?.reportedTotal ??
              plannedState.snapshot?.plannedTotal ??
              plannedState.snapshot?.emergencyTotal ??
              null
          }
        });
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Не удалось загрузить настройки активных отключений"
          },
          500
        );
      }
    }

    if (request.method !== "POST") {
      return json(
        { error: "Method not allowed" },
        405
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(
        { error: "Некорректный запрос" },
        400
      );
    }

    const action = String(body?.action || "update")
      .trim()
      .toLowerCase();

    try {
      if (action === "create") {
        const division = await createOutageDivision({
          name: body?.name,
          sources: Array.isArray(body?.sources) ? body.sources : [],
          actor: auth.access
        });

        return json({ ok: true, division });
      }

      if (action === "delete") {
        await deleteOutageDivision({
          divisionId: body?.divisionId
        });

        return json({ ok: true });
      }

      const division = await updateOutageDivision({
        divisionId: body?.divisionId,
        name: body?.name,
        sources: Array.isArray(body?.sources) ? body.sources : [],
        actor: auth.access
      });

      return json({ ok: true, division });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось изменить настройки активных отключений"
        },
        400
      );
    }
  }
};
