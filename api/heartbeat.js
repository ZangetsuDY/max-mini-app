import {
  getSession
} from "../lib/security.js";

import {
  recordHeartbeat,
  isRuntimeStoreConfigured
} from "../lib/runtime-store.js";

function json(
  data,
  status = 200
) {
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

    if (
      !isRuntimeStoreConfigured()
    ) {
      return json({
        ok: true,
        tracked: false,
        storageConfigured: false
      });
    }

    try {
      await recordHeartbeat(
        session
      );

      return json({
        ok: true,
        tracked: true,
        storageConfigured: true
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Ошибка heartbeat"
        },
        500
      );
    }
  }
};
