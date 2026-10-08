import { getSession } from "../../lib/security.js";
import { resolveSessionAccess } from "../../lib/access-control.js";
import { isRuntimeStoreConfigured } from "../../lib/runtime-store.js";
import { getOutageDivisions } from "../../lib/outage-config.js";
import {
  getEmergencyExcelConfig,
  saveEmergencyExcelConfig,
  EXCEL_EXPORT_FIELD_OPTIONS
} from "../../lib/excel-export-config.js";

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

export default {
  async fetch(request) {
    const auth = await requireDeveloper(request);
    if (auth.error) return auth.error;

    if (request.method === "GET") {
      try {
        const [config, divisions] = await Promise.all([
          getEmergencyExcelConfig(),
          getOutageDivisions()
        ]);
        return json({
          storageConfigured: isRuntimeStoreConfigured(),
          config,
          divisions,
          fieldOptions: EXCEL_EXPORT_FIELD_OPTIONS
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : "Не удалось загрузить шаблон Excel"
        }, 500);
      }
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
      const config = await saveEmergencyExcelConfig({
        config: body?.config || body,
        actor: auth.access
      });
      return json({ ok: true, config });
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : "Не удалось сохранить шаблон Excel"
      }, 400);
    }
  }
};
