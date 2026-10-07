import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess
} from "../../lib/access-control.js";

import {
  getDispatcherSourceConfig,
  setDispatcherUnitSources,
  resetDispatcherUnitSources,
  setDispatcherUnitOutageSources,
  resetDispatcherUnitOutageSources
} from "../../lib/dispatcher-config.js";

import {
  getWorkordersSourceConfig,
  setWorkordersUnitSources,
  resetWorkordersUnitSources
} from "../../lib/dispatcher-workorders-config.js";

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
  getOutageDivisions
} from "../../lib/outage-config.js";

import {
  getExecutiveTableRows,
  createExecutiveTableRow,
  updateExecutiveTableRow,
  deleteExecutiveTableRow
} from "../../lib/executive-table-config.js";

import {
  getLatestDispatcherSnapshot
} from "../../lib/dispatcher-data.js";

import {
  getLatestWorkordersSnapshot
} from "../../lib/dispatcher-workorders-data.js";

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
          structure,
          workordersUnits,
          workordersSourceState,
          emergencyOutageState,
          plannedOutageState,
          outageDivisions,
          executiveTableRows
        ] =
          await Promise.all([
            getDispatcherSourceConfig(),
            getLatestDispatcherSnapshot(),
            getDispatcherStructure(),
            getWorkordersSourceConfig(),
            getLatestWorkordersSnapshot(),
            getLatestEmergencyOutageSnapshot(),
            getLatestPlannedOutageSnapshot(),
            getOutageDivisions(),
            getExecutiveTableRows()
          ]);

        return json({
          storageConfigured:
            isRuntimeStoreConfigured(),
          groups:
            structure.groups,
          executiveTable: {
            rows: executiveTableRows
          },
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
          },
          outages: {
            divisions: Array.isArray(outageDivisions)
              ? outageDivisions.map((division) => ({
                  id: division.id,
                  name: division.name,
                  sources: Array.isArray(division.sources) ? division.sources : []
                }))
              : [],
            availableSourceLabels: [
              ...new Set([
                ...(Array.isArray(emergencyOutageState.snapshot?.rowList)
                  ? emergencyOutageState.snapshot.rowList.map((row) => row.label)
                  : []),
                ...(Array.isArray(plannedOutageState.snapshot?.rowList)
                  ? plannedOutageState.snapshot.rowList.map((row) => row.label)
                  : [])
              ].filter(Boolean))
            ],
            emergencySourceData: {
              configured: Boolean(emergencyOutageState.configured),
              status: emergencyOutageState.status,
              message: emergencyOutageState.message || "",
              sourceUpdatedAt: emergencyOutageState.snapshot?.sourceUpdatedAt || "",
              rowCount: emergencyOutageState.snapshot?.rowCount || 0
            },
            plannedSourceData: {
              configured: Boolean(plannedOutageState.configured),
              status: plannedOutageState.status,
              message: plannedOutageState.message || "",
              sourceUpdatedAt: plannedOutageState.snapshot?.sourceUpdatedAt || "",
              rowCount: plannedOutageState.snapshot?.rowCount || 0
            }
          },
          workorders: {
            units: workordersUnits,
            availableSourceLabels:
              Array.isArray(
                workordersSourceState.snapshot?.rowList
              )
                ? workordersSourceState.snapshot.rowList.map(
                    (row) => row.label
                  )
                : [],
            sourceData: {
              configured:
                Boolean(workordersSourceState.configured),
              status:
                workordersSourceState.status,
              message:
                workordersSourceState.message || "",
              sourceUpdatedAt:
                workordersSourceState.snapshot?.sourceUpdatedAt || "",
              rowCount:
                workordersSourceState.snapshot?.rowCount || 0,
              parts:
                workordersSourceState.snapshot?.parts || 0
            }
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
      if (action === "create_executive_row") {
        const row = await createExecutiveTableRow({
          name: body?.name,
          description: body?.description,
          outageDivisionIds: body?.outageDivisionIds,
          requestGroupIds: body?.requestGroupIds,
          workorderGroupIds: body?.workorderGroupIds,
          unitGroupIds: body?.unitGroupIds,
          actor: auth.access
        });

        return json({ ok: true, row });
      }

      if (action === "update_executive_row") {
        const row = await updateExecutiveTableRow({
          rowId: body?.rowId,
          name: body?.name,
          description: body?.description,
          outageDivisionIds: body?.outageDivisionIds,
          requestGroupIds: body?.requestGroupIds,
          workorderGroupIds: body?.workorderGroupIds,
          unitGroupIds: body?.unitGroupIds,
          actor: auth.access
        });

        return json({ ok: true, row });
      }

      if (action === "delete_executive_row") {
        await deleteExecutiveTableRow({ rowId: body?.rowId });
        return json({ ok: true });
      }

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

      if (action === "reset_outages") {
        const unit =
          await resetDispatcherUnitOutageSources({
            unitId: body?.unitId
          });

        return json({
          ok: true,
          unit
        });
      }

      if (action === "save_outages") {
        const unit =
          await setDispatcherUnitOutageSources({
            unitId: body?.unitId,
            divisionIds:
              Array.isArray(body?.divisionIds)
                ? body.divisionIds
                : [],
            selections:
              Array.isArray(body?.selections)
                ? body.selections
                : undefined,
            actor: auth.access
          });

        return json({
          ok: true,
          unit
        });
      }

      if (action === "reset_workorders") {
        const unit =
          await resetWorkordersUnitSources({
            unitId: body?.unitId
          });

        return json({
          ok: true,
          unit
        });
      }

      if (action === "save_workorders") {
        const unit =
          await setWorkordersUnitSources({
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
