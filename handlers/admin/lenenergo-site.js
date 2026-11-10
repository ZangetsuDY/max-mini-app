import { getSession } from "../../lib/security.js";
import { resolveSessionAccess } from "../../lib/access-control.js";
import {
  probePlannedWork,
  LENENERGO_REGIONS,
  LENENERGO_RES
} from "../../lib/lenenergo-site.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function requireDeveloper(request) {
  let session;
  try {
    session = getSession(request);
  } catch (error) {
    return {
      error: json({ error: error instanceof Error ? error.message : "Ошибка сессии" }, 500)
    };
  }

  if (!session) return { error: json({ error: "Требуется авторизация" }, 401) };
  const access = await resolveSessionAccess(session);
  if (!access?.isDeveloper) {
    return { error: json({ error: "Недостаточно прав" }, 403) };
  }
  return { access };
}

// Одна проверка за раз и не чаще раза в 5 секунд — чтобы не злить DDoS-Guard.
let running = null;
let lastStartedAt = 0;

/*
  Проверка доступа сервера к «Графику плановых работ» rosseti-lenenergo.ru
  и пробная выборка по адресу.
*/
export default {
  async fetch(request) {
    const auth = await requireDeveloper(request);
    if (auth.error) return auth.error;
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    if (url.searchParams.get("options") === "1") {
      return json({ regions: LENENERGO_REGIONS, res: LENENERGO_RES });
    }

    const clean = (name, max) => String(url.searchParams.get(name) || "").trim().slice(0, max);
    const reg = clean("reg", 4).replace(/\D/g, "");
    const res = clean("res", 4).replace(/\D/g, "");
    const street = clean("street", 120);
    const district = clean("district", 80);
    const maxPages = Math.max(1, Math.min(Number(url.searchParams.get("pages")) || 3, 5));

    if (running) return json(await running);
    const wait = 5000 - (Date.now() - lastStartedAt);
    if (wait > 0) {
      return json({ error: `Подождите ${Math.ceil(wait / 1000)} с перед следующей проверкой` }, 429);
    }

    lastStartedAt = Date.now();
    running = probePlannedWork({ reg, res, street, district, maxPages });
    try {
      return json(await running);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Проверка не удалась" }, 500);
    } finally {
      running = null;
    }
  }
};
