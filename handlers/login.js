import {
  validateMaxInitData,
  verifyCredentials,
  createSessionCookie,
  createSessionToken
} from "../lib/security.js";

import {
  recordLogin
} from "../lib/runtime-store.js";

import {
  resolveUserAccess
} from "../lib/access-control.js";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const botToken = process.env.MAX_BOT_TOKEN;

    if (!botToken) {
      return json(
        { error: "На сервере не настроен MAX_BOT_TOKEN" },
        500
      );
    }

    const initData =
      request.headers.get("X-Max-Init-Data") || "";

    const maxValidation =
      validateMaxInitData(initData, botToken);

    if (!maxValidation.ok) {
      return json(
        { error: maxValidation.reason },
        401
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        { error: "Некорректный запрос" },
        400
      );
    }

    const username = String(body?.username || "")
      .trim()
      .slice(0, 80);

    const password = String(body?.password || "")
      .slice(0, 200);

    if (!username || !password) {
      return json(
        { error: "Введите логин и пароль" },
        400
      );
    }

    const user = await verifyCredentials(
      username,
      password
    );

    if (!user) {
      // Небольшая задержка при неверном логине/пароле.
      await new Promise((resolve) =>
        setTimeout(resolve, 650)
      );

      return json(
        { error: "Неверный логин или пароль" },
        401
      );
    }

    const sessionToken =
      createSessionToken(user);

    const cookie =
      createSessionCookie(
        user,
        sessionToken
      );

    try {
      await recordLogin(user);
    } catch (error) {
      console.error(
        "Не удалось записать вход пользователя:",
        error
      );
    }

    let effectiveUser = user;

    try {
      effectiveUser =
        await resolveUserAccess(
          user
        ) || user;
    } catch (error) {
      console.error(
        "Не удалось загрузить роли пользователя:",
        error
      );
    }

    return json(
      {
        ok: true,
        user: effectiveUser,
        sessionToken
      },
      200,
      {
        "Set-Cookie": cookie
      }
    );
  }
};
