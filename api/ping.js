export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        service: "max-mini-app-diagnostic",
        path: url.pathname,
        serverTime: new Date().toISOString(),
        region: process.env.VERCEL_REGION || null
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
};
