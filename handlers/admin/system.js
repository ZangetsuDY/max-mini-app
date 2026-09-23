import {
  getSession
} from "../../lib/security.js";

import {
  setSystemState
} from "../../lib/runtime-store.js";

import {
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
      const state =
        await setSystemState({
          mode:
            String(
              body?.mode || ""
            ),
          message:
            String(
              body?.message || ""
            ),
          actor:
            session
        });

      return json({
        ok: true,
        system: state
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось изменить режим"
        },
        500
      );
    }
  }
};
