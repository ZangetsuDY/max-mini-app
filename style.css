import login from "../handlers/login.js";
import logout from "../handlers/logout.js";
import me from "../handlers/me.js";
import outages from "../handlers/outages.js";
import dispatcher from "../handlers/dispatcher.js";
import heartbeat from "../handlers/heartbeat.js";
import system from "../handlers/system.js";

import adminDashboard from "../handlers/admin/dashboard.js";
import adminSystem from "../handlers/admin/system.js";
import adminAccess from "../handlers/admin/access.js";
import adminRoles from "../handlers/admin/roles.js";
import adminUserRoles from "../handlers/admin/user-roles.js";
import adminDispatcherConfig from "../handlers/admin/dispatcher-config.js";

const ROUTES = new Map([
  ["login", login],
  ["logout", logout],
  ["me", me],
  ["outages", outages],
  ["dispatcher", dispatcher],
  ["heartbeat", heartbeat],
  ["system", system],
  ["admin/dashboard", adminDashboard],
  ["admin/system", adminSystem],
  ["admin/access", adminAccess],
  ["admin/roles", adminRoles],
  ["admin/user-roles", adminUserRoles],
  ["admin/dispatcher-config", adminDispatcherConfig]
]);

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
    const url = new URL(request.url);

    // Vercel rewrites /api/... -> /api/router?route=...
    // Original query params (for example division=ves) are preserved.
    let route = String(
      url.searchParams.get("route") || ""
    )
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();

    // Fallback for direct/local calls such as /api/router?route=login.
    if (!route) {
      route = url.pathname
        .replace(/^\/api\//, "")
        .replace(/^\/+|\/+$/g, "")
        .toLowerCase();
    }

    const handler = ROUTES.get(route);

    if (!handler?.fetch) {
      return json(
        {
          error: "API route not found",
          route
        },
        404
      );
    }

    return handler.fetch(request);
  }
};
