/* =========================================================
   MAX MINI APP — авторизация + ВЭС
   ========================================================= */

const API_OUTAGES = "/api/ves";
const API_LOGIN = "/api/login";
const API_LOGOUT = "/api/logout";
const API_ME = "/api/me";

const REFRESH_INTERVAL_MS = 60_000;

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

const userFullName = document.getElementById("userFullName");
const logoutButton = document.getElementById("logoutButton");

const vesCard = document.getElementById("vesCard");
const vesToggle = document.getElementById("vesToggle");
const openVes = document.getElementById("openVes");

const totalOutages = document.getElementById("totalOutages");
const vesCount = document.getElementById("vesCount");
const vesDescription = document.getElementById("vesDescription");
const outageList = document.getElementById("outageList");
const emptyState = document.getElementById("emptyState");
const updatedAt = document.getElementById("updatedAt");

let refreshTimer = null;
let isLoading = false;

function getMaxInitData() {
  try {
    return window.WebApp?.initData || "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitDateTime(value) {
  const [date = "", time = ""] =
    String(value || "").split(/\s+/);

  return { date, time };
}

function showLoginError(message) {
  loginError.textContent =
    message || "Ошибка авторизации";

  loginError.hidden = false;
}

function clearLoginError() {
  loginError.hidden = true;
  loginError.textContent = "";
}

function showLoginScreen() {
  document.body.classList.remove(
    "authenticated"
  );

  document.body.classList.add(
    "auth-pending"
  );

  authScreen.classList.remove(
    "is-leaving"
  );

  window.setTimeout(() => {
    usernameInput?.focus();
  }, 900);
}

function showApplication(user) {
  const fullName =
    user?.fullName || "Пользователь";

  userFullName.textContent = fullName;

  document.body.classList.add(
    "authenticated"
  );

  document.body.classList.remove(
    "auth-pending"
  );

  authScreen.classList.add(
    "is-leaving"
  );

  clearLoginError();

  window.setTimeout(() => {
    loadOutages();
    startAutoRefresh();
  }, 300);
}

async function checkSession() {
  try {
    const response = await fetch(API_ME, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      showLoginScreen();
      return;
    }

    const payload = await response.json();

    if (
      payload?.authenticated &&
      payload?.user
    ) {
      showApplication(payload.user);
      return;
    }

    showLoginScreen();
  } catch {
    showLoginScreen();
  }
}

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    clearLoginError();

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    if (!username || !password) {
      showLoginError(
        "Введите логин и пароль"
      );
      return;
    }

    const initData = getMaxInitData();

    if (!initData) {
      showLoginError(
        "Авторизация доступна только внутри мини-приложения MAX."
      );
      return;
    }

    loginButton.disabled = true;
    loginButton.querySelector("span").textContent =
      "Проверка…";

    try {
      const response = await fetch(
        API_LOGIN,
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
            "X-Max-Init-Data":
              initData
          },
          body: JSON.stringify({
            username,
            password
          })
        }
      );

      const payload =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось выполнить вход"
        );
      }

      passwordInput.value = "";

      showApplication(
        payload.user
      );
    } catch (error) {
      showLoginError(
        error instanceof Error
          ? error.message
          : "Ошибка авторизации"
      );
    } finally {
      loginButton.disabled = false;
      loginButton.querySelector("span").textContent =
        "Войти";
    }
  }
);

togglePassword.addEventListener(
  "click",
  () => {
    const hidden =
      passwordInput.type === "password";

    passwordInput.type =
      hidden ? "text" : "password";

    togglePassword.setAttribute(
      "aria-label",
      hidden
        ? "Скрыть пароль"
        : "Показать пароль"
    );
  }
);

logoutButton.addEventListener(
  "click",
  async () => {
    stopAutoRefresh();

    try {
      await fetch(API_LOGOUT, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin"
      });
    } finally {
      usernameInput.value = "";
      passwordInput.value = "";
      showLoginScreen();
    }
  }
);

function setVesOpen(open) {
  vesCard.classList.toggle(
    "is-open",
    open
  );

  vesToggle.setAttribute(
    "aria-expanded",
    String(open)
  );
}

vesToggle.addEventListener(
  "click",
  () => {
    setVesOpen(
      !vesCard.classList.contains(
        "is-open"
      )
    );
  }
);

openVes.addEventListener(
  "click",
  () => {
    setVesOpen(true);

    window.setTimeout(() => {
      vesCard.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);
  }
);

function renderLoading() {
  vesDescription.textContent =
    "Получаем данные из чата ВЭС…";

  updatedAt.textContent =
    "Обновление…";
}

function renderError(message) {
  totalOutages.textContent = "—";
  vesCount.textContent = "—";

  vesDescription.textContent =
    message ||
    "Не удалось загрузить данные";

  outageList.innerHTML = `
    <div class="empty-state" style="display:block">
      <div class="empty-icon" style="color:#ff7b84;background:rgba(255,90,102,.09)">!</div>
      <h3>Данные недоступны</h3>
      <p>${escapeHtml(
        message ||
        "Попробуйте обновить приложение позже."
      )}</p>
    </div>
  `;

  emptyState.hidden = true;
  updatedAt.textContent =
    "Ошибка обновления";
}

function renderOutages(payload) {
  const outages = Array.isArray(
    payload.outages
  )
    ? payload.outages
    : [];

  const count = Number(
    payload.count ?? outages.length
  );

  totalOutages.textContent = count;
  vesCount.textContent = count;

  vesDescription.textContent = count
    ? `Активных объектов: ${count}`
    : "Сеть работает без зарегистрированных аварийных отключений";

  outageList.innerHTML = "";
  emptyState.hidden = count !== 0;

  for (const outage of outages) {
    const { date, time } =
      splitDateTime(
        outage.eventTime
      );

    const item =
      document.createElement(
        "article"
      );

    item.className =
      "outage-item";

    item.innerHTML = `
      <button class="outage-summary" type="button" aria-expanded="false">
        <div class="outage-object">
          <span class="alert-dot"></span>

          <div>
            <span class="object-name">${escapeHtml(outage.object)}</span>
            <span class="object-author">${escapeHtml(outage.author)}</span>
          </div>
        </div>

        <div class="outage-time">
          <strong>${escapeHtml(time)}</strong>
          <span>${escapeHtml(date)}</span>
        </div>

        <span class="item-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m7 9 5 5 5-5"></path>
          </svg>
        </span>
      </button>

      <div class="outage-details">
        <div class="details-panel">
          <div class="detail-grid">
            <div class="detail">
              <span>Отключено</span>
              <strong>${escapeHtml(outage.eventTime)}</strong>
            </div>

            <div class="detail">
              <span>Добавлено</span>
              <strong>${escapeHtml(outage.addedTime || "—")}</strong>
            </div>

            <div class="detail">
              <span>Записал</span>
              <strong>${escapeHtml(outage.author || "—")}</strong>
            </div>

            <div class="detail">
              <span>Должность</span>
              <strong>${escapeHtml(outage.role || "—")}</strong>
            </div>
          </div>

          <div class="record-block">
            <span>Запись</span>
            <p>${escapeHtml(outage.record || "—")}</p>
          </div>
        </div>
      </div>
    `;

    const summary =
      item.querySelector(
        ".outage-summary"
      );

    summary.addEventListener(
      "click",
      () => {
        const willOpen =
          !item.classList.contains(
            "is-open"
          );

        item.classList.toggle(
          "is-open",
          willOpen
        );

        summary.setAttribute(
          "aria-expanded",
          String(willOpen)
        );
      }
    );

    outageList.appendChild(item);
  }

  const updated =
    payload.updatedAt
      ? new Date(payload.updatedAt)
      : new Date();

  updatedAt.textContent =
    `Обновлено ${updated.toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )}`;

  if (payload.historyLimited) {
    vesDescription.textContent +=
      " · история ограничена";
  }
}

async function loadOutages() {
  if (isLoading) return;

  isLoading = true;
  renderLoading();

  try {
    const initData =
      getMaxInitData();

    if (!initData) {
      throw new Error(
        "Откройте мини-приложение внутри MAX."
      );
    }

    const response = await fetch(
      API_OUTAGES,
      {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "X-Max-Init-Data":
            initData
        }
      }
    );

    if (response.status === 401) {
      stopAutoRefresh();
      showLoginScreen();

      throw new Error(
        "Сессия завершена. Авторизуйтесь снова."
      );
    }

    const payload =
      await response.json().catch(
        () => null
      );

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        `Сервер вернул ошибку ${response.status}`
      );
    }

    renderOutages(payload);
  } catch (error) {
    console.error(error);

    // Если экран входа уже открыт,
    // не рисуем ошибку поверх интерфейса.
    if (
      !document.body.classList.contains(
        "auth-pending"
      )
    ) {
      renderError(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки"
      );
    }
  } finally {
    isLoading = false;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer = setInterval(
    loadOutages,
    REFRESH_INTERVAL_MS
  );
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/* Проверяем сохранённую HttpOnly-сессию после запуска. */
checkSession();
