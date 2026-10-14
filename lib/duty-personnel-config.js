import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const CONFIG_KEY =
  "lenenergo:max-mini-app:dispatcher:duty-personnel-config";

function safeParse(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function normalizeChatId(value) {
  return String(value || "").trim().slice(0, 120);
}

async function readStoredConfig() {
  if (!isRuntimeStoreConfigured()) return null;
  try {
    const raw = await redisCommand("GET", CONFIG_KEY);
    const parsed = safeParse(raw, null);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch (error) {
    console.error("Не удалось загрузить настройку чата дежурного персонала:", error);
    return null;
  }
}

export async function getDutyPersonnelConfig() {
  const stored = await readStoredConfig();
  const envChatId = normalizeChatId(
    process.env.DUTY_PERSONNEL_CHAT_ID ||
    process.env.SK11_DUTY_PERSONNEL_CHAT_ID ||
    ""
  );

  const storedChatId = normalizeChatId(stored?.chatId);
  const chatId = storedChatId || envChatId;

  return {
    chatId,
    source: storedChatId ? "runtime" : envChatId ? "env" : "none",
    configured: Boolean(chatId),
    storageConfigured: isRuntimeStoreConfigured(),
    updatedAt: stored?.updatedAt || null,
    updatedBy: stored?.updatedBy || null
  };
}

export async function setDutyPersonnelChatId({ chatId, actor }) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error("Хранилище состояния не подключено");
  }

  const cleanChatId = normalizeChatId(chatId);

  const payload = {
    chatId: cleanChatId,
    updatedAt: new Date().toISOString(),
    updatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  };

  await redisCommand(
    "SET",
    CONFIG_KEY,
    JSON.stringify(payload)
  );

  return getDutyPersonnelConfig();
}
