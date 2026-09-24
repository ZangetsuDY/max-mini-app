import {
  getSession
} from "../../lib/security.js";

import {
  resolveSessionAccess,
  assignUserRoles,
  clearUserRoleAssignment,
  getRoleDefinitions
} from "../../lib/access-control.js";

import {
  createManagedUser,
  deleteApplicationUser
} from "../../lib/user-store.js";

import {
  removeUserRuntime
} from "../../lib/runtime-store.js";

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

function normalizeRoleIds(
  roleIds,
  roles
) {
  const valid =
    new Set(
      roles.map(
        (role) => role.id
      )
    );

  const clean = [
    ...new Set(
      (Array.isArray(roleIds)
        ? roleIds
        : []
      )
        .map(
          (roleId) =>
            String(roleId || "")
              .trim()
              .toLowerCase()
        )
        .filter(
          (roleId) =>
            valid.has(roleId)
        )
    )
  ];

  return clean.length
    ? clean
    : ["user"];
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json(
        { error: "Method not allowed" },
        405
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
      body = await request.json();
    } catch {
      return json(
        { error: "Некорректный запрос" },
        400
      );
    }

    const action =
      String(body?.action || "")
        .trim()
        .toLowerCase();

    try {
      if (action === "create") {
        const roles =
          await getRoleDefinitions();

        const roleIds =
          normalizeRoleIds(
            body?.roleIds,
            roles
          );

        const user =
          await createManagedUser({
            username:
              body?.username,
            fullName:
              body?.fullName,
            password:
              body?.password,
            actor: access
          });

        try {
          const effectiveUser =
            await assignUserRoles({
              username:
                user.username,
              roleIds,
              actor: access
            });

          return json({
            ok: true,
            user: effectiveUser
          });
        } catch (error) {
          // Если роли не сохранились, не оставляем полу-созданную учётку.
          await deleteApplicationUser({
            username:
              user.username,
            actor: access
          }).catch(() => {});

          throw error;
        }
      }

      if (action === "delete") {
        const username =
          String(
            body?.username || ""
          ).trim();

        const deleted =
          await deleteApplicationUser({
            username,
            actor: access
          });

        await Promise.all([
          clearUserRoleAssignment(
            username
          ).catch(() => false),
          removeUserRuntime(
            username
          ).catch(() => false)
        ]);

        return json({
          ok: true,
          deleted
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
              : "Не удалось изменить пользователя"
        },
        400
      );
    }
  }
};
