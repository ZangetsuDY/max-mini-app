/*
  Филиалы и их информационные панели (чаты MAX).
  Структура хранится в runtime store и редактируется в центре управления:
    { version, branches: [{ id, name, description, chats: [{ id, name, chatId, description }] }] }
*/
import { randomUUID } from "node:crypto";
import { redisCommand } from "./runtime-store.js";
import { BRANCH_CHAT_PRESETS } from "./branch-chats-presets.js";

const CONFIG_KEY = "lenenergo:max-mini-app:branch-chats:v1";

const MAX_BRANCHES = 60;
const MAX_CHATS_PER_BRANCH = 40;

const DEFAULT_BRANCH_NAMES = Object.freeze([
  "ВЭС", "ГтЭС", "ЮЭС", "СЭС", "ТхЭС", "КС", "НлЭС",
  "КнЭС", "ЮВВР", "ВВВР", "СВВР", "ЦВВР", "ОС", "Волхов"
]);

function presetChats(branchName, branchId) {
  return (BRANCH_CHAT_PRESETS[branchName] || []).map(([name, chatId], index) => ({
    id: `${branchId}-chat-${index + 1}`,
    name,
    chatId,
    description: ""
  }));
}

function defaultConfig() {
  return {
    version: 1,
    presetsApplied: true,
    branches: DEFAULT_BRANCH_NAMES.map((name, index) => ({
      id: `branch-${index + 1}`,
      name,
      description: "",
      chats: presetChats(name, `branch-${index + 1}`)
    })),
    updatedAt: "",
    updatedBy: ""
  };
}

function cleanText(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanId(value) {
  const id = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
  return id || `id-${randomUUID().slice(0, 8)}`;
}

// ID чата MAX — целое число (у групповых чатов отрицательное).
export function normalizeChatId(value) {
  const text = String(value ?? "").trim();
  return /^-?\d{1,20}$/.test(text) ? text : "";
}

function normalizeChat(chat) {
  return {
    id: cleanId(chat?.id),
    name: cleanText(chat?.name, 80),
    chatId: normalizeChatId(chat?.chatId),
    description: cleanText(chat?.description, 160)
  };
}

function normalizeBranch(branch) {
  const chats = (Array.isArray(branch?.chats) ? branch.chats : [])
    .slice(0, MAX_CHATS_PER_BRANCH)
    .map(normalizeChat);
  return {
    id: cleanId(branch?.id),
    name: cleanText(branch?.name, 60),
    description: cleanText(branch?.description, 120),
    chats: dedupeIds(chats)
  };
}

function dedupeIds(items) {
  const seen = new Set();
  return items.map((item) => {
    let id = item.id;
    while (seen.has(id)) id = `${item.id}-${randomUUID().slice(0, 4)}`;
    seen.add(id);
    return { ...item, id };
  });
}

export function normalizeBranchChatsConfig(value) {
  const branches = (Array.isArray(value?.branches) ? value.branches : [])
    .slice(0, MAX_BRANCHES)
    .map(normalizeBranch);
  return {
    version: 1,
    presetsApplied: Boolean(value?.presetsApplied),
    branches: dedupeIds(branches),
    updatedAt: String(value?.updatedAt || ""),
    updatedBy: String(value?.updatedBy || "")
  };
}

function validate(config) {
  for (const branch of config.branches) {
    if (!branch.name) throw new Error("У каждого филиала должно быть название");
    for (const chat of branch.chats) {
      if (!chat.name) throw new Error(`Филиал «${branch.name}»: укажите название панели`);
      if (!chat.chatId) {
        throw new Error(`Филиал «${branch.name}», панель «${chat.name}»: ID чата должен быть числом`);
      }
    }
  }
}

export async function getBranchChatsConfig() {
  try {
    const raw = await redisCommand("GET", CONFIG_KEY);
    if (!raw) return defaultConfig();
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const config = normalizeBranchChatsConfig(parsed);
    if (!config.presetsApplied) return await applyPresetsOnce(config);
    return config;
  } catch {
    return defaultConfig();
  }
}

/*
  Однократно заполняет чаты из таблицы ID у филиалов, где панелей ещё нет.
  Уже настроенные вручную филиалы не меняются; удалённые не возвращаются.
*/
async function applyPresetsOnce(config) {
  const next = {
    ...config,
    presetsApplied: true,
    branches: config.branches.map((branch) =>
      branch.chats.length ? branch : { ...branch, chats: presetChats(branch.name, branch.id) }
    )
  };
  try {
    await redisCommand("SET", CONFIG_KEY, JSON.stringify(next));
  } catch {
    // Не удалось сохранить — применим снова при следующем чтении.
  }
  return next;
}

export async function saveBranchChatsConfig({ config, actor }) {
  const next = normalizeBranchChatsConfig(config);
  validate(next);
  next.presetsApplied = true;
  next.updatedAt = new Date().toISOString();
  next.updatedBy = String(actor?.fullName || actor?.username || "");
  await redisCommand("SET", CONFIG_KEY, JSON.stringify(next));
  return next;
}

export async function findBranchChat(branchId, chatPanelId) {
  const config = await getBranchChatsConfig();
  const branch = config.branches.find((item) => item.id === branchId);
  const chat = branch?.chats.find((item) => item.id === chatPanelId);
  return branch && chat ? { branch, chat } : null;
}
