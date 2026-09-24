import crypto from "node:crypto";

import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const ACCOUNT_STORE_KEY =
  "lenenergo:max-mini-app:accounts:managed";

const PBKDF2_ITERATIONS = 210000;
const CACHE_TTL_MS = 5_000;

let accountCache = null;
let accountCacheAt = 0;

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function loadBootstrapUsers() {
  const raw = process.env.APP_USERS_JSON;

  if (!raw) {
    throw new Error(
      "На сервере не настроен APP_USERS_JSON"
    );
  }

  let users;

  try {
    users = JSON.parse(raw);
  } catch {
    throw new Error(
      "APP_USERS_JSON содержит некорректный JSON"
    );
  }

  if (!Array.isArray(users)) {
    throw new Error(
      "APP_USERS_JSON должен быть JSON-массивом"
    );
  }

  return users
    .map((user) => ({
      username:
        String(user?.username || "").trim(),
      fullName:
        String(
          user?.fullName ||
          user?.username ||
          ""
        ).trim(),
      salt:
        String(user?.salt || ""),
      passwordHash:
        String(user?.passwordHash || ""),
      iterations:
        Number(
          user?.iterations ||
          PBKDF2_ITERATIONS
        ),
      isDispatcher:
        Boolean(user?.isDispatcher),
      isDeveloper:
        Boolean(user?.isDeveloper),
      source: "bootstrap"
    }))
    .filter(
      (user) =>
        user.username &&
        user.fullName &&
        user.salt &&
        user.passwordHash
    );
}

function emptyManagedStore() {
  return {
    users: {},
    disabled: []
  };
}

function normalizeManagedStore(value) {
  const store =
    value && typeof value === "object"
      ? value
      : {};

  const users = {};

  if (
    store.users &&
    typeof store.users === "object" &&
    !Array.isArray(store.users)
  ) {
    for (const [key, rawUser] of
      Object.entries(store.users)) {
      const username =
        normalizeUsername(
          rawUser?.username || key
        );

      if (!username) continue;

      users[username] = {
        username:
          String(
            rawUser?.username || key
          ).trim(),
        fullName:
          String(
            rawUser?.fullName ||
            rawUser?.username ||
            key
          ).trim(),
        salt:
          String(rawUser?.salt || ""),
        passwordHash:
          String(
            rawUser?.passwordHash || ""
          ),
        iterations:
          Number(
            rawUser?.iterations ||
            PBKDF2_ITERATIONS
          ),
        isDispatcher: false,
        isDeveloper: false,
        source: "managed",
        createdAt:
          rawUser?.createdAt || null,
        createdBy:
          rawUser?.createdBy || null,
        updatedAt:
          rawUser?.updatedAt || null
      };
    }
  }

  const disabled =
    Array.isArray(store.disabled)
      ? [
          ...new Set(
            store.disabled
              .map(normalizeUsername)
              .filter(Boolean)
          )
        ]
      : [];

  return {
    users,
    disabled
  };
}

async function readManagedStore({
  force = false
} = {}) {
  const now = Date.now();

  if (
    !force &&
    accountCache &&
    now - accountCacheAt < CACHE_TTL_MS
  ) {
    return accountCache;
  }

  if (!isRuntimeStoreConfigured()) {
    const empty = emptyManagedStore();
    accountCache = empty;
    accountCacheAt = now;
    return empty;
  }

  const raw =
    await redisCommand(
      "GET",
      ACCOUNT_STORE_KEY
    );

  let parsed = null;

  if (
    raw !== null &&
    raw !== undefined &&
    raw !== ""
  ) {
    try {
      parsed =
        typeof raw === "object"
          ? raw
          : JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  const normalized =
    normalizeManagedStore(parsed);

  accountCache = normalized;
  accountCacheAt = now;

  return normalized;
}

async function writeManagedStore(store) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error(
      "Хранилище состояния не подключено"
    );
  }

  const normalized =
    normalizeManagedStore(store);

  await redisCommand(
    "SET",
    ACCOUNT_STORE_KEY,
    JSON.stringify(normalized)
  );

  accountCache = normalized;
  accountCacheAt = Date.now();

  return normalized;
}

function buildMergedCredentialMap(
  bootstrapUsers,
  store
) {
  const disabled =
    new Set(store.disabled);

  const map = new Map();

  for (const user of bootstrapUsers) {
    const key =
      normalizeUsername(
        user.username
      );

    if (
      !key ||
      disabled.has(key)
    ) {
      continue;
    }

    map.set(key, user);
  }

  for (const [key, user] of
    Object.entries(store.users)) {
    if (
      !user?.salt ||
      !user?.passwordHash
    ) {
      continue;
    }

    map.set(
      normalizeUsername(key),
      {
        ...user,
        source: "managed"
      }
    );
  }

  return map;
}

function publicIdentity(user) {
  if (!user) return null;

  return {
    username:
      String(user.username || ""),
    fullName:
      String(
        user.fullName ||
        user.username ||
        ""
      ),
    isDispatcher:
      Boolean(user.isDispatcher),
    isDeveloper:
      Boolean(user.isDeveloper),
    accountSource:
      user.source === "managed"
        ? "managed"
        : "bootstrap",
    managed:
      user.source === "managed"
  };
}

export async function getCredentialUser(
  username,
  { force = false } = {}
) {
  const normalized =
    normalizeUsername(username);

  if (!normalized) {
    return null;
  }

  const [
    bootstrapUsers,
    store
  ] = await Promise.all([
    Promise.resolve(
      loadBootstrapUsers()
    ),
    readManagedStore({ force })
  ]);

  const merged =
    buildMergedCredentialMap(
      bootstrapUsers,
      store
    );

  return merged.get(normalized) || null;
}

export async function getApplicationUser(
  username,
  options = {}
) {
  const user =
    await getCredentialUser(
      username,
      options
    );

  return publicIdentity(user);
}

export async function getApplicationUsers({
  force = false
} = {}) {
  const [
    bootstrapUsers,
    store
  ] = await Promise.all([
    Promise.resolve(
      loadBootstrapUsers()
    ),
    readManagedStore({ force })
  ]);

  const merged =
    buildMergedCredentialMap(
      bootstrapUsers,
      store
    );

  return [...merged.values()]
    .map(publicIdentity)
    .sort((a, b) =>
      a.fullName.localeCompare(
        b.fullName,
        "ru"
      )
    );
}

function validateNewUserInput({
  username,
  fullName,
  password
}) {
  const cleanUsername =
    String(username || "").trim();

  const normalized =
    normalizeUsername(
      cleanUsername
    );

  const cleanFullName =
    String(fullName || "")
      .trim()
      .replace(/\s+/g, " ");

  const passwordValue =
    String(password || "");

  if (
    cleanUsername.length < 3 ||
    cleanUsername.length > 64 ||
    /\s/.test(cleanUsername)
  ) {
    throw new Error(
      "Логин должен содержать от 3 до 64 символов без пробелов"
    );
  }

  if (
    !normalized ||
    !/^[\p{L}\p{N}._-]+$/u.test(
      cleanUsername
    )
  ) {
    throw new Error(
      "В логине разрешены буквы, цифры, точка, дефис и подчёркивание"
    );
  }

  if (
    cleanFullName.length < 2 ||
    cleanFullName.length > 120
  ) {
    throw new Error(
      "Укажите ФИО длиной от 2 до 120 символов"
    );
  }

  if (
    passwordValue.length < 8 ||
    passwordValue.length > 200
  ) {
    throw new Error(
      "Пароль должен содержать минимум 8 символов"
    );
  }

  return {
    cleanUsername,
    normalized,
    cleanFullName,
    passwordValue
  };
}

export async function createManagedUser({
  username,
  fullName,
  password,
  actor
}) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error(
      "Для создания пользователей необходимо подключённое Redis/KV хранилище"
    );
  }

  const {
    cleanUsername,
    normalized,
    cleanFullName,
    passwordValue
  } = validateNewUserInput({
    username,
    fullName,
    password
  });

  const existing =
    await getCredentialUser(
      normalized,
      { force: true }
    );

  if (existing) {
    throw new Error(
      "Пользователь с таким логином уже существует"
    );
  }

  const store =
    await readManagedStore({
      force: true
    });

  const salt =
    crypto
      .randomBytes(16)
      .toString("hex");

  const passwordHash =
    crypto
      .pbkdf2Sync(
        passwordValue,
        salt,
        PBKDF2_ITERATIONS,
        32,
        "sha256"
      )
      .toString("hex");

  const now =
    new Date().toISOString();

  store.users[normalized] = {
    username: cleanUsername,
    fullName: cleanFullName,
    salt,
    passwordHash,
    iterations:
      PBKDF2_ITERATIONS,
    isDispatcher: false,
    isDeveloper: false,
    createdAt: now,
    updatedAt: now,
    createdBy: {
      username:
        String(actor?.username || ""),
      fullName:
        String(actor?.fullName || "")
    }
  };

  store.disabled =
    store.disabled.filter(
      (item) => item !== normalized
    );

  await writeManagedStore(store);

  return getApplicationUser(
    normalized,
    { force: true }
  );
}

export async function deleteApplicationUser({
  username,
  actor
}) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error(
      "Для удаления пользователей необходимо подключённое Redis/KV хранилище"
    );
  }

  const normalized =
    normalizeUsername(username);

  if (!normalized) {
    throw new Error(
      "Пользователь не указан"
    );
  }

  const actorUsername =
    normalizeUsername(
      actor?.username
    );

  if (
    actorUsername &&
    actorUsername === normalized
  ) {
    throw new Error(
      "Нельзя удалить собственную учётную запись"
    );
  }

  const existing =
    await getCredentialUser(
      normalized,
      { force: true }
    );

  if (!existing) {
    throw new Error(
      "Пользователь не найден"
    );
  }

  const store =
    await readManagedStore({
      force: true
    });

  delete store.users[normalized];

  if (
    !store.disabled.includes(
      normalized
    )
  ) {
    store.disabled.push(
      normalized
    );
  }

  await writeManagedStore(store);

  return {
    username:
      String(existing.username),
    fullName:
      String(existing.fullName),
    deletedBy: {
      username:
        String(actor?.username || ""),
      fullName:
        String(actor?.fullName || "")
    },
    deletedAt:
      new Date().toISOString()
  };
}
