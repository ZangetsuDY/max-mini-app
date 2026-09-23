import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess,
  assignUserRoles
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
    if (request.method !== "POST") {
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

    let body;

    try {
      body =
        await request.json();
    } catch {
      return json(
        { error: "Некорректный запрос" },
        400
      );
    }

    try {
      const user =
        await assignUserRoles({
          username:
            body?.username,
          roleIds:
            body?.roleIds,
          actor:
            access
        });

      return json({
        ok: true,
        user
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось назначить роли"
        },
        400
      );
    }
  }
};
