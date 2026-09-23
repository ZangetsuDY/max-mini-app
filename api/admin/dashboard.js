import {
  getSession
} from "../../lib/security.js";

import {
  getPresenceSnapshot,
  getSystemState,
  isRuntimeStoreConfigured
} from "../../lib/runtime-store.js";

import {
  getUsersWithAccess,
  resolveSessionAccess,
  hasPanel
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

    let session;

    try {
      session =
        getSession(request);
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

    if (
      !access ||
      !hasPanel(
        access,
        "system-control"
      )
    ) {
      return json(
        { error: "Недостаточно прав" },
        403
      );
    }

    try {
      const accessUsers =
        await getUsersWithAccess();

      const [
        system,
        presence
      ] =
        await Promise.all([
          getSystemState(),
          getPresenceSnapshot(
            accessUsers
          )
        ]);

      return json({
        storageConfigured:
          isRuntimeStoreConfigured(),
        system,
        onlineCount:
          presence.onlineCount,
        onlineWindowSeconds:
          presence.onlineWindowSeconds,
        totalUsers:
          accessUsers.length,
        dispatcherCount:
          accessUsers.filter(
            (user) =>
              user.panelIds.includes(
                "dispatcher"
              )
          ).length,
        developerCount:
          accessUsers.filter(
            (user) =>
              user.isDeveloper
          ).length,
        canManageRoles:
          Boolean(
            access.isDeveloper
          ),
        users:
          presence.users,
        updatedAt:
          new Date().toISOString()
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Ошибка центра управления"
        },
        500
      );
    }
  }
};
