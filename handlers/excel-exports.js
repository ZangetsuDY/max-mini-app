import {
  getSession
} from "../lib/security.js";

import {
  resolveSessionAccess,
  hasPanel
} from "../lib/access-control.js";

import {
  getEmergencyExcelConfig,
  EXCEL_EXPORT_FIELD_OPTIONS
} from "../lib/excel-export-config.js";

import {
  getEmergencyExportDataset
} from "../lib/emergency-export-data.js";

import {
  buildEmergencyOutagesXlsx,
  calculateEmergencyExcelLayout
} from "../lib/xlsx-export.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function safeFileName(value) {
  return String(value || "Аварийные_отключения")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "_")
    .slice(0, 80) || "Аварийные_отключения";
}

async function requireAccess(request) {
  let session;
  try {
    session = getSession(request);
  } catch (error) {
    return {
      error: json({
        error: error instanceof Error ? error.message : "Ошибка сессии"
      }, 500)
    };
  }

  if (!session) {
    return { error: json({ error: "Требуется авторизация" }, 401) };
  }

  const access = await resolveSessionAccess(session);
  if (!access || !hasPanel(access, "excel-exports")) {
    return {
      error: json({
        error: "У вашей роли нет доступа к Excel выгрузкам"
      }, 403)
    };
  }

  return { access };
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    const auth = await requireAccess(request);
    if (auth.error) return auth.error;

    try {
      const url = new URL(request.url);
      const type = String(url.searchParams.get("type") || "emergency").toLowerCase();
      if (type !== "emergency") {
        return json({ error: "Этот тип Excel выгрузки пока не поддерживается" }, 400);
      }

      const config = await getEmergencyExcelConfig();
      const dataset = await getEmergencyExportDataset(config);

      if (url.searchParams.get("download") === "1") {
        const generatedAt = new Date();
        const workbook = buildEmergencyOutagesXlsx({
          config,
          rows: dataset.rows,
          sourceUpdatedAt: dataset.sourceState.sourceUpdatedAt,
          generatedAt
        });
        const stamp = generatedAt
          .toISOString()
          .slice(0, 16)
          .replace(/[T:]/g, "-");
        const fileName = `${safeFileName(config.fileName)}_${stamp}.xlsx`;

        return new Response(workbook, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            "Cache-Control": "no-store",
            "Content-Length": String(workbook.length)
          }
        });
      }

      const previewLimit = Math.max(
        5,
        Math.min(Number(url.searchParams.get("limit") || 25) || 25, 100)
      );

      const layout = calculateEmergencyExcelLayout({
        config,
        rows: dataset.rows
      });

      return json({
        type: "emergency",
        config,
        fieldOptions: EXCEL_EXPORT_FIELD_OPTIONS,
        source: dataset.sourceState,
        rowCount: dataset.rows.length,
        rows: dataset.rows.slice(0, previewLimit),
        layout: {
          columnWidths: layout.columnWidths,
          rowHeights: layout.rowHeights.slice(0, previewLimit)
        },
        previewLimit,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Excel export error:", error);
      return json({
        error: error instanceof Error
          ? error.message
          : "Не удалось сформировать Excel выгрузку"
      }, 500);
    }
  }
};
