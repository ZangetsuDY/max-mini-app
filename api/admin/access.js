import {
  getSession
} from "../../lib/security.js";

import {
  PANEL_REGISTRY,
  getRoleDefinitions,
  getUsersWithAccess,
  resolveSessionAccess
} from "../../lib/access-control.js";

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
        users
      ] =
        await Promise.all([
          getRoleDefinitions(),
          getUsersWithAccess()
        ]);

      return json({
        panels:
          PANEL_REGISTRY,
        roles,
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
