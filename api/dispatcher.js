import {
  getSession
} from "../lib/security.js";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
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

    if (!session.isDispatcher) {
      return json(
        {
          allowed: false,
          code: "NOT_DISPATCHER",
          message: "Вы не диспетчер"
        },
        403
      );
    }

    return json({
      allowed: true,
      code: "IN_DEVELOPMENT",
      message: "В разработке"
    });
  }
};
