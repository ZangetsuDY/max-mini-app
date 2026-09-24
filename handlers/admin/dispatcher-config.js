import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess
} from "../../lib/access-control.js";

import {
  DISPATCHER_GROUP_REGISTRY
} from "../../lib/dispatcher-registry.js";

import {
  getDispatcherSourceConfig,
  setDispatcherUnitSources,
  resetDispatcherUnitSources
} from "../../lib/dispatcher-config.js";

import {
  isRuntimeStoreConfigured
} from "../../lib/runtime-store.js";

import {
  getLatestDispatcherSnapshot
} from "../../lib/dispatcher-data.js";

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

async function requireDeveloper(request) {
  const session = getSession(request);
  if (!session) return { error: json({ error: "Требуется авторизация" }, 401) };

  const access = await resolveSessionAccess(session);
  if (!access?.isDeveloper) {
    return { error: json({ error: "Недостаточно прав" }, 403) };
  }

  return { access };
}

export default {
  async fetch(request) {
    const auth = await requireDeveloper(request);
    if (auth.error) return auth.error;

    if (request.method === "GET") {
      try {
        const [
          units,
          sourceState
        ] = await Promise.all([
          getDispatcherSourceConfig(),
          getLatestDispatcherSnapshot()
        ]);

        return json({
          storageConfigured:
            isRuntimeStoreConfigured(),
          groups:
            DISPATCHER_GROUP_REGISTRY,
          units,
          availableSourceLabels:
            Array.isArray(
              sourceState.snapshot?.rowList
            )
              ? sourceState.snapshot.rowList.map(
                  (row) => row.label
                )
              : [],
          sourceData: {
            configured:
              Boolean(sourceState.configured),
            status:
              sourceState.status,
            message:
              sourceState.message || "",
            sourceUpdatedAt:
              sourceState.snapshot?.sourceUpdatedAt || "",
            rowCount:
              sourceState.snapshot?.rowCount || 0
          }
        });
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Не удалось загрузить источники РЭС"
          },
          500
        );
      }
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Некорректный запрос" }, 400); }

    const action =
      String(body?.action || "save").trim().toLowerCase();

    try {
      if (action === "reset") {
        const unit = await resetDispatcherUnitSources({
          unitId: body?.unitId
        });
        return json({ ok: true, unit });
      }

      const unit = await setDispatcherUnitSources({
        unitId: body?.unitId,
        sources:
          Array.isArray(body?.sources)
            ? body.sources
            : [],
        actor: auth.access
      });

      return json({ ok: true, unit });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось сохранить источники РЭС"
        },
        400
      );
    }
  }
};
