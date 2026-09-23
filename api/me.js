import {
  getSession
} from "../lib/security.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      const session = getSession(request);

      if (!session) {
        return json(
          { authenticated: false },
          401
        );
      }

      return json({
        authenticated: true,
        user: {
          username: session.username,
          fullName: session.fullName,
          isDispatcher: Boolean(session.isDispatcher)
        }
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Ошибка авторизации"
        },
        500
      );
    }
  }
};
