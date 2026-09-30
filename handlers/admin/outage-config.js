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
  getLatestOutageSnapshot
} from "../../lib/outage-data.js";

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
        const [divisions, sourceState] = await Promise.all([
          getOutageDivisions(),
          getLatestOutageSnapshot()
        ]);

        return json({
          storageConfigured: isRuntimeStoreConfigured(),
          divisions,
          availableSourceLabels:
            Array.isArray(sourceState.snapshot?.rowList)
              ? sourceState.snapshot.rowList.map((row) => row.label)
              : [],
          sourceData: {
            configured: Boolean(sourceState.configured),
            status: sourceState.status,
            message: sourceState.message || "",
            sourceUpdatedAt:
              sourceState.snapshot?.sourceUpdatedAt || "",
            rowCount:
              sourceState.snapshot?.rowCount || 0,
            emergencyTotal:
              sourceState.snapshot?.reportedTotal ??
              sourceState.snapshot?.emergencyTotal ??
              null
          }
        });
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Не удалось загрузить настройки аварийных отключений"
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
              : "Не удалось изменить настройки аварийных отключений"
        },
        400
      );
    }
  }
};
