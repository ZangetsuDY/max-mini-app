import { createHash } from "node:crypto";
import { getSession } from "../lib/security.js";
import { resolveSessionAccess, hasPanel } from "../lib/access-control.js";
import { getBranchChatsConfig, findBranchChat } from "../lib/branch-chats-config.js";
import { fetchChatMessages, messageId } from "../lib/max-attachment-source.js";
import { jsonResponse } from "../lib/detail-scope.js";

const MESSAGE_COUNT = 100;
// Короткий кэш: сколько бы пользователей ни смотрели панель,
// в MAX уходит не больше одного запроса на чат за это время.
const CACHE_MS = 2000;
const chatCache = new Map();

function senderName(sender) {
  if (!sender) return "";
  const full = [sender.first_name, sender.last_name].filter(Boolean).join(" ");
  return String(sender.name || full || sender.username || "").trim();
}

function httpsUrl(value) {
  const text = String(value || "");
  return /^https:\/\//i.test(text) ? text : "";
}

function normalizeAttachments(list) {
  return (Array.isArray(list) ? list : []).slice(0, 12).map((item) => {
    const type = String(item?.type || "file");
    const payload = item?.payload || {};
    return {
      type,
      name: String(item?.filename || payload?.filename || item?.name || "").slice(0, 160),
      url: type === "image" ? httpsUrl(payload.url) : ""
    };
  }).filter((item) => item.type !== "inline_keyboard");
}

function normalizeMarkup(list) {
  return (Array.isArray(list) ? list : []).slice(0, 200).map((item) => ({
    type: String(item?.type || ""),
    from: Number(item?.from) || 0,
    length: Number(item?.length) || 0,
    url: httpsUrl(item?.url) || (/^http:\/\//i.test(String(item?.url || "")) ? String(item.url) : "")
  })).filter((item) => item.type && item.length > 0);
}

function normalizeLinked(link) {
  const message = link?.message;
  if (!message) return null;
  return {
    type: link.type === "forward" ? "forward" : "reply",
    author: senderName(link.sender),
    text: String(message.text || ""),
    markup: normalizeMarkup(message.markup),
    attachments: normalizeAttachments(message.attachments)
  };
}

function normalizeMessage(message) {
  const body = message?.body || {};
  return {
    id: messageId(message),
    ts: Number(message?.timestamp) || 0,
    author: senderName(message?.sender) || "Участник чата",
    isBot: Boolean(message?.sender?.is_bot),
    text: String(body.text || ""),
    markup: normalizeMarkup(body.markup),
    attachments: normalizeAttachments(body.attachments),
    linked: normalizeLinked(message?.link),
    views: Number(message?.stat?.views) || 0
  };
}

async function loadChat(chatId) {
  const cached = chatCache.get(chatId);
  const now = Date.now();
  if (cached && (cached.pending || now - cached.at < CACHE_MS)) {
    return cached.pending || cached.result;
  }

  const pending = (async () => {
    try {
      const raw = await fetchChatMessages(chatId, MESSAGE_COUNT);
      const messages = raw.map(normalizeMessage);
      const version = createHash("sha1").update(JSON.stringify(messages)).digest("hex").slice(0, 16);
      return { ok: true, messages, version, fetchedAt: new Date().toISOString() };
    } catch (error) {
      // При сбое MAX отдаём последний удачный ответ с пометкой.
      const previous = cached?.result?.ok ? cached.result : null;
      const message = error instanceof Error ? error.message : "Не удалось получить сообщения";
      return previous ? { ...previous, stale: true, error: message } : { ok: false, error: message };
    }
  })();

  chatCache.set(chatId, { at: now, pending, result: cached?.result });
  const result = await pending;
  chatCache.set(chatId, { at: Date.now(), pending: null, result });

  if (chatCache.size > 200) {
    const oldest = chatCache.keys().next().value;
    chatCache.delete(oldest);
  }
  return result;
}

export default {
  async fetch(request) {
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

    let session;
    try {
      session = getSession(request);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : "Ошибка сессии" }, 500);
    }
    if (!session) return jsonResponse({ error: "Требуется авторизация" }, 401);

    const access = await resolveSessionAccess(session);
    if (!access || !hasPanel(access, "branch-chats")) {
      return jsonResponse({ error: "У вашей роли нет доступа к панели «Филиалы»" }, 403);
    }

    const url = new URL(request.url);
    const branchId = String(url.searchParams.get("branch") || "").trim().toLowerCase();
    const panelId = String(url.searchParams.get("panel") || "").trim().toLowerCase();

    if (!branchId || !panelId) {
      const config = await getBranchChatsConfig();
      return jsonResponse({
        branches: config.branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          description: branch.description,
          chats: branch.chats.map((chat) => ({
            id: chat.id,
            name: chat.name,
            description: chat.description
          }))
        })),
        updatedAt: config.updatedAt
      });
    }

    const found = await findBranchChat(branchId, panelId);
    if (!found) return jsonResponse({ error: "Информационная панель не найдена" }, 404);

    const result = await loadChat(found.chat.chatId);
    if (!result.ok) {
      return jsonResponse({ error: result.error, branch: found.branch.name, panel: found.chat.name }, 502);
    }

    const base = {
      branch: { id: found.branch.id, name: found.branch.name },
      panel: { id: found.chat.id, name: found.chat.name, description: found.chat.description },
      version: result.version,
      fetchedAt: result.fetchedAt,
      stale: Boolean(result.stale),
      warning: result.stale ? result.error : ""
    };

    // Клиент присылает версию, которую уже показывает: если ничего
    // не изменилось, сообщения повторно не передаются.
    if (url.searchParams.get("version") === result.version) {
      return jsonResponse({ ...base, unchanged: true });
    }
    return jsonResponse({ ...base, messages: result.messages });
  }
};
