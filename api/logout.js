import {
  clearSessionCookie
} from "../lib/security.js";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    return json(
      { ok: true },
      200,
      {
        "Set-Cookie": clearSessionCookie()
      }
    );
  }
};
