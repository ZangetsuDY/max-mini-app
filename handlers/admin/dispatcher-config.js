import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess
} from "../../lib/access-control.js";

import {
  getDispatcherSourceConfig,
  setDispatcherUnitSources,
  resetDispatcherUnitSources
} from "../../lib/dispatcher-config.js";

import {
  getDispatcherStructure,
  createDispatcherGroup,
  updateDispatcherGroup,
  deleteDispatcherGroup,
  createDispatcherUnit,
  deleteDispatcherUnit
} from "../../lib/dispatcher-structure.js";

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
  if (!session) {
    return {
      error: json(
        { error: "Требуется авторизация" },
        401
      )
    };
  }

  const access =
    await resolveSessionAccess(session);

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
    const auth =
      await requireDeveloper(request);

    if (auth.error) {
      return auth.error;
    }

    if (request.method === "GET") {
      try {
        const [
          units,
          sourceState,
          structure
        ] =
          await Promise.all([
            getDispatcherSourceConfig(),
            getLatestDispatcherSnapshot(),
            getDispatcherStructure()
          ]);

        return json({
          storageConfigured:
            isRuntimeStoreConfigured(),
          groups:
            structure.groups,
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
                : "Не удалось загрузить структуру диспетчерского интерфейса"
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

    const action =
      String(body?.action || "save")
        .trim()
        .toLowerCase();

    try {
      if (action === "create_group") {
        const group =
          await createDispatcherGroup({
            name: body?.name,
            description:
              body?.description,
            actor: auth.access
          });

        return json({
          ok: true,
          group
        });
      }

      if (action === "update_group") {
        const group =
          await updateDispatcherGroup({
            groupId: body?.groupId,
            name: body?.name,
            description:
              body?.description,
            actor: auth.access
          });

        return json({
          ok: true,
          group
        });
      }

      if (action === "delete_group") {
        await deleteDispatcherGroup({
          groupId: body?.groupId,
          actor: auth.access
        });

        return json({ ok: true });
      }

      if (action === "create_unit") {
        const unit =
          await createDispatcherUnit({
            groupId: body?.groupId,
            name: body?.name,
            actor: auth.access
          });

        return json({
          ok: true,
          unit
        });
      }

      if (action === "delete_unit") {
        await deleteDispatcherUnit({
          unitId: body?.unitId,
          actor: auth.access
        });

        return json({ ok: true });
      }

      if (action === "reset") {
        const unit =
          await resetDispatcherUnitSources({
            unitId: body?.unitId
          });

        return json({
          ok: true,
          unit
        });
      }

      const unit =
        await setDispatcherUnitSources({
          unitId: body?.unitId,
          sources:
            Array.isArray(body?.sources)
              ? body.sources
              : [],
          actor: auth.access
        });

      return json({
        ok: true,
        unit
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось изменить настройки диспетчерского интерфейса"
        },
        400
      );
    }
  }
};
