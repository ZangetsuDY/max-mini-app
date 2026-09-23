import {
  getSession,
  getConfiguredUsers
} from "../../lib/security.js";

import {
  getPresenceSnapshot,
  getSystemState,
  isRuntimeStoreConfigured
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

    if (!session.isDeveloper) {
      return json(
        { error: "Недостаточно прав" },
        403
      );
    }

    const users =
      getConfiguredUsers();

    try {
      const [
        system,
        presence
      ] =
        await Promise.all([
          getSystemState(),
          getPresenceSnapshot(
            users
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
          users.length,
        dispatcherCount:
          users.filter(
            (user) =>
              user.isDispatcher
          ).length,
        developerCount:
          users.filter(
            (user) =>
              user.isDeveloper
          ).length,
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
