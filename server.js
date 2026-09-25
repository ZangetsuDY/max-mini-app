import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import apiRouter from "./api/router.js";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);

const STATIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/style.css", "style.css"]
]);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function log(...args) {
  console.log(
    new Date().toISOString(),
    ...args
  );
}

function sendJson(
  response,
  status,
  data
) {
  const body = JSON.stringify(data);

  response.writeHead(status, {
    "Content-Type":
      "application/json; charset=utf-8",
    "Content-Length":
      Buffer.byteLength(body),
    "Cache-Control":
      "no-store"
  });

  response.end(body);
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  if (!chunks.length) {
    return undefined;
  }

  return Buffer.concat(chunks);
}

function publicRequestUrl(request) {
  const forwardedProto =
    String(
      request.headers[
        "x-forwarded-proto"
      ] || ""
    )
      .split(",")[0]
      .trim();

  const protocol =
    forwardedProto ||
    (request.socket.encrypted
      ? "https"
      : "http");

  const forwardedHost =
    String(
      request.headers[
        "x-forwarded-host"
      ] || ""
    )
      .split(",")[0]
      .trim();

  const host =
    forwardedHost ||
    request.headers.host ||
    `localhost:${PORT}`;

  return new URL(
    request.url || "/",
    `${protocol}://${host}`
  );
}

async function handleApi(
  nodeRequest,
  nodeResponse
) {
  try {
    const url =
      publicRequestUrl(
        nodeRequest
      );

    const body =
      await readBody(
        nodeRequest
      );

    const headers =
      new Headers();

    for (
      const [name, value]
      of Object.entries(
        nodeRequest.headers
      )
    ) {
      if (
        value === undefined
      ) {
        continue;
      }

      if (Array.isArray(value)) {
        for (
          const item
          of value
        ) {
          headers.append(
            name,
            item
          );
        }
      } else {
        headers.set(
          name,
          String(value)
        );
      }
    }

    const method =
      String(
        nodeRequest.method ||
        "GET"
      )
        .toUpperCase();

    const options = {
      method,
      headers
    };

    if (
      body &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      options.body = body;
    }

    const webRequest =
      new Request(
        url,
        options
      );

    const webResponse =
      await apiRouter.fetch(
        webRequest
      );

    const responseHeaders = {};

    for (
      const [name, value]
      of webResponse.headers
        .entries()
    ) {
      if (
        name.toLowerCase() ===
        "set-cookie"
      ) {
        continue;
      }

      responseHeaders[name] =
        value;
    }

    /*
      Node 20+ умеет получать Set-Cookie
      отдельно, не объединяя несколько cookie.
    */
    const setCookies =
      typeof webResponse
        .headers
        .getSetCookie ===
        "function"
        ? webResponse
            .headers
            .getSetCookie()
        : [];

    if (setCookies.length) {
      responseHeaders[
        "Set-Cookie"
      ] = setCookies;
    } else {
      const cookie =
        webResponse
          .headers
          .get("set-cookie");

      if (cookie) {
        responseHeaders[
          "Set-Cookie"
        ] = cookie;
      }
    }

    const arrayBuffer =
      await webResponse
        .arrayBuffer();

    const payload =
      Buffer.from(
        arrayBuffer
      );

    responseHeaders[
      "Content-Length"
    ] =
      String(payload.length);

    nodeResponse.writeHead(
      webResponse.status,
      responseHeaders
    );

    if (method === "HEAD") {
      nodeResponse.end();
      return;
    }

    nodeResponse.end(
      payload
    );
  } catch (error) {
    console.error(
      "API adapter error:",
      error
    );

    sendJson(
      nodeResponse,
      500,
      {
        error:
          "Internal server error",
        details:
          process.env.NODE_ENV ===
          "development"
            ? String(
                error?.stack ||
                error
              )
            : undefined
      }
    );
  }
}

async function serveFile(
  nodeRequest,
  nodeResponse,
  fileName
) {
  try {
    const filePath =
      path.join(
        ROOT,
        fileName
      );

    const content =
      await fs.readFile(
        filePath
      );

    const extension =
      path.extname(
        filePath
      )
        .toLowerCase();

    const isHtml =
      extension === ".html";

    nodeResponse.writeHead(
      200,
      {
        "Content-Type":
          CONTENT_TYPES[
            extension
          ] ||
          "application/octet-stream",
        "Content-Length":
          String(content.length),
        "Cache-Control":
          isHtml
            ? "no-cache, no-store, must-revalidate"
            : "public, max-age=300"
      }
    );

    if (
      nodeRequest.method ===
      "HEAD"
    ) {
      nodeResponse.end();
      return;
    }

    nodeResponse.end(
      content
    );
  } catch (error) {
    console.error(
      "Static file error:",
      error
    );

    sendJson(
      nodeResponse,
      500,
      {
        error:
          "Не удалось отдать статический файл"
      }
    );
  }
}

const server =
  http.createServer(
    async (
      request,
      response
    ) => {
      const startedAt =
        Date.now();

      try {
        const url =
          publicRequestUrl(
            request
          );

        const pathname =
          decodeURIComponent(
            url.pathname
          );

        response.setHeader(
          "X-Content-Type-Options",
          "nosniff"
        );

        response.setHeader(
          "Referrer-Policy",
          "same-origin"
        );

        if (
          pathname ===
          "/health"
        ) {
          sendJson(
            response,
            200,
            {
              ok: true,
              service:
                "max-mini-app-lenenergo",
              time:
                new Date()
                  .toISOString()
            }
          );

          return;
        }

        if (
          pathname.startsWith(
            "/api/"
          )
        ) {
          await handleApi(
            request,
            response
          );

          return;
        }

        const staticFile =
          STATIC_FILES.get(
            pathname
          );

        if (staticFile) {
          await serveFile(
            request,
            response,
            staticFile
          );

          return;
        }

        /*
          SPA fallback. Если позже появятся
          клиентские маршруты, они тоже
          откроют index.html.
        */
        if (
          request.method ===
            "GET" ||
          request.method ===
            "HEAD"
        ) {
          await serveFile(
            request,
            response,
            "index.html"
          );

          return;
        }

        sendJson(
          response,
          404,
          {
            error:
              "Not found"
          }
        );
      } catch (error) {
        console.error(
          "Request error:",
          error
        );

        if (
          !response
            .headersSent
        ) {
          sendJson(
            response,
            500,
            {
              error:
                "Internal server error"
            }
          );
        } else {
          response.end();
        }
      } finally {
        log(
          request.method,
          request.url,
          `${Date.now() -
            startedAt}ms`
        );
      }
    }
  );

server.keepAliveTimeout =
  65_000;

server.headersTimeout =
  70_000;

server.listen(
  PORT,
  HOST,
  () => {
    log(
      `Server listening on http://${HOST}:${PORT}`
    );
  }
);

function shutdown(
  signal
) {
  log(
    `Received ${signal}, shutting down`
  );

  server.close(
    () => {
      process.exit(0);
    }
  );

  setTimeout(
    () => process.exit(1),
    10_000
  ).unref();
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);
