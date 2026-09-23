import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess,
  createRole,
  updateRole,
  deleteRole
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

    const action =
      String(
        body?.action || ""
      )
        .trim()
        .toLowerCase();

    try {
      if (action === "create") {
        const role =
          await createRole({
            name:
              body?.name,
            description:
              body?.description,
            panelIds:
              body?.panelIds,
            actor:
              access
          });

        return json({
          ok: true,
          role
        });
      }

      if (action === "update") {
        const role =
          await updateRole({
            roleId:
              body?.roleId,
            name:
              body?.name,
            description:
              body?.description,
            panelIds:
              body?.panelIds,
            actor:
              access
          });

        return json({
          ok: true,
          role
        });
      }

      if (action === "delete") {
        await deleteRole({
          roleId:
            body?.roleId,
          actor:
            access
        });

        return json({
          ok: true
        });
      }

      return json(
        { error: "Неизвестное действие" },
        400
      );
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось изменить роль"
        },
        400
      );
    }
  }
};
