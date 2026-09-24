const STORE_PREFIX = "lenenergo:max-mini-app";
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function getRedisConfig() {
  /*
    Vercel/Upstash integration can expose Redis as KV_REST_API_*.
    Prefer those automatically-created variables, then fall back to
    UPSTASH_REDIS_REST_* for manual setups.
  */
  const url =
    String(
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      ""
    ).replace(/\/+$/, "");

  const token =
    String(
      process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      ""
    );

  return {
    url,
    token,
    configured: Boolean(url && token)
  };
}

export function isRuntimeStoreConfigured() {
  return getRedisConfig().configured;
}

export async function redisCommand(...args) {
  const config =
    getRedisConfig();

  if (!config.configured) {
    throw new Error(
      "Хранилище состояния не настроено. Подключите Vercel KV/Upstash (KV_REST_API_URL и KV_REST_API_TOKEN)."
    );
  }

  const response =
    await fetch(
      config.url,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${config.token}`,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(args),
        cache: "no-store"
      }
    );

  const payload =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      `Redis HTTP ${response.status}`
    );
  }

  return payload?.result;
}

function userKey(username) {
  return (
    `${STORE_PREFIX}:user:` +
    String(username || "")
      .trim()
      .toLowerCase()
  );
}

const ONLINE_KEY =
  `${STORE_PREFIX}:online`;

const SYSTEM_STATE_KEY =
  `${STORE_PREFIX}:system:state`;

function safeParse(value, fallback = null) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeSystemState(value) {
  const parsed =
    safeParse(value, {}) || {};

  const allowedModes =
    new Set([
      "normal",
      "maintenance",
      "stopped"
    ]);

  const mode =
    allowedModes.has(parsed.mode)
      ? parsed.mode
      : "normal";

  return {
    mode,
    message:
      String(parsed.message || ""),
    changedAt:
      parsed.changedAt || null,
    changedBy:
      parsed.changedBy || null
  };
}

export async function getSystemState() {
  if (!isRuntimeStoreConfigured()) {
    return {
      mode: "normal",
      message: "",
      changedAt: null,
      changedBy: null,
      storageConfigured: false
    };
  }

  const raw =
    await redisCommand(
      "GET",
      SYSTEM_STATE_KEY
    );

  return {
    ...normalizeSystemState(raw),
    storageConfigured: true
  };
}

export async function setSystemState({
  mode,
  message = "",
  actor
}) {
  const allowedModes =
    new Set([
      "normal",
      "maintenance",
      "stopped"
    ]);

  if (!allowedModes.has(mode)) {
    throw new Error(
      "Недопустимый режим системы"
    );
  }

  const state = {
    mode,
    message:
      String(message || "")
        .trim()
        .slice(0, 500),
    changedAt:
      new Date().toISOString(),
    changedBy: {
      username:
        String(actor?.username || ""),
      fullName:
        String(actor?.fullName || "")
    }
  };

  await redisCommand(
    "SET",
    SYSTEM_STATE_KEY,
    JSON.stringify(state)
  );

  return {
    ...state,
    storageConfigured: true
  };
}

async function readUserRuntime(username) {
  if (!isRuntimeStoreConfigured()) {
    return null;
  }

  const raw =
    await redisCommand(
      "GET",
      userKey(username)
    );

  return safeParse(raw, null);
}

async function writeUserRuntime(
  username,
  data
) {
  await redisCommand(
    "SET",
    userKey(username),
    JSON.stringify(data)
  );
}

function makeRuntimeIdentity(user) {
  return {
    username:
      String(user?.username || ""),
    fullName:
      String(
        user?.fullName ||
        user?.username ||
        ""
      ),
    isDispatcher:
      Boolean(user?.isDispatcher),
    isDeveloper:
      Boolean(user?.isDeveloper)
  };
}

export async function recordLogin(user) {
  if (!isRuntimeStoreConfigured()) {
    return false;
  }

  const now =
    new Date().toISOString();

  const identity =
    makeRuntimeIdentity(user);

  const old =
    await readUserRuntime(
      identity.username
    ) || {};

  const data = {
    ...old,
    ...identity,
    firstLoginAt:
      old.firstLoginAt || now,
    lastLoginAt: now,
    lastSeenAt: now,
    lastLogoutAt:
      old.lastLogoutAt || null
  };

  await Promise.all([
    writeUserRuntime(
      identity.username,
      data
    ),
    redisCommand(
      "ZADD",
      ONLINE_KEY,
      Date.now(),
      identity.username.toLowerCase()
    )
  ]);

  return true;
}

export async function recordHeartbeat(user) {
  if (!isRuntimeStoreConfigured()) {
    return false;
  }

  const identity =
    makeRuntimeIdentity(user);

  const old =
    await readUserRuntime(
      identity.username
    ) || {};

  const now =
    new Date().toISOString();

  const data = {
    ...old,
    ...identity,
    firstLoginAt:
      old.firstLoginAt || now,
    lastLoginAt:
      old.lastLoginAt || now,
    lastSeenAt: now
  };

  await Promise.all([
    writeUserRuntime(
      identity.username,
      data
    ),
    redisCommand(
      "ZADD",
      ONLINE_KEY,
      Date.now(),
      identity.username.toLowerCase()
    )
  ]);

  return true;
}

export async function recordLogout(user) {
  if (!isRuntimeStoreConfigured()) {
    return false;
  }

  const identity =
    makeRuntimeIdentity(user);

  const old =
    await readUserRuntime(
      identity.username
    ) || {};

  const now =
    new Date().toISOString();

  const data = {
    ...old,
    ...identity,
    firstLoginAt:
      old.firstLoginAt || now,
    lastLoginAt:
      old.lastLoginAt || now,
    lastSeenAt:
      old.lastSeenAt || now,
    lastLogoutAt: now
  };

  await Promise.all([
    writeUserRuntime(
      identity.username,
      data
    ),
    redisCommand(
      "ZREM",
      ONLINE_KEY,
      identity.username.toLowerCase()
    )
  ]);

  return true;
}

export async function getPresenceSnapshot(
  configuredUsers = []
) {
  const now =
    Date.now();

  const cutoff =
    now - ONLINE_WINDOW_MS;

  if (!isRuntimeStoreConfigured()) {
    return {
      storageConfigured: false,
      onlineCount: 0,
      onlineWindowSeconds:
        Math.floor(
          ONLINE_WINDOW_MS / 1000
        ),
      users:
        configuredUsers.map(
          (user) => ({
            ...user,
            online: false,
            firstLoginAt: null,
            lastLoginAt: null,
            lastSeenAt: null,
            lastLogoutAt: null,
            lastSessionAt: null
          })
        )
    };
  }

  /*
    Убираем давно исчезнувшие heartbeat из online-set.
    Это не удаляет историю пользователя.
  */
  await redisCommand(
    "ZREMRANGEBYSCORE",
    ONLINE_KEY,
    "-inf",
    cutoff - 1
  );

  const onlineMembers =
    await redisCommand(
      "ZRANGEBYSCORE",
      ONLINE_KEY,
      cutoff,
      "+inf"
    ) || [];

  const onlineSet =
    new Set(
      onlineMembers.map(
        (value) =>
          String(value)
            .toLowerCase()
      )
    );

  const users =
    await Promise.all(
      configuredUsers.map(
        async (user) => {
          const runtime =
            await readUserRuntime(
              user.username
            );

          const normalized =
            String(user.username)
              .toLowerCase();

          const online =
            onlineSet.has(
              normalized
            );

          const lastSessionAt =
            runtime?.lastSeenAt ||
            runtime?.lastLoginAt ||
            null;

          return {
            ...user,
            online,
            firstLoginAt:
              runtime?.firstLoginAt ||
              null,
            lastLoginAt:
              runtime?.lastLoginAt ||
              null,
            lastSeenAt:
              runtime?.lastSeenAt ||
              null,
            lastLogoutAt:
              runtime?.lastLogoutAt ||
              null,
            lastSessionAt
          };
        }
      )
    );

  users.sort(
    (a, b) => {
      if (
        a.online !== b.online
      ) {
        return a.online ? -1 : 1;
      }

      const aTime =
        a.lastSessionAt
          ? Date.parse(
              a.lastSessionAt
            )
          : 0;

      const bTime =
        b.lastSessionAt
          ? Date.parse(
              b.lastSessionAt
            )
          : 0;

      return bTime - aTime;
    }
  );

  return {
    storageConfigured: true,
    onlineCount:
      users.filter(
        (user) => user.online
      ).length,
    onlineWindowSeconds:
      Math.floor(
        ONLINE_WINDOW_MS / 1000
      ),
    users
  };
}

export async function removeUserRuntime(
  username
) {
  if (!isRuntimeStoreConfigured()) {
    return false;
  }

  const normalized =
    String(username || "")
      .trim()
      .toLowerCase();

  if (!normalized) {
    return false;
  }

  await Promise.all([
    redisCommand(
      "DEL",
      userKey(normalized)
    ),
    redisCommand(
      "ZREM",
      ONLINE_KEY,
      normalized
    )
  ]);

  return true;
}
