import { getSession } from "../../lib/security.js";
import { resolveSessionAccess } from "../../lib/access-control.js";
import { isRuntimeStoreConfigured } from "../../lib/runtime-store.js";
import {
  getBranchChatsConfig,
  saveBranchChatsConfig
} from "../../lib/branch-chats-config.js";

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

/*
  Филиалы и информационные панели (чаты MAX): чтение и сохранение
  всей структуры целиком — так порядок и удаление тоже сохраняются.
*/
export default {
  async fetch(request) {
    const auth = await requireDeveloper(request);
    if (auth.error) return auth.error;

    if (request.method === "GET") {
      return json({
        storageConfigured: isRuntimeStoreConfigured(),
        config: await getBranchChatsConfig()
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Некорректный запрос" }, 400);
    }

    try {
      const config = await saveBranchChatsConfig({
        config: body?.config || body,
        actor: auth.access
      });
      return json({ ok: true, config });
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : "Не удалось сохранить филиалы"
      }, 400);
    }
  }
};
