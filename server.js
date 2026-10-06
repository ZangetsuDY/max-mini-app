import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { brotliCompressSync, gzipSync, constants as zlibConstants } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

const HOST = "0.0.0.0";
const requestedPort = Number.parseInt(String(process.env.PORT || "3000"), 10);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536
  ? requestedPort
  : 3000;

let apiRouterPromise = null;

function getApiRouter() {
  if (!apiRouterPromise) {
    apiRouterPromise = import("./api/router.js")
      .then((module) => module.default)
      .catch((error) => {
        apiRouterPromise = null;
        throw error;
      });
  }

  return apiRouterPromise;
}

const STATIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/style.css", "style.css"],
  ["/pro.css", "pro.css"]
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

const STATIC_ASSET_CACHE = new Map();
const MIN_COMPRESS_BYTES = 1024;

function isCompressibleContentType(contentType = "") {
  const value = String(contentType || "").toLowerCase();
  return (
    value.startsWith("text/") ||
    value.includes("application/json") ||
    value.includes("application/javascript") ||
    value.includes("image/svg+xml")
  );
}

function stripVolatileJsonFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripVolatileJsonFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const result = {};

  for (const [key, item] of Object.entries(value)) {
    if (key === "updatedAt") continue;
    result[key] = stripVolatileJsonFields(item);
  }

  return result;
}

function makeWeakEtag(payload, contentType = "") {
  let source = payload;

  if (String(contentType).toLowerCase().includes("application/json")) {
    try {
      const parsed = JSON.parse(payload.toString("utf8"));
      source = Buffer.from(
        JSON.stringify(stripVolatileJsonFields(parsed)),
        "utf8"
      );
    } catch {
      source = payload;
    }
  }

  const digest = createHash("sha256")
    .update(source)
    .digest("hex")
    .slice(0, 24);

  return `W/"${digest}"`;
}

function requestEtagMatches(request, etag) {
  const value = String(request.headers["if-none-match"] || "");
  if (!value || !etag) return false;

  return value
    .split(",")
    .map((item) => item.trim())
    .some((item) => item === "*" || item === etag);
}

function appendVary(headers, value) {
  const current = String(headers.Vary || headers.vary || "").trim();
  const parts = current
    ? current.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  if (!parts.some((item) => item.toLowerCase() === value.toLowerCase())) {
    parts.push(value);
  }

  delete headers.vary;
  headers.Vary = parts.join(", ");
}

function encodePayload(request, payload, contentType, headers) {
  if (
    payload.length < MIN_COMPRESS_BYTES ||
    !isCompressibleContentType(contentType) ||
    headers["Content-Encoding"] ||
    headers["content-encoding"]
  ) {
    return payload;
  }

  const accepted = String(request.headers["accept-encoding"] || "").toLowerCase();

  try {
    if (/\bbr\b/.test(accepted)) {
      const compressed = brotliCompressSync(payload, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 4
        }
      });
      headers["Content-Encoding"] = "br";
      appendVary(headers, "Accept-Encoding");
      return compressed;
    }

    if (/\bgzip\b/.test(accepted)) {
      const compressed = gzipSync(payload, { level: 6 });
      headers["Content-Encoding"] = "gzip";
      appendVary(headers, "Accept-Encoding");
      return compressed;
    }
  } catch (error) {
    console.error("Response compression failed:", error);
  }

  return payload;
}

async function getStaticAsset(fileName) {
  if (STATIC_ASSET_CACHE.has(fileName)) {
    return STATIC_ASSET_CACHE.get(fileName);
  }

  const filePath = path.join(ROOT, fileName);
  const content = await fs.readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension] || "application/octet-stream";
  const asset = {
    content,
    extension,
    contentType,
    etag: makeWeakEtag(content, contentType)
  };

  STATIC_ASSET_CACHE.set(fileName, asset);
  return asset;
}

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

    const apiRouter = await getApiRouter();

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

    const rawPayload =
      Buffer.from(
        arrayBuffer
      );

    const contentType =
      String(
        responseHeaders["content-type"] ||
        responseHeaders["Content-Type"] ||
        ""
      );

    if (
      (method === "GET" || method === "HEAD") &&
      webResponse.status >= 200 &&
      webResponse.status < 300
    ) {
      const etag = makeWeakEtag(
        rawPayload,
        contentType
      );

      responseHeaders.ETag = etag;
      responseHeaders["Cache-Control"] =
        "private, no-cache, must-revalidate";

      if (requestEtagMatches(nodeRequest, etag)) {
        delete responseHeaders["Content-Length"];
        delete responseHeaders["content-length"];
        delete responseHeaders["Content-Encoding"];
        delete responseHeaders["content-encoding"];

        nodeResponse.writeHead(
          304,
          responseHeaders
        );
        nodeResponse.end();
        return;
      }
    }

    const payload = encodePayload(
      nodeRequest,
      rawPayload,
      contentType,
      responseHeaders
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
    const asset = await getStaticAsset(fileName);
    const isHtml = asset.extension === ".html";
    const headers = {
      "Content-Type": asset.contentType,
      "Cache-Control":
        isHtml || asset.extension === ".css" || asset.extension === ".js"
          ? "no-cache, no-store, must-revalidate"
          : "public, max-age=300, must-revalidate",
      ETag: asset.etag
    };

    if (requestEtagMatches(nodeRequest, asset.etag)) {
      nodeResponse.writeHead(304, headers);
      nodeResponse.end();
      return;
    }

    const payload = encodePayload(
      nodeRequest,
      asset.content,
      asset.contentType,
      headers
    );

    headers["Content-Length"] = String(payload.length);

    nodeResponse.writeHead(200, headers);

    if (nodeRequest.method === "HEAD") {
      nodeResponse.end();
      return;
    }

    nodeResponse.end(payload);
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
