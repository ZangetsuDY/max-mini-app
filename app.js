/* =========================================================
   ПАО «Россети Ленэнерго» — Mini App
   Авторизация -> Главное меню -> Модули
   ========================================================= */

const API_LOGIN = "/api/login";
const API_LOGOUT = "/api/logout";
const API_ME = "/api/me";
const API_OUTAGES = "/api/outages";
const API_DISPATCHER = "/api/dispatcher";
const API_HEARTBEAT = "/api/heartbeat";
const API_SYSTEM = "/api/system";
const API_ADMIN_DASHBOARD = "/api/admin/dashboard";
const API_ADMIN_SYSTEM = "/api/admin/system";

const REFRESH_INTERVAL_MS = 120_000;
const HEARTBEAT_INTERVAL_MS = 45_000;
const ADMIN_REFRESH_INTERVAL_MS = 30_000;
const SESSION_STORAGE_KEY = "le_app_session";

const DIVISIONS = [
  { id: "ves", name: "ВЭС" },
  { id: "gtes", name: "ГтЭС" },
  { id: "yues", name: "ЮЭС" },
  { id: "ses", name: "СЭС" },
  { id: "thes", name: "ТхЭС" },
  { id: "ks", name: "КС" },
  { id: "nles", name: "НлЭС" },
  { id: "knes", name: "КнЭС" },
  { id: "yuvvr", name: "ЮВВР" },
  { id: "svvr", name: "СВВР" },
  { id: "vvvr", name: "ВВВР" },
  { id: "tsvvr", name: "ЦВВР" },
  { id: "os", name: "ОС" },
  { id: "volkhov", name: "Волхов" }
];

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

const userFullName = document.getElementById("userFullName");
const userRoleBadge = document.getElementById("userRoleBadge");
const logoutButton = document.getElementById("logoutButton");
const brandHomeButton = document.getElementById("brandHomeButton");

const homeView = document.getElementById("homeView");
const monitoringView = document.getElementById("monitoringView");
const adminView = document.getElementById("adminView");

const openMonitoringButton = document.getElementById("openMonitoringButton");
const openDispatcherButton = document.getElementById("openDispatcherButton");
const openAdminButton = document.getElementById("openAdminButton");
const dispatcherCardStatus = document.getElementById("dispatcherCardStatus");
const moduleCount = document.getElementById("moduleCount");
const backToMenuButton = document.getElementById("backToMenuButton");
const backFromAdminButton = document.getElementById("backFromAdminButton");

const systemLine = document.getElementById("systemLine");
const systemStatusText = document.getElementById("systemStatusText");

const adminUpdatedAt = document.getElementById("adminUpdatedAt");
const adminSystemBadge = document.getElementById("adminSystemBadge");
const storageWarning = document.getElementById("storageWarning");
const adminOnlineCount = document.getElementById("adminOnlineCount");
const adminTotalUsers = document.getElementById("adminTotalUsers");
const adminDispatcherCount = document.getElementById("adminDispatcherCount");
const adminDeveloperCount = document.getElementById("adminDeveloperCount");
const modeSelector = document.getElementById("modeSelector");
const systemMessageInput = document.getElementById("systemMessageInput");
const systemChangedInfo = document.getElementById("systemChangedInfo");
const saveSystemStateButton = document.getElementById("saveSystemStateButton");
const refreshAdminButton = document.getElementById("refreshAdminButton");
const sessionList = document.getElementById("sessionList");

const divisionGrid = document.getElementById("divisionGrid");
const totalOutages = document.getElementById("totalOutages");
const updatedAt = document.getElementById("updatedAt");
const dashboardStatus = document.getElementById("dashboardStatus");

const accessModal = document.getElementById("accessModal");
const closeModalButton = document.getElementById("closeModalButton");
const modalActionButton = document.getElementById("modalActionButton");
const modalIcon = document.getElementById("modalIcon");
const modalEyebrow = document.getElementById("modalEyebrow");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");

let currentUser = null;
let currentView = "home";
let currentSystemState = {
  mode: "normal",
  message: "",
  storageConfigured: false
};

let refreshTimer = null;
let heartbeatTimer = null;
let adminRefreshTimer = null;
let loadVersion = 0;
let divisionCardsRendered = false;
let selectedSystemMode = "normal";

function getAppSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setAppSessionToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {}
}

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

function setUserUi(user) {
  currentUser = {
    username: String(user?.username || ""),
    fullName: String(user?.fullName || "Пользователь"),
    isDispatcher: Boolean(user?.isDispatcher),
    isDeveloper: Boolean(user?.isDeveloper)
  };

  userFullName.textContent =
    currentUser.fullName;

  const roleText =
    currentUser.isDeveloper
      ? "Разработчик"
      : currentUser.isDispatcher
        ? "Диспетчер"
        : "Пользователь";

  userRoleBadge.textContent =
    roleText;

  userRoleBadge.classList.toggle(
    "is-dispatcher",
    currentUser.isDispatcher &&
    !currentUser.isDeveloper
  );

  userRoleBadge.classList.toggle(
    "is-developer",
    currentUser.isDeveloper
  );

  dispatcherCardStatus.textContent =
    currentUser.isDispatcher
      ? "РОЛЬ: ДИСПЕТЧЕР"
      : "ДОСТУП ПО РОЛИ";

  openAdminButton.hidden =
    !currentUser.isDeveloper;

  moduleCount.textContent =
    currentUser.isDeveloper
      ? "3 модуля"
      : "2 модуля";
}

function showLoginScreen() {
  stopAutoRefresh();
  stopHeartbeat();
  stopAdminRefresh();

  currentUser = null;
  currentView = "home";

  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  authScreen.classList.remove("is-leaving");

  homeView.classList.add("is-active");
  monitoringView.classList.remove("is-active");
  adminView.classList.remove("is-active");

  setTimeout(
    () => usernameInput?.focus(),
    700
  );
}

function showApplication(user) {
  setUserUi(user);

  document.body.classList.add("authenticated");
  document.body.classList.remove("auth-pending");
  authScreen.classList.add("is-leaving");

  clearLoginError();
  navigateHome();
  startHeartbeat();
  loadSystemState();
}

function setView(view) {
  currentView = view;

  homeView.classList.toggle(
    "is-active",
    view === "home"
  );

  monitoringView.classList.toggle(
    "is-active",
    view === "monitoring"
  );

  adminView.classList.toggle(
    "is-active",
    view === "admin"
  );

  if (view !== "monitoring") {
    stopAutoRefresh();
  }

  if (view !== "admin") {
    stopAdminRefresh();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function navigateHome() {
  setView("home");
}

function navigateMonitoring() {
  if (
    currentSystemState.mode !== "normal" &&
    !currentUser?.isDeveloper
  ) {
    const title =
      currentSystemState.mode === "maintenance"
        ? "Технические работы"
        : "Система временно остановлена";

    openModal({
      type: "denied",
      eyebrow: "СОСТОЯНИЕ СИСТЕМЫ",
      title,
      message:
        currentSystemState.message ||
        "Оперативный доступ временно ограничен."
    });

    return;
  }

  setView("monitoring");

  if (!divisionCardsRendered) {
    renderDivisionCards();
    divisionCardsRendered = true;
  }

  loadAllDivisions();
  startAutoRefresh();
}

function navigateAdmin() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  setView("admin");
  loadAdminDashboard();
  startAdminRefresh();
}

function getSessionHeaders() {
  const sessionToken =
    getAppSessionToken();

  return sessionToken
    ? {
        "X-App-Session":
          sessionToken
      }
    : {};
}

function systemModeLabel(mode) {
  if (mode === "maintenance") {
    return "Технические работы";
  }

  if (mode === "stopped") {
    return "Система остановлена";
  }

  return "Штатный режим";
}

function renderSystemState(state) {
  currentSystemState = {
    mode:
      state?.mode || "normal",
    message:
      state?.message || "",
    storageConfigured:
      Boolean(
        state?.storageConfigured
      ),
    changedAt:
      state?.changedAt || null,
    changedBy:
      state?.changedBy || null
  };

  systemLine.classList.remove(
    "is-maintenance",
    "is-stopped"
  );

  if (
    currentSystemState.mode ===
    "maintenance"
  ) {
    systemLine.classList.add(
      "is-maintenance"
    );
  }

  if (
    currentSystemState.mode ===
    "stopped"
  ) {
    systemLine.classList.add(
      "is-stopped"
    );
  }

  systemStatusText.textContent =
    currentSystemState.message
      ? `${systemModeLabel(
          currentSystemState.mode
        )} — ${currentSystemState.message}`
      : systemModeLabel(
          currentSystemState.mode
        );

  if (adminSystemBadge) {
    adminSystemBadge.classList.remove(
      "is-maintenance",
      "is-stopped"
    );

    if (
      currentSystemState.mode ===
      "maintenance"
    ) {
      adminSystemBadge.classList.add(
        "is-maintenance"
      );
    }

    if (
      currentSystemState.mode ===
      "stopped"
    ) {
      adminSystemBadge.classList.add(
        "is-stopped"
      );
    }

    adminSystemBadge
      .querySelector("strong")
      .textContent =
        systemModeLabel(
          currentSystemState.mode
        );
  }
}

async function loadSystemState() {
  try {
    const response =
      await fetch(
        API_SYSTEM,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось получить состояние системы"
      );
    }

    renderSystemState(
      payload
    );
  } catch (error) {
    console.error(
      "System state:",
      error
    );

    renderSystemState({
      mode: "normal",
      message:
        "Состояние режима недоступно",
      storageConfigured: false
    });
  }
}

function openModal({
  type = "development",
  eyebrow = "ИНТЕРФЕЙС ДИСПЕТЧЕРА",
  title,
  message
}) {
  modalEyebrow.textContent = eyebrow;
  modalTitle.textContent = title;
  modalMessage.textContent = message;

  modalIcon.classList.remove(
    "is-denied",
    "is-development"
  );

  modalIcon.classList.add(
    type === "denied"
      ? "is-denied"
      : "is-development"
  );

  modalIcon.innerHTML =
    type === "denied"
      ? `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Z"></path>
          <path d="m9 9 6 6M15 9l-6 6"></path>
        </svg>
      `
      : `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 17v-5a8 8 0 0 1 16 0v5"></path>
          <path d="M4 14H2v4h4v-4H4Zm16 0h2v4h-4v-4h2Z"></path>
        </svg>
      `;

  accessModal.classList.add("is-open");
  accessModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  accessModal.classList.remove("is-open");
  accessModal.setAttribute("aria-hidden", "true");
}

async function checkSession() {
  try {
    const sessionToken =
      getAppSessionToken();

    const response = await fetch(
      API_ME,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: sessionToken
          ? {
              "X-App-Session":
                sessionToken
            }
          : {}
      }
    );

    if (!response.ok) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    const payload =
      await response.json();

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

    const initData =
      getMaxInitData();

    if (!initData) {
      showLoginError(
        "Авторизация доступна только внутри мини-приложения MAX."
      );
      return;
    }

    loginButton.disabled = true;
    loginButton.querySelector("span").textContent =
      "Проверка доступа…";

    try {
      const response = await fetch(
        API_LOGIN,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
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
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось выполнить вход"
        );
      }

      setAppSessionToken(
        payload?.sessionToken || ""
      );

      passwordInput.value = "";
      showApplication(payload.user);
    } catch (error) {
      showLoginError(
        error instanceof Error
          ? error.message
          : "Ошибка авторизации"
      );
    } finally {
      loginButton.disabled = false;
      loginButton.querySelector("span").textContent =
        "Войти в систему";
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
      await fetch(
        API_LOGOUT,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );
    } finally {
      setAppSessionToken("");
      usernameInput.value = "";
      passwordInput.value = "";
      showLoginScreen();
    }
  }
);

brandHomeButton.addEventListener(
  "click",
  navigateHome
);

backToMenuButton.addEventListener(
  "click",
  navigateHome
);

backFromAdminButton.addEventListener(
  "click",
  navigateHome
);

openMonitoringButton.addEventListener(
  "click",
  navigateMonitoring
);

openAdminButton.addEventListener(
  "click",
  navigateAdmin
);

openDispatcherButton.addEventListener(
  "click",
  async () => {
    const sessionToken =
      getAppSessionToken();

    try {
      const response = await fetch(
        API_DISPATCHER,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: sessionToken
            ? {
                "X-App-Session":
                  sessionToken
              }
            : {}
        }
      );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (response.status === 401) {
        setAppSessionToken("");
        showLoginScreen();
        return;
      }

      if (response.status === 403) {
        openModal({
          type: "denied",
          title: "Доступ ограничен",
          message:
            payload?.message ||
            "Вы не диспетчер"
        });
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          "Не удалось проверить доступ"
        );
      }

      openModal({
        type: "development",
        title: "Интерфейс Диспетчера",
        message:
          payload?.message ||
          "В разработке"
      });
    } catch (error) {
      openModal({
        type: "denied",
        eyebrow: "ОШИБКА ДОСТУПА",
        title: "Не удалось проверить права",
        message:
          error instanceof Error
            ? error.message
            : "Попробуйте ещё раз."
      });
    }
  }
);

closeModalButton.addEventListener(
  "click",
  closeModal
);

modalActionButton.addEventListener(
  "click",
  closeModal
);

accessModal.addEventListener(
  "click",
  (event) => {
    if (event.target === accessModal) {
      closeModal();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      accessModal.classList.contains(
        "is-open"
      )
    ) {
      closeModal();
    }
  }
);

/* =========================================================
   HEARTBEAT + ЦЕНТР УПРАВЛЕНИЯ
   ========================================================= */

async function sendHeartbeat() {
  if (!currentUser) {
    return;
  }

  try {
    const response =
      await fetch(
        API_HEARTBEAT,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
    }
  } catch (error) {
    console.error(
      "Heartbeat:",
      error
    );
  }
}

function startHeartbeat() {
  stopHeartbeat();

  sendHeartbeat();

  heartbeatTimer =
    setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL_MS
    );
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(
      heartbeatTimer
    );

    heartbeatTimer = null;
  }
}

function formatDateTime(value) {
  if (!value) {
    return "Нет данных";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Нет данных";
  }

  return date.toLocaleString(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function userRoleText(user) {
  if (
    user?.isDeveloper &&
    user?.isDispatcher
  ) {
    return "Разработчик · Диспетчер";
  }

  if (user?.isDeveloper) {
    return "Разработчик";
  }

  if (user?.isDispatcher) {
    return "Диспетчер";
  }

  return "Пользователь";
}

function renderAdminUsers(users) {
  if (
    !Array.isArray(users) ||
    !users.length
  ) {
    sessionList.innerHTML = `
      <div class="session-empty">
        Пользователи не найдены.
      </div>
    `;

    return;
  }

  sessionList.innerHTML =
    users.map(
      (user) => {
        const lastSession =
          user.online
            ? `Последняя активность: ${formatDateTime(
                user.lastSeenAt
              )}`
            : user.lastSessionAt
              ? `Последний сеанс: ${formatDateTime(
                  user.lastSessionAt
                )}`
              : "Ещё не входил";

        const loginText =
          user.lastLoginAt
            ? `Последний вход: ${formatDateTime(
                user.lastLoginAt
              )}`
            : "Входов пока нет";

        return `
          <div class="session-row">
            <div class="session-person">
              <strong>
                ${escapeHtml(
                  user.fullName ||
                  user.username
                )}
              </strong>
              <span>
                ${escapeHtml(
                  user.username
                )} · ${escapeHtml(
                  loginText
                )}
              </span>
            </div>

            <span class="session-role">
              ${escapeHtml(
                userRoleText(user)
              )}
            </span>

            <div class="session-status">
              <strong class="${
                user.online
                  ? "is-online"
                  : ""
              }">
                <i></i>
                ${
                  user.online
                    ? "Сейчас в системе"
                    : "Не в системе"
                }
              </strong>
              <small>
                ${escapeHtml(
                  lastSession
                )}
              </small>
            </div>
          </div>
        `;
      }
    ).join("");
}

function selectMode(mode) {
  selectedSystemMode =
    mode;

  modeSelector
    .querySelectorAll(
      ".mode-option"
    )
    .forEach(
      (button) => {
        button.classList.toggle(
          "is-selected",
          button.dataset.mode ===
            mode
        );
      }
    );
}

function renderAdminDashboard(
  payload
) {
  storageWarning.hidden =
    Boolean(
      payload.storageConfigured
    );

  adminOnlineCount.textContent =
    payload.onlineCount ?? "—";

  adminTotalUsers.textContent =
    payload.totalUsers ?? "—";

  adminDispatcherCount.textContent =
    payload.dispatcherCount ?? "—";

  adminDeveloperCount.textContent =
    payload.developerCount ?? "—";

  const system =
    payload.system || {
      mode: "normal",
      message: ""
    };

  renderSystemState(system);

  selectMode(
    system.mode || "normal"
  );

  systemMessageInput.value =
    system.message || "";

  if (system.changedAt) {
    const who =
      system.changedBy?.fullName ||
      system.changedBy?.username ||
      "неизвестно";

    systemChangedInfo.textContent =
      `Изменено ${formatDateTime(
        system.changedAt
      )} · ${who}`;
  } else {
    systemChangedInfo.textContent =
      payload.storageConfigured
        ? "Режим ещё не изменялся"
        : "Хранилище состояния не подключено";
  }

  renderAdminUsers(
    payload.users
  );

  adminUpdatedAt.textContent =
    `Обновлено ${new Date().toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )}`;
}

async function loadAdminDashboard() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  sessionList.innerHTML = `
    <div class="session-loading">
      Обновление данных центра управления…
    </div>
  `;

  try {
    const response =
      await fetch(
        API_ADMIN_DASHBOARD,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    if (response.status === 403) {
      navigateHome();
      return;
    }

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить центр управления"
      );
    }

    renderAdminDashboard(
      payload
    );
  } catch (error) {
    sessionList.innerHTML = `
      <div class="session-empty">
        ${escapeHtml(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки"
        )}
      </div>
    `;
  }
}

async function saveSystemState() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  saveSystemStateButton.disabled =
    true;

  saveSystemStateButton
    .querySelector("span")
    .textContent =
      "Применение…";

  try {
    const response =
      await fetch(
        API_ADMIN_SYSTEM,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            mode:
              selectedSystemMode,
            message:
              systemMessageInput.value
                .trim()
          })
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return;
    }

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось применить режим"
      );
    }

    renderSystemState(
      payload.system
    );

    await loadAdminDashboard();

    openModal({
      type: "development",
      eyebrow:
        "ЦЕНТР УПРАВЛЕНИЯ",
      title:
        "Режим применён",
      message:
        `Текущее состояние: ${systemModeLabel(
          payload.system.mode
        )}.`
    });
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "ЦЕНТР УПРАВЛЕНИЯ",
      title:
        "Не удалось изменить режим",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  } finally {
    saveSystemStateButton.disabled =
      false;

    saveSystemStateButton
      .querySelector("span")
      .textContent =
        "Применить режим";
  }
}

function startAdminRefresh() {
  stopAdminRefresh();

  adminRefreshTimer =
    setInterval(
      () => {
        if (
          currentView === "admin"
        ) {
          loadAdminDashboard();
        }
      },
      ADMIN_REFRESH_INTERVAL_MS
    );
}

function stopAdminRefresh() {
  if (adminRefreshTimer) {
    clearInterval(
      adminRefreshTimer
    );

    adminRefreshTimer = null;
  }
}

modeSelector.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".mode-option"
      );

    if (!button) {
      return;
    }

    selectMode(
      button.dataset.mode
    );
  }
);

saveSystemStateButton.addEventListener(
  "click",
  saveSystemState
);

refreshAdminButton.addEventListener(
  "click",
  loadAdminDashboard
);

/* =========================================================
   АВАРИЙНЫЙ МОНИТОРИНГ
   ========================================================= */

function renderDivisionCards() {
  divisionGrid.innerHTML =
    DIVISIONS.map(
      (division) => `
        <article
          class="division-card"
          id="card-${division.id}"
        >
          <button
            class="division-header"
            type="button"
            aria-expanded="false"
          >
            <div class="division-main">
              <div class="division-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M13.2 2 5.5 13.1h5.3L9.9 22l8.6-12.2h-5.6L13.2 2Z"></path>
                </svg>
              </div>

              <div>
                <div class="division-kicker">
                  ПОДРАЗДЕЛЕНИЕ
                </div>
                <h2>
                  ${escapeHtml(
                    division.name
                  )}
                </h2>
                <p>
                  Аварийные события и отключения
                </p>
              </div>
            </div>

            <div class="division-actions">
              <div class="counter">
                <span>Отключений</span>
                <strong class="division-count">
                  —
                </strong>
              </div>

              <span
                class="chevron"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path d="m7 9 5 5 5-5"></path>
                </svg>
              </span>
            </div>
          </button>

          <div class="division-body">
            <div class="section-heading">
              <div>
                <h3>Текущие отключения</h3>
                <p class="division-description">
                  Загрузка данных…
                </p>
              </div>

              <div class="live-badge loading">
                <span></span>
                <b>LOAD</b>
              </div>
            </div>

            <div class="outage-list"></div>

            <div
              class="empty-state"
              hidden
            >
              <div class="empty-icon">
                ✓
              </div>
              <h3>
                Активных отключений нет
              </h3>
              <p>
                Все зарегистрированные объекты
                находятся во включённом состоянии.
              </p>
            </div>
          </div>
        </article>
      `
    ).join("");

  divisionGrid
    .querySelectorAll(
      ".division-card"
    )
    .forEach((card) => {
      const header =
        card.querySelector(
          ".division-header"
        );

      header.addEventListener(
        "click",
        () => {
          const willOpen =
            !card.classList.contains(
              "is-open"
            );

          card.classList.toggle(
            "is-open",
            willOpen
          );

          header.setAttribute(
            "aria-expanded",
            String(willOpen)
          );
        }
      );
    });
}

function setBadge(
  card,
  type,
  text
) {
  const badge =
    card.querySelector(
      ".live-badge"
    );

  badge.className =
    `live-badge ${type || ""}`.trim();

  badge
    .querySelector("b")
    .textContent = text;
}

function renderDivisionLoading(
  division
) {
  const card =
    document.getElementById(
      `card-${division.id}`
    );

  if (!card) return;

  card
    .querySelector(
      ".division-description"
    )
    .textContent =
      "Получаем данные из чата…";

  setBadge(
    card,
    "loading",
    "LOAD"
  );
}

function renderDivisionError(
  division,
  message
) {
  const card =
    document.getElementById(
      `card-${division.id}`
    );

  if (!card) return;

  card
    .querySelector(
      ".division-count"
    )
    .textContent = "—";

  card
    .querySelector(
      ".division-description"
    )
    .textContent =
      message ||
      "Данные недоступны";

  card
    .querySelector(
      ".outage-list"
    )
    .innerHTML = `
      <div
        class="empty-state"
        style="display:block"
      >
        <div
          class="empty-icon"
          style="
            color:#ff8f98;
            background:rgba(255,107,118,.07)
          "
        >
          !
        </div>
        <h3>Данные недоступны</h3>
        <p>
          ${escapeHtml(
            message ||
            "Не удалось получить данные."
          )}
        </p>
      </div>
    `;

  card
    .querySelector(
      ".division-body > .empty-state"
    )
    ?.setAttribute(
      "hidden",
      ""
    );

  setBadge(
    card,
    "error",
    "ERR"
  );
}

function renderDivisionData(
  division,
  payload
) {
  const card =
    document.getElementById(
      `card-${division.id}`
    );

  if (!card) return;

  const outages =
    Array.isArray(
      payload.outages
    )
      ? payload.outages
      : [];

  const count =
    Number(
      payload.count ??
      outages.length
    );

  card
    .querySelector(
      ".division-count"
    )
    .textContent = count;

  card
    .querySelector(
      ".division-description"
    )
    .textContent =
      count
        ? `Активных объектов: ${count}`
        : "Активных отключений нет";

  const list =
    card.querySelector(
      ".outage-list"
    );

  const empty =
    card.querySelector(
      ".division-body > .empty-state"
    );

  list.innerHTML = "";
  empty.hidden = count !== 0;

  setBadge(
    card,
    "",
    "LIVE"
  );

  for (
    const outage
    of outages
  ) {
    const {
      date,
      time
    } =
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
      <button
        class="outage-summary"
        type="button"
        aria-expanded="false"
      >
        <div class="outage-object">
          <span class="alert-dot"></span>

          <div>
            <span class="object-name">
              ${escapeHtml(
                outage.object
              )}
            </span>

            <span class="object-author">
              ${escapeHtml(
                outage.author
              )}
            </span>
          </div>
        </div>

        <div class="outage-time">
          <strong>
            ${escapeHtml(time)}
          </strong>
          <span>
            ${escapeHtml(date)}
          </span>
        </div>

        <span
          class="item-chevron"
          aria-hidden="true"
        >
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
              <strong>
                ${escapeHtml(
                  outage.eventTime
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Добавлено</span>
              <strong>
                ${escapeHtml(
                  outage.addedTime ||
                  "—"
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Записал</span>
              <strong>
                ${escapeHtml(
                  outage.author ||
                  "—"
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Должность</span>
              <strong>
                ${escapeHtml(
                  outage.role ||
                  "—"
                )}
              </strong>
            </div>

            ${
              outage.sourceObject
                ? `
                  <div class="detail">
                    <span>
                      Объект сообщения
                    </span>
                    <strong>
                      ${escapeHtml(
                        outage.sourceObject
                      )}
                    </strong>
                  </div>
                `
                : ""
            }
          </div>

          <div class="record-block">
            <span>Запись</span>
            <p>
              ${escapeHtml(
                outage.record ||
                "—"
              )}
            </p>
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

    list.appendChild(item);
  }
}

async function loadDivision(
  division,
  version
) {
  renderDivisionLoading(
    division
  );

  const initData =
    getMaxInitData();

  if (!initData) {
    throw new Error(
      "Откройте мини-приложение внутри MAX."
    );
  }

  const sessionToken =
    getAppSessionToken();

  const response =
    await fetch(
      `${API_OUTAGES}?division=${encodeURIComponent(
        division.id
      )}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          "X-Max-Init-Data":
            initData,
          ...(
            sessionToken
              ? {
                  "X-App-Session":
                    sessionToken
                }
              : {}
          )
        }
      }
    );

  if (
    response.status === 401
  ) {
    setAppSessionToken("");
    stopAutoRefresh();
    showLoginScreen();

    throw new Error(
      "Сессия завершена. Авторизуйтесь снова."
    );
  }

  const payload =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      `Сервер вернул ошибку ${response.status}`
    );
  }

  if (
    version !== loadVersion
  ) {
    return null;
  }

  renderDivisionData(
    division,
    payload
  );

  return Number(
    payload.count || 0
  );
}

async function loadAllDivisions() {
  const version =
    ++loadVersion;

  dashboardStatus.textContent =
    "Обновление данных";

  totalOutages.textContent =
    "—";

  const results =
    await Promise.allSettled(
      DIVISIONS.map(
        async (division) => {
          try {
            return await loadDivision(
              division,
              version
            );
          } catch (error) {
            if (
              version === loadVersion &&
              currentView === "monitoring" &&
              document.body.classList.contains(
                "authenticated"
              )
            ) {
              renderDivisionError(
                division,
                error instanceof Error
                  ? error.message
                  : "Ошибка загрузки"
              );
            }

            throw error;
          }
        }
      )
    );

  if (
    version !== loadVersion
  ) {
    return;
  }

  let total = 0;
  let successful = 0;

  for (
    const result
    of results
  ) {
    if (
      result.status ===
        "fulfilled" &&
      result.value !== null
    ) {
      successful += 1;
      total +=
        Number(
          result.value || 0
        );
    }
  }

  totalOutages.textContent =
    total;

  dashboardStatus.textContent =
    successful ===
    DIVISIONS.length
      ? "Все подразделения обновлены"
      : `Доступно ${successful} из ${DIVISIONS.length}`;

  const now =
    new Date();

  updatedAt.textContent =
    `Обновлено ${now.toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )}`;
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer =
    setInterval(
      () => {
        if (
          currentView ===
          "monitoring"
        ) {
          loadAllDivisions();
        }
      },
      REFRESH_INTERVAL_MS
    );
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(
      refreshTimer
    );

    refreshTimer = null;
  }
}

checkSession();
