import {
  clearSessionCookie,
  getSession
} from "../lib/security.js";

import {
  recordLogout
} from "../lib/runtime-store.js";

function json(
  data,
  status = 200,
  extraHeaders = {}
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
        ...extraHeaders
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

    try {
      const session =
        getSession(request);

      if (session) {
        try {
          await recordLogout(
            session
          );
        } catch (error) {
          console.error(
            "Не удалось записать выход:",
            error
          );
        }
      }
    } catch {}

    return json(
      { ok: true },
      200,
      {
        "Set-Cookie":
          clearSessionCookie()
      }
    );
  }
};
