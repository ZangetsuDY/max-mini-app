import crypto from "node:crypto";

const SESSION_COOKIE = "le_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const INIT_DATA_TTL_SECONDS = 60 * 60;

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseInitData(initData) {
  return String(initData || "")
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return [part, ""];
      }

      return [
        part.slice(0, separatorIndex),
        part.slice(separatorIndex + 1)
      ];
    });
}

export function validateMaxInitData(initData, botToken) {
  if (!initData || !botToken) {
    return {
      ok: false,
      reason: "Откройте приложение внутри MAX."
    };
  }

  const params = parseInitData(initData);
  const hashItems = params.filter(([key]) => key === "hash");

  if (hashItems.length !== 1) {
    return {
      ok: false,
      reason: "Некорректные данные запуска MAX."
    };
  }

  const originalHash = safeDecode(hashItems[0][1]);

  const decoded = params
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => [key, safeDecode(value)])
    .sort(([a], [b]) => a.localeCompare(b));

  const launchParams = decoded
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(launchParams)
    .digest("hex");

  let originalBuffer;
  let calculatedBuffer;

  try {
    originalBuffer = Buffer.from(originalHash, "hex");
    calculatedBuffer = Buffer.from(calculatedHash, "hex");
  } catch {
    return {
      ok: false,
      reason: "Некорректная подпись MAX."
    };
  }

  if (
    originalBuffer.length !== calculatedBuffer.length ||
    !crypto.timingSafeEqual(originalBuffer, calculatedBuffer)
  ) {
    return {
      ok: false,
      reason: "Подпись MAX не прошла проверку."
    };
  }

  const authDateEntry = decoded.find(([key]) => key === "auth_date");
  const authDate = authDateEntry ? Number(authDateEntry[1]) : 0;
  const now = Math.floor(Date.now() / 1000);

  if (
    !authDate ||
    Math.abs(now - authDate) > INIT_DATA_TTL_SECONDS
  ) {
    return {
      ok: false,
      reason: "Сессия MAX устарела. Закройте и снова откройте мини-приложение."
    };
  }

  return { ok: true };
}

function parseCookies(header) {
  const cookies = {};

  String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf("=");

      if (index === -1) return;

      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      cookies[key] = value;
    });

  return cookies;
}

function signSessionPayload(payload, secret) {
  const body = Buffer
    .from(JSON.stringify(payload), "utf8")
    .toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || !secret) return null;

  const [body, signature] = String(token).split(".");

  if (!body || !signature) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload;

  try {
    payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    );
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (!payload?.exp || payload.exp <= now) {
    return null;
  }

  if (!payload?.username || !payload?.fullName) {
    return null;
  }

  return payload;
}

export function getSession(request) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("На сервере не настроен AUTH_SECRET");
  }

  /*
    web.max.ru может открывать Mini App как cross-site frame.
    В таком режиме браузер способен не отправлять third-party cookie.

    Поэтому сначала принимаем подписанный session token из заголовка.
    Если его нет — используем cookie как раньше.
  */
  const headerToken =
    request.headers.get("X-App-Session") || "";

  if (headerToken) {
    return verifySessionToken(
      headerToken,
      secret
    );
  }

  const cookies = parseCookies(
    request.headers.get("cookie")
  );

  return verifySessionToken(
    cookies[SESSION_COOKIE],
    secret
  );
}

export function createSessionToken(user) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("На сервере не настроен AUTH_SECRET");
  }

  const now = Math.floor(Date.now() / 1000);

  return signSessionPayload(
    {
      username: user.username,
      fullName: user.fullName,
      isDispatcher: Boolean(user.isDispatcher),
      iat: now,
      exp: now + SESSION_TTL_SECONDS
    },
    secret
  );
}

export function createSessionCookie(user, existingToken = "") {
  const token =
    existingToken || createSessionToken(user);

  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=None"
  ].join("; ");
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=None"
  ].join("; ");
}

function loadUsers() {
  const raw = process.env.APP_USERS_JSON;

  if (!raw) {
    throw new Error("На сервере не настроен APP_USERS_JSON");
  }

  let users;

  try {
    users = JSON.parse(raw);
  } catch {
    throw new Error("APP_USERS_JSON содержит некорректный JSON");
  }

  if (!Array.isArray(users)) {
    throw new Error("APP_USERS_JSON должен быть JSON-массивом");
  }

  return users;
}

export function verifyCredentials(username, password) {
  const normalizedUsername = String(username || "")
    .trim()
    .toLowerCase();

  const passwordValue = String(password || "");

  if (!normalizedUsername || !passwordValue) {
    return null;
  }

  const users = loadUsers();

  const user = users.find((item) =>
    String(item?.username || "")
      .trim()
      .toLowerCase() === normalizedUsername
  );

  if (
    !user ||
    !user.fullName ||
    !user.salt ||
    !user.passwordHash
  ) {
    // Выполняем PBKDF2 даже для отсутствующего пользователя,
    // чтобы немного усложнить проверку существования логина по времени ответа.
    crypto.pbkdf2Sync(
      passwordValue,
      "00000000000000000000000000000000",
      210000,
      32,
      "sha256"
    );

    return null;
  }

  const iterations = Number(user.iterations || 210000);

  const calculated = crypto
    .pbkdf2Sync(
      passwordValue,
      user.salt,
      iterations,
      32,
      "sha256"
    )
    .toString("hex");

  const storedBuffer = Buffer.from(
    String(user.passwordHash),
    "hex"
  );

  const calculatedBuffer = Buffer.from(
    calculated,
    "hex"
  );

  if (
    storedBuffer.length !== calculatedBuffer.length ||
    !crypto.timingSafeEqual(storedBuffer, calculatedBuffer)
  ) {
    return null;
  }

  return {
    username: String(user.username),
    fullName: String(user.fullName),
    isDispatcher: Boolean(user.isDispatcher)
  };
}
