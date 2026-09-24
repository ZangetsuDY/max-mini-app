import {
  getSession
} from "../../lib/security.js";

import {
  PANEL_REGISTRY,
  getRoleDefinitions,
  getUsersWithAccess,
  resolveSessionAccess
} from "../../lib/access-control.js";

import {
  getDispatcherStructure
} from "../../lib/dispatcher-structure.js";

function json(
  data,
  status = 200
) {
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

    const session =
      getSession(request);

    if (!session) {
      return json(
        { error: "Требуется авторизация" },
        401
      );
    }

    const access =
      await resolveSessionAccess(
        session
      );

    if (!access?.isDeveloper) {
      return json(
        { error: "Недостаточно прав" },
        403
      );
    }

    try {
      const [
        roles,
        users,
        structure
      ] =
        await Promise.all([
          getRoleDefinitions(),
          getUsersWithAccess(),
          getDispatcherStructure()
        ]);

      const groupMap =
        new Map(
          structure.groups.map(
            (group) => [
              group.id,
              group
            ]
          )
        );

      const enrichedRoles =
        roles.map((role) => ({
          ...role,
          dispatcherDivisionName:
            role.dispatcherAllDivisions
              ? "Все подразделения"
              : (
                  groupMap.get(
                    role.dispatcherDivisionId
                  )?.name ||
                  (
                    role.dispatcherDivisionId
                      ? `Удалено: ${role.dispatcherDivisionName || role.dispatcherDivisionId}`
                      : ""
                  )
                )
        }));

      return json({
        panels:
          PANEL_REGISTRY,
        dispatcherDivisions:
          structure.groups,
        roles:
          enrichedRoles,
        users,
        currentUser:
          access
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить управление доступом"
        },
        500
      );
    }
  }
};
