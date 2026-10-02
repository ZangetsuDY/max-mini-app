/* =========================================================
   ПАО «Россети Ленэнерго» — Mini App
   Авторизация -> Главное меню -> Модули
   ========================================================= */

const API_LOGIN = "/api/login";
const API_LOGOUT = "/api/logout";
const API_ME = "/api/me";
const API_OUTAGES = "/api/outages";
const API_DISPATCHER = "/api/dispatcher";
const API_EXECUTIVE_MONITORING = "/api/executive-monitoring";
const API_HEARTBEAT = "/api/heartbeat";
const API_SYSTEM = "/api/system";
const API_ADMIN_DASHBOARD = "/api/admin/dashboard";
const API_ADMIN_SYSTEM = "/api/admin/system";
const API_ADMIN_ACCESS = "/api/admin/access";
const API_ADMIN_ROLES = "/api/admin/roles";
const API_ADMIN_USER_ROLES = "/api/admin/user-roles";
const API_ADMIN_USERS = "/api/admin/users";
const API_ADMIN_DISPATCHER_CONFIG = "/api/admin/dispatcher-config";
const API_ADMIN_OUTAGE_CONFIG = "/api/admin/outage-config";

const REFRESH_INTERVAL_MS = 120_000;
const HEARTBEAT_INTERVAL_MS = 45_000;
const ADMIN_REFRESH_INTERVAL_MS = 30_000;
const DISPATCHER_REFRESH_INTERVAL_MS = 20_000;
const EXECUTIVE_REFRESH_INTERVAL_MS = 30_000;
const SESSION_STORAGE_KEY = "le_app_session";
const MAX_BRIDGE_URL = "https://st.max.ru/js/max-web-app.js";
const STARTUP_REQUEST_TIMEOUT_MS = 7_000;
const LOGIN_REQUEST_TIMEOUT_MS = 18_000;
const MAX_BRIDGE_TIMEOUT_MS = 10_000;


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
const dispatcherView = document.getElementById("dispatcherView");
const executiveView = document.getElementById("executiveView");
const adminView = document.getElementById("adminView");

const openMonitoringButton = document.getElementById("openMonitoringButton");
const openDispatcherButton = document.getElementById("openDispatcherButton");
const openExecutiveButton = document.getElementById("openExecutiveButton");
const openAdminButton = document.getElementById("openAdminButton");
const dispatcherCardStatus = document.getElementById("dispatcherCardStatus");
const executiveCardStatus = document.getElementById("executiveCardStatus");
const moduleCount = document.getElementById("moduleCount");
const backToMenuButton = document.getElementById("backToMenuButton");
const backFromDispatcherButton = document.getElementById("backFromDispatcherButton");
const backFromExecutiveButton = document.getElementById("backFromExecutiveButton");
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
const createUserButton = document.getElementById("createUserButton");
const sessionList = document.getElementById("sessionList");

const accessManagementPanel =
  document.getElementById(
    "accessManagementPanel"
  );

const createRoleButton =
  document.getElementById(
    "createRoleButton"
  );

const roleList =
  document.getElementById(
    "roleList"
  );

const managementModal =
  document.getElementById(
    "managementModal"
  );

const closeManagementModal =
  document.getElementById(
    "closeManagementModal"
  );

const managementCancelButton =
  document.getElementById(
    "managementCancelButton"
  );

const managementSaveButton =
  document.getElementById(
    "managementSaveButton"
  );

const managementEyebrow =
  document.getElementById(
    "managementEyebrow"
  );

const managementTitle =
  document.getElementById(
    "managementTitle"
  );

const managementBody =
  document.getElementById(
    "managementBody"
  );

const divisionGrid = document.getElementById("divisionGrid");
const totalOutages = document.getElementById("totalOutages");
const updatedAt = document.getElementById("updatedAt");
const dashboardStatus = document.getElementById("dashboardStatus");
const divisionCountCaption = document.getElementById("divisionCountCaption");

const dispatcherAssignedDivision = document.getElementById("dispatcherAssignedDivision");
const dispatcherAssignedHint = document.getElementById("dispatcherAssignedHint");
const dispatcherGroupSelectWrap = document.getElementById("dispatcherGroupSelectWrap");
const dispatcherGroupSelect = document.getElementById("dispatcherGroupSelect");
const dispatcherUnitSelect = document.getElementById("dispatcherUnitSelect");
const dispatcherRefreshButton = document.getElementById("dispatcherRefreshButton");
const dispatcherUpdatedAt = document.getElementById("dispatcherUpdatedAt");
const dispatcherDataNotice = document.getElementById("dispatcherDataNotice");
const dispatcherUnitTitle = document.getElementById("dispatcherUnitTitle");
const dispatcherSourceMeta = document.getElementById("dispatcherSourceMeta");
const dispatcherSourcesText = document.getElementById("dispatcherSourcesText");
const dispatcherSourceBreakdown = document.getElementById("dispatcherSourceBreakdown");
const dispatcherLiveBadge = document.getElementById("dispatcherLiveBadge");
const dispatcherRequestsChart = document.getElementById("dispatcherRequestsChart");
const dispatcherReqReview = document.getElementById("dispatcherReqReview");
const dispatcherReqApproved = document.getElementById("dispatcherReqApproved");
const dispatcherReqOpen = document.getElementById("dispatcherReqOpen");
const dispatcherReqClosed = document.getElementById("dispatcherReqClosed");
const dispatcherReqAcknowledged = document.getElementById("dispatcherReqAcknowledged");
const dispatcherReqEnding = document.getElementById("dispatcherReqEnding");
const dispatcherReqTotal = document.getElementById("dispatcherReqTotal");
const dispatcherReqTotalCaption = document.getElementById("dispatcherReqTotalCaption");

const dispatcherWorkordersLiveBadge = document.getElementById("dispatcherWorkordersLiveBadge");
const dispatcherWorkordersMeta = document.getElementById("dispatcherWorkordersMeta");
const dispatcherWorkordersSourcesText = document.getElementById("dispatcherWorkordersSourcesText");
const dispatcherWorkordersNotice = document.getElementById("dispatcherWorkordersNotice");
const dispatcherWorkordersBreakdown = document.getElementById("dispatcherWorkordersBreakdown");
const dispatcherWorkordersChart = document.getElementById("dispatcherWorkordersChart");
const dispatcherWorkordersTotal = document.getElementById("dispatcherWorkordersTotal");
const dispatcherWorkordersRegistered = document.getElementById("dispatcherWorkordersRegistered");
const dispatcherWorkordersCreated = document.getElementById("dispatcherWorkordersCreated");
const dispatcherWorkordersAdmission = document.getElementById("dispatcherWorkordersAdmission");
const dispatcherWorkordersPreparation = document.getElementById("dispatcherWorkordersPreparation");
const dispatcherWorkordersBreak = document.getElementById("dispatcherWorkordersBreak");

const outageManagementPanel = document.getElementById("outageManagementPanel");
const outageCreateDivisionButton = document.getElementById("outageCreateDivisionButton");
const outageConfigStatus = document.getElementById("outageConfigStatus");
const outageConfigList = document.getElementById("outageConfigList");

const dispatcherSourceManagementPanel = document.getElementById("dispatcherSourceManagementPanel");
const dispatcherConfigGroupSelect = document.getElementById("dispatcherConfigGroupSelect");
const dispatcherCreateGroupButton = document.getElementById("dispatcherCreateGroupButton");
const dispatcherCreateUnitButton = document.getElementById("dispatcherCreateUnitButton");
const dispatcherEditGroupButton = document.getElementById("dispatcherEditGroupButton");
const dispatcherDeleteGroupButton = document.getElementById("dispatcherDeleteGroupButton");
const dispatcherConfigStatus = document.getElementById("dispatcherConfigStatus");
const dispatcherConfigList = document.getElementById("dispatcherConfigList");

const dispatcherWorkordersManagementPanel = document.getElementById("dispatcherWorkordersManagementPanel");
const dispatcherWorkordersConfigGroupSelect = document.getElementById("dispatcherWorkordersConfigGroupSelect");
const dispatcherWorkordersConfigStatus = document.getElementById("dispatcherWorkordersConfigStatus");
const dispatcherWorkordersConfigList = document.getElementById("dispatcherWorkordersConfigList");

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
let dispatcherRefreshTimer = null;
let executiveRefreshTimer = null;
let loadVersion = 0;
let selectedSystemMode = "normal";
let selectedDispatcherGroupId = "";
let selectedDispatcherUnitId = "";
let selectedExecutiveGroupId = "";
let selectedExecutiveUnitId = "";
let dispatcherBreakdownUnitId = "";
let dispatcherBreakdownSelection = "__all__";
let dispatcherBreakdownExpanded = false;
let dispatcherWorkordersBreakdownUnitId = "";
let dispatcherWorkordersBreakdownSelection = "__all__";
let dispatcherWorkordersBreakdownExpanded = true;
let expandedOutageDivisionIds = new Set();

let accessCatalog = {
  panels: [],
  roles: [],
  users: [],
  dispatcherDivisions: []
};

let outageConfigCatalog = {
  divisions: [],
  availableSourceLabels: [],
  sourceData: {},
  storageConfigured: false
};

let dispatcherConfigCatalog = {
  groups: [],
  units: [],
  availableSourceLabels: [],
  sourceData: {},
  storageConfigured: false
};

let dispatcherWorkordersConfigCatalog = {
  groups: [],
  units: [],
  availableSourceLabels: [],
  sourceData: {},
  storageConfigured: false
};

let managementContext = null;

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


let maxBridgePromise = null;

function isLowBandwidthConnection() {
  try {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (!connection) {
      return false;
    }

    return Boolean(
      connection.saveData ||
      ["slow-2g", "2g"].includes(
        String(connection.effectiveType || "")
      )
    );
  } catch {
    return false;
  }
}

function applyConnectionMode() {
  if (isLowBandwidthConnection()) {
    document.body.classList.add(
      "low-bandwidth"
    );
  }
}

function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = STARTUP_REQUEST_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  return fetch(
    url,
    {
      ...options,
      signal: controller.signal
    }
  ).finally(
    () => clearTimeout(timer)
  );
}

function loadMaxBridge(
  timeoutMs = MAX_BRIDGE_TIMEOUT_MS
) {
  if (
    window.WebApp?.initData
  ) {
    return Promise.resolve(
      window.WebApp
    );
  }

  if (maxBridgePromise) {
    return maxBridgePromise;
  }

  maxBridgePromise =
    new Promise(
      (resolve, reject) => {
        const existing =
          document.querySelector(
            'script[data-max-bridge="true"]'
          );

        if (existing) {
          existing.remove();
        }

        const script =
          document.createElement(
            "script"
          );

        script.src =
          MAX_BRIDGE_URL;

        script.async = true;
        script.dataset.maxBridge =
          "true";

        let settled = false;

        const finish = (
          callback,
          value
        ) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timer);
          callback(value);
        };

        script.onload = () => {
          if (window.WebApp) {
            finish(
              resolve,
              window.WebApp
            );
          } else {
            finish(
              reject,
              new Error(
                "MAX Bridge загрузился без WebApp."
              )
            );
          }
        };

        script.onerror = () => {
          finish(
            reject,
            new Error(
              "Не удалось загрузить MAX Bridge."
            )
          );
        };

        const timer =
          setTimeout(
            () => {
              script.remove();

              finish(
                reject,
                new Error(
                  "MAX Bridge загружается слишком долго."
                )
              );
            },
            timeoutMs
          );

        document.head.appendChild(
          script
        );
      }
    ).catch(
      (error) => {
        /*
          Не кэшируем неудачу навсегда:
          следующий клик «Войти» сможет повторить загрузку.
        */
        maxBridgePromise = null;
        throw error;
      }
    );

  return maxBridgePromise;
}

async function waitForMaxInitData() {
  const current =
    getMaxInitData();

  if (current) {
    return current;
  }

  try {
    await loadMaxBridge();
  } catch {
    return "";
  }

  /*
    На части мобильных WebView объект появляется чуть позже onload.
  */
  const startedAt =
    Date.now();

  while (
    Date.now() - startedAt <
    1_500
  ) {
    const initData =
      getMaxInitData();

    if (initData) {
      return initData;
    }

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 100)
    );
  }

  return getMaxInitData();
}

function loadDeferredLogos() {
  /*
    Эти картинки НЕ участвуют в первоначальном window.load,
    поэтому медленный внешний сервер логотипа больше не может
    держать запуск Mini App.
  */
  if (isLowBandwidthConnection()) {
    return;
  }

  document
    .querySelectorAll(
      "img[data-logo-src]"
    )
    .forEach(
      (image) => {
        const source =
          image.dataset.logoSrc;

        if (!source) {
          return;
        }

        image.onload = () => {
          image
            .closest(
              ".logo-surface"
            )
            ?.classList.add(
              "is-logo-loaded"
            );
        };

        image.onerror = () => {
          image.removeAttribute(
            "src"
          );
        };

        image.src = source;
      }
    );
}

function startNonBlockingExternalResources() {
  /*
    Сначала сообщаем WebView, что сама страница уже загружена.
    После этого в фоне подключаем Bridge и необязательный логотип.
  */
  loadDeferredLogos();

  loadMaxBridge()
    .catch(() => {
      /*
        Это не ошибка запуска страницы.
        При входе пользователь сможет повторить попытку.
      */
    });
}

applyConnectionMode();

window.addEventListener(
  "load",
  () => {
    setTimeout(
      startNonBlockingExternalResources,
      0
    );
  },
  { once: true }
);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRoleColor(value, fallback = "#39c6e6") {
  const clean = String(value || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(clean) ? clean : fallback;
}

function roleColorRgba(value, alpha = 1) {
  const color = normalizeRoleColor(value).slice(1);
  const r = Number.parseInt(color.slice(0, 2), 16);
  const g = Number.parseInt(color.slice(2, 4), 16);
  const b = Number.parseInt(color.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyCurrentRoleColor(color) {
  const clean = normalizeRoleColor(color);
  userRoleBadge.style.color = clean;
  userRoleBadge.style.borderColor = roleColorRgba(clean, 0.34);
  userRoleBadge.style.background = roleColorRgba(clean, 0.10);
  userRoleBadge.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.03), 0 0 18px ${roleColorRgba(clean, 0.08)}`;
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

function hasPanelAccess(
  panelId
) {
  return Boolean(
    currentUser?.panelIds?.includes(
      panelId
    )
  );
}

function setUserUi(user) {
  currentUser = {
    username:
      String(
        user?.username || ""
      ),
    fullName:
      String(
        user?.fullName ||
        "Пользователь"
      ),
    isDispatcher:
      Boolean(
        user?.isDispatcher
      ),
    isDeveloper:
      Boolean(
        user?.isDeveloper
      ),
    canManageRoles:
      Boolean(
        user?.canManageRoles ??
        user?.isDeveloper
      ),
    roleIds:
      Array.isArray(
        user?.roleIds
      )
        ? [...user.roleIds]
        : [],
    roleNames:
      Array.isArray(
        user?.roleNames
      )
        ? [...user.roleNames]
        : [],
    roles:
      Array.isArray(
        user?.roles
      )
        ? user.roles.map((role) => ({
            ...role,
            color: normalizeRoleColor(role?.color)
          }))
        : [],
    primaryRoleColor:
      normalizeRoleColor(
        user?.primaryRoleColor ||
        user?.roles?.find?.((role) => role?.id === "developer")?.color ||
        user?.roles?.find?.((role) => role?.id === "dispatcher")?.color ||
        user?.roles?.find?.((role) => role?.id !== "user")?.color ||
        user?.roles?.[0]?.color
      ),
    panelIds:
      Array.isArray(
        user?.panelIds
      )
        ? [...user.panelIds]
        : (
            user?.isDeveloper
              ? [
                  "monitoring",
                  "executive-monitoring",
                  "system-control"
                ]
              : user?.isDispatcher
                ? [
                    "monitoring",
                    "dispatcher"
                  ]
                : [
                    "monitoring"
                  ]
          ),
    dispatcherDivisionId:
      String(
        user?.dispatcherDivisionId || ""
      ),
    dispatcherDivisionName:
      String(
        user?.dispatcherDivisionName || ""
      ),
    dispatcherAllDivisions:
      Boolean(
        user?.dispatcherAllDivisions
      )
  };

  userFullName.textContent =
    currentUser.fullName;

  const roleText =
    currentUser.roleNames.length
      ? currentUser.roleNames
          .slice(0, 2)
          .join(" · ")
      : currentUser.isDeveloper
        ? "Разработчик"
        : currentUser.isDispatcher
          ? "Диспетчер"
          : "Пользователь";

  userRoleBadge.textContent =
    roleText;

  userRoleBadge.classList.toggle(
    "is-dispatcher",
    hasPanelAccess(
      "dispatcher"
    ) &&
    !currentUser.isDeveloper
  );

  userRoleBadge.classList.toggle(
    "is-developer",
    currentUser.isDeveloper
  );

  applyCurrentRoleColor(
    currentUser.primaryRoleColor
  );

  dispatcherCardStatus.textContent =
    hasPanelAccess(
      "dispatcher"
    )
      ? (
          currentUser?.dispatcherAllDivisions
            ? "КОНТУР: ВСЕ ПОДРАЗДЕЛЕНИЯ"
            : currentUser?.dispatcherDivisionName
              ? `КОНТУР: ${currentUser.dispatcherDivisionName}`
              : "ДОСТУП РАЗРЕШЁН"
        )
      : "ДОСТУП ПО РОЛИ";

  executiveCardStatus.textContent =
    hasPanelAccess(
      "executive-monitoring"
    )
      ? (
          currentUser?.dispatcherAllDivisions
            ? "КОНТУР: ВСЕ ПОДРАЗДЕЛЕНИЯ"
            : currentUser?.dispatcherDivisionName
              ? `ФОКУС: ${currentUser.dispatcherDivisionName}`
              : "СВОДНЫЙ ДОСТУП"
        )
      : "ДОСТУП ПО РОЛИ";

  openAdminButton.hidden =
    !hasPanelAccess(
      "system-control"
    );

  const visibleModules =
    3 +
    (
      hasPanelAccess(
        "system-control"
      )
        ? 1
        : 0
    );

  moduleCount.textContent =
    `${visibleModules} ${
      visibleModules === 1
        ? "модуль"
        : visibleModules < 5
          ? "модуля"
          : "модулей"
    }`;
}

function showLoginScreen() {
  stopAutoRefresh();
  stopHeartbeat();
  stopAdminRefresh();
  stopDispatcherRefresh();
  stopExecutiveRefresh();

  currentUser = null;
  currentView = "home";

  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  authScreen.classList.remove("is-leaving");

  homeView.classList.add("is-active");
  monitoringView.classList.remove("is-active");
  dispatcherView.classList.remove("is-active");
  executiveView.classList.remove("is-active");
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

  dispatcherView.classList.toggle(
    "is-active",
    view === "dispatcher"
  );

  executiveView.classList.toggle(
    "is-active",
    view === "executive"
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

  if (view !== "dispatcher") {
    stopDispatcherRefresh();
  }

  if (view !== "executive") {
    stopExecutiveRefresh();
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
    !hasPanelAccess(
      "monitoring"
    )
  ) {
    openModal({
      type: "denied",
      eyebrow: "ДОСТУП ПО РОЛИ",
      title: "Нет доступа",
      message:
        "У вашей текущей роли нет доступа к аварийному мониторингу."
    });

    return;
  }

  if (
    currentSystemState.mode !== "normal" &&
    !hasPanelAccess(
      "system-control"
    )
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

  divisionGrid.innerHTML = `
    <div class="monitoring-loading-card">
      Получение последней сводки СК-11 OMS…
    </div>
  `;

  loadAllDivisions();
  startAutoRefresh();
}

async function loadDispatcherDashboard({
  openView = false,
  quiet = false
} = {}) {
  const sessionToken =
    getAppSessionToken();

  const params =
    new URLSearchParams();

  if (selectedDispatcherGroupId) {
    params.set(
      "group",
      selectedDispatcherGroupId
    );
  }

  if (selectedDispatcherUnitId) {
    params.set(
      "unit",
      selectedDispatcherUnitId
    );
  }

  if (!quiet && dispatcherRefreshButton) {
    dispatcherRefreshButton.disabled = true;
    dispatcherRefreshButton.classList.add(
      "is-loading"
    );
  }

  try {
    const query =
      params.toString()
        ? `?${params.toString()}`
        : "";

    const response = await fetch(
      `${API_DISPATCHER}${query}`,
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
      return false;
    }

    if (response.status === 403) {
      if (currentView === "dispatcher") {
        navigateHome();
      }

      openModal({
        type: "denied",
        title: "Доступ ограничен",
        message:
          payload?.message ||
          "У вашей роли нет доступа к интерфейсу диспетчера"
      });
      return false;
    }

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить интерфейс диспетчера"
      );
    }

    renderDispatcherDashboard(payload);

    if (openView) {
      setView("dispatcher");
      startDispatcherRefresh();
    }

    return true;
  } catch (error) {
    if (!quiet) {
      openModal({
        type: "denied",
        eyebrow: "ОШИБКА ДАННЫХ",
        title: "Не удалось обновить интерфейс",
        message:
          error instanceof Error
            ? error.message
            : "Попробуйте ещё раз."
      });
    }

    return false;
  } finally {
    if (dispatcherRefreshButton) {
      dispatcherRefreshButton.disabled = false;
      dispatcherRefreshButton.classList.remove(
        "is-loading"
      );
    }
  }
}

async function navigateDispatcher() {
  await loadDispatcherDashboard({
    openView: true
  });
}

function startDispatcherRefresh() {
  stopDispatcherRefresh();

  dispatcherRefreshTimer =
    setInterval(
      () => {
        if (
          currentView ===
          "dispatcher"
        ) {
          loadDispatcherDashboard({
            quiet: true
          });
        }
      },
      DISPATCHER_REFRESH_INTERVAL_MS
    );
}

function stopDispatcherRefresh() {
  if (dispatcherRefreshTimer) {
    clearInterval(
      dispatcherRefreshTimer
    );
    dispatcherRefreshTimer = null;
  }
}


function executiveEl(id) {
  return document.getElementById(id);
}

function renderExecutiveRanking(targetId, items, emptyText) {
  const target = executiveEl(targetId);
  if (!target) return;

  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    target.innerHTML = `<div class="executive-empty">${escapeHtml(emptyText || "Нет данных")}</div>`;
    return;
  }

  target.innerHTML = list.map((item, index) => `
    <div class="executive-ranking-row">
      <div class="executive-ranking-main">
        <span class="executive-ranking-index">${index + 1}</span>
        <span class="executive-ranking-name">${escapeHtml(item?.name || "—")}</span>
      </div>
      <strong>${Number(item?.count || 0)}</strong>
    </div>
  `).join("");
}

function setExecutiveRequestCounts(counts) {
  const values = {
    review: Number(counts?.review || 0),
    approved: Number(counts?.approved || 0),
    open: Number(counts?.open || 0),
    closed: Number(counts?.closed || 0),
    acknowledged: Number(counts?.acknowledged || 0),
    ending: Number(counts?.ending || 0),
    total: Number(counts?.total || 0)
  };

  executiveEl("executiveReqReview").textContent = values.review;
  executiveEl("executiveReqApproved").textContent = values.approved;
  executiveEl("executiveReqOpen").textContent = values.open;
  executiveEl("executiveReqClosed").textContent = values.closed;
  executiveEl("executiveReqAcknowledged").textContent = values.acknowledged;
  executiveEl("executiveReqEnding").textContent = values.ending;
  executiveEl("executiveRequestsTotal").textContent = values.total;

  renderDispatcherDonutChart(executiveEl("executiveRequestsChart"), [
    { label: "В рассмотрении", value: values.review, color: "#43c0ff" },
    { label: "Разрешена", value: values.approved, color: "#37f29f" },
    { label: "Открыта", value: values.open, color: "#8f7dff" },
    { label: "Закрыта", value: values.closed, color: "#ff587e" },
    { label: "Принята к сведению", value: values.acknowledged, color: "#ffc85e" },
    { label: "Заканчиваются", value: values.ending, color: "#fb7185" }
  ]);
}

function setExecutiveWorkorderCounts(counts) {
  const values = {
    registered: Number(counts?.registered || 0),
    created: Number(counts?.created || 0),
    admission: Number(counts?.admission || 0),
    preparation: Number(counts?.preparation || 0),
    break: Number(counts?.break || 0),
    total: Number(counts?.total || 0)
  };

  executiveEl("executiveWorkordersRegistered").textContent = values.registered;
  executiveEl("executiveWorkordersCreated").textContent = values.created;
  executiveEl("executiveWorkordersAdmission").textContent = values.admission;
  executiveEl("executiveWorkordersPreparation").textContent = values.preparation;
  executiveEl("executiveWorkordersBreak").textContent = values.break;
  executiveEl("executiveWorkordersTotal").textContent = values.total;

  renderDispatcherDonutChart(executiveEl("executiveWorkordersChart"), [
    { label: "Зарегистрирован", value: values.registered, color: "#2ed7c9" },
    { label: "Создано", value: values.created, color: "#4d95ff" },
    { label: "Допуск", value: values.admission, color: "#7d55ff" },
    { label: "Подготовка р.м.", value: values.preparation, color: "#f3a722" },
    { label: "Перерыв", value: values.break, color: "#ff4d80" }
  ]);
}


function renderExecutiveDelta(targetId, delta, suffix = "к прошлой сводке") {
  const target = executiveEl(targetId);
  if (!target) return;

  target.classList.remove("is-up", "is-down", "is-neutral", "is-unavailable");

  if (!delta?.available) {
    target.textContent = "история формируется";
    target.classList.add("is-unavailable");
    return;
  }

  const value = Number(delta.value || 0);

  if (value > 0) {
    target.textContent = `+${value} ${suffix}`;
    target.classList.add("is-up");
  } else if (value < 0) {
    target.textContent = `${value} ${suffix}`;
    target.classList.add("is-down");
  } else {
    target.textContent = `без изменений`;
    target.classList.add("is-neutral");
  }
}

function renderExecutiveSparkline(targetId, history, metric, fallbackValue = 0) {
  const target = executiveEl(targetId);
  if (!target) return;

  const list = (Array.isArray(history) ? history : [])
    .map((item) => {
      const raw = item?.[metric];
      if (raw === null || raw === undefined || raw === "") return null;
      const value = Number(raw);
      if (!Number.isFinite(value)) return null;
      return {
        label: String(item?.label || ""),
        value
      };
    })
    .filter(Boolean)
    .slice(-16);

  if (!list.length) {
    list.push({ label: "сейчас", value: Number(fallbackValue || 0) });
  }

  const width = 420;
  const height = 150;
  const padX = 14;
  const padTop = 16;
  const padBottom = 30;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padTop - padBottom;
  const values = list.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const rangePadding = Math.max(1, span * 0.18);
  const chartMin = Math.max(0, min - rangePadding);
  const chartMax = max + rangePadding;
  const chartSpan = Math.max(1, chartMax - chartMin);

  const points = list.map((item, index) => {
    const x = list.length === 1
      ? width / 2
      : padX + (index / (list.length - 1)) * usableWidth;
    const y = padTop + usableHeight - ((item.value - chartMin) / chartSpan) * usableHeight;
    return { ...item, x, y };
  });

  const polyline = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area = points.length
    ? `M ${points[0].x.toFixed(2)} ${height - padBottom} L ${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" L ")} L ${points.at(-1).x.toFixed(2)} ${height - padBottom} Z`
    : "";
  const last = points.at(-1);
  const firstLabel = escapeHtml(points[0]?.label || "");
  const lastLabel = escapeHtml(last?.label || "");
  const gradientId = `exec-gradient-${targetId}`;

  target.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity=".34"></stop>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <line x1="${padX}" y1="${height - padBottom}" x2="${width - padX}" y2="${height - padBottom}" class="executive-sparkline-axis"></line>
      <path d="${area}" fill="url(#${gradientId})"></path>
      <polyline points="${polyline}" class="executive-sparkline-line"></polyline>
      ${last ? `<circle cx="${last.x}" cy="${last.y}" r="5" class="executive-sparkline-point"></circle>` : ""}
      <text x="${padX}" y="${height - 8}" class="executive-sparkline-label">${firstLabel}</text>
      <text x="${width - padX}" y="${height - 8}" text-anchor="end" class="executive-sparkline-label">${lastLabel}</text>
    </svg>
  `;
}

function renderExecutiveDivisionTable(rows, selectedGroupId = "") {
  const body = executiveEl("executiveDivisionTableBody");
  if (!body) return;

  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) {
    body.innerHTML = `<tr><td colspan="7" class="executive-table-empty">Нет доступных подразделений</td></tr>`;
    return;
  }

  body.innerHTML = list.map((row) => {
    const tone = String(row?.status?.tone || "muted");
    const selected = String(row?.id || "") === String(selectedGroupId || "");

    return `
      <tr class="${selected ? "is-selected" : ""}">
        <td>
          <button class="executive-division-link" type="button" data-executive-table-group="${escapeHtml(row?.id || "")}">
            <strong>${escapeHtml(row?.name || "—")}</strong>
            <small>${escapeHtml(row?.description || `${Number(row?.units || 0)} РЭС / районов`)}</small>
          </button>
        </td>
        <td><span class="executive-status-chip is-${escapeHtml(tone)}">${escapeHtml(row?.status?.label || "—")}</span></td>
        <td><strong class="executive-table-number is-outage">${Number(row?.outages || 0)}</strong></td>
        <td><strong class="executive-table-number is-appeal">${Number(row?.appeals || 0)}</strong></td>
        <td><strong class="executive-table-number">${Number(row?.requests || 0)}</strong><small class="executive-table-sub">активно: ${Number(row?.openRequests || 0)}</small></td>
        <td><strong class="executive-table-number">${Number(row?.workorders || 0)}</strong><small class="executive-table-sub">перерыв: ${Number(row?.workBreaks || 0)}</small></td>
        <td><strong class="executive-table-number">${Number(row?.units || 0)}</strong></td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-executive-table-group]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedExecutiveGroupId = String(button.dataset.executiveTableGroup || "");
      selectedExecutiveUnitId = "";
      loadExecutiveDashboard();
    });
  });
}

function renderExecutiveDashboard(payload) {
  const groups = [{ id: "", name: "Все подразделения" }, ...(Array.isArray(payload?.availableGroups) ? payload.availableGroups : [])];
  const units = [{ id: "", name: "Все РЭС / районы" }, ...(Array.isArray(payload?.availableUnits) ? payload.availableUnits : [])];

  selectedExecutiveGroupId = String(payload?.filter?.groupId || "");
  selectedExecutiveUnitId = String(payload?.filter?.unitId || "");

  renderDispatcherSelectOptions(executiveEl("executiveGroupSelect"), groups, selectedExecutiveGroupId);
  renderDispatcherSelectOptions(executiveEl("executiveUnitSelect"), units, selectedExecutiveUnitId);

  const scopeTitle = selectedExecutiveUnitId
    ? `${payload?.filter?.groupName || ""} · ${payload?.filter?.unitName || ""}`
    : selectedExecutiveGroupId
      ? (payload?.filter?.groupName || "Подразделение")
      : "Все подразделения";

  executiveEl("executiveScopeTitle").textContent = scopeTitle;
  executiveEl("executiveHeroOutages").textContent = Number(payload?.headline?.outagesTotal || 0);
  executiveEl("executiveHeroAppeals").textContent = Number(payload?.headline?.appealsTotal || 0);
  executiveEl("executiveHeroRequests").textContent = Number(payload?.headline?.requestsTotal || 0);
  executiveEl("executiveHeroWorkorders").textContent = Number(payload?.headline?.workordersTotal || 0);

  renderExecutiveDelta("executiveDeltaOutages", payload?.deltas?.outages);
  renderExecutiveDelta("executiveDeltaAppeals", payload?.deltas?.appeals);
  renderExecutiveDelta("executiveDeltaRequests", payload?.deltas?.requests);
  renderExecutiveDelta("executiveDeltaWorkorders", payload?.deltas?.workorders);

  executiveEl("executiveOutagesScope").textContent = payload?.outages?.scopeLabel || scopeTitle;
  executiveEl("executiveOutagesTotal").textContent = Number(payload?.outages?.total || 0);
  executiveEl("executiveOutagesAppeals").textContent = Number(payload?.outages?.appeals || 0);

  const overviewBits = [
    `${Number(payload?.scope?.groupCount || 0)} подразделений`,
    `${Number(payload?.scope?.visibleUnitCount || 0)} РЭС/районов`
  ];
  executiveEl("executiveOverviewMeta").textContent = overviewBits.join(" · ");

  const outageLeader = payload?.highlights?.outageLeader;
  executiveEl("executiveHighlightOutage").textContent = outageLeader?.name || "—";
  executiveEl("executiveHighlightOutageCount").textContent = `${Number(outageLeader?.count || 0)} отключений`;

  const appealLeader = payload?.highlights?.appealLeader;
  executiveEl("executiveHighlightAppeal").textContent = appealLeader?.name || "—";
  executiveEl("executiveHighlightAppealCount").textContent = `${Number(appealLeader?.count || 0)} обращений`;

  const requestLeader = payload?.highlights?.requestLeader;
  executiveEl("executiveHighlightRequest").textContent = requestLeader?.name || "—";
  executiveEl("executiveHighlightRequestCount").textContent = `${Number(requestLeader?.count || 0)} заявок`;

  const workorderLeader = payload?.highlights?.workorderLeader;
  executiveEl("executiveHighlightWorkorder").textContent = workorderLeader?.name || "—";
  executiveEl("executiveHighlightWorkorderCount").textContent = `${Number(workorderLeader?.count || 0)} НДР`;

  setExecutiveRequestCounts(payload?.requests?.counts || {});
  setExecutiveWorkorderCounts(payload?.workorders?.counts || {});

  executiveEl("executiveOutageMeta").textContent = payload?.outages?.sourceUpdatedAt
    ? `OMS: ${payload.outages.sourceUpdatedAt}`
    : "Данные OMS пока не получены";
  executiveEl("executiveRequestsMeta").textContent = payload?.requests?.sourceUpdatedAt
    ? `СК-11 заявки: ${payload.requests.sourceUpdatedAt}${payload?.requests?.period ? ` · ${payload.requests.period}` : ""}`
    : "Данные заявок пока не получены";
  executiveEl("executiveWorkordersMeta").textContent = payload?.workorders?.sourceUpdatedAt
    ? `СК-11 НДР: ${payload.workorders.sourceUpdatedAt}${payload?.workorders?.period ? ` · ${payload.workorders.period}` : ""}`
    : "Данные НДР пока не получены";

  renderExecutiveRanking("executiveOutageRanking", payload?.outages?.ranked, "Нет данных по отключениям");
  renderExecutiveRanking("executiveAppealRanking", payload?.outages?.rankedAppeals, "Нет обращений по активным отключениям");
  renderExecutiveRanking("executiveRequestRanking", payload?.requests?.ranked, "Нет данных по заявкам");
  renderExecutiveRanking("executiveWorkorderRanking", payload?.workorders?.ranked, "Нет данных по НДР");

  const history = Array.isArray(payload?.history) ? payload.history : [];
  const latestHistory = history.at(-1) || {};

  executiveEl("executiveTrendOutagesCurrent").textContent = Number(latestHistory?.outages ?? payload?.headline?.outagesTotal ?? 0);
  executiveEl("executiveTrendAppealsCurrent").textContent = Number(latestHistory?.appeals ?? payload?.headline?.appealsTotal ?? 0);
  executiveEl("executiveTrendRequestsCurrent").textContent = Number(latestHistory?.requests ?? payload?.headline?.requestsTotal ?? 0);
  executiveEl("executiveTrendWorkordersCurrent").textContent = Number(latestHistory?.workorders ?? payload?.headline?.workordersTotal ?? 0);

  renderExecutiveDelta("executiveTrendOutagesDelta", payload?.deltas?.outages, "");
  renderExecutiveDelta("executiveTrendAppealsDelta", payload?.deltas?.appeals, "");
  renderExecutiveDelta("executiveTrendRequestsDelta", payload?.deltas?.requests, "");
  renderExecutiveDelta("executiveTrendWorkordersDelta", payload?.deltas?.workorders, "");

  renderExecutiveSparkline("executiveTrendOutagesChart", history, "outages", payload?.headline?.outagesTotal);
  renderExecutiveSparkline("executiveTrendAppealsChart", history, "appeals", payload?.headline?.appealsTotal);
  renderExecutiveSparkline("executiveTrendRequestsChart", history, "requests", payload?.headline?.requestsTotal);
  renderExecutiveSparkline("executiveTrendWorkordersChart", history, "workorders", payload?.headline?.workordersTotal);

  executiveEl("executiveHistoryHint").textContent = history.length >= 2
    ? `${history.length} последних сводок · дельта к предыдущему обновлению`
    : "История появится после следующей новой сводки";

  renderExecutiveDivisionTable(payload?.divisionTable, selectedExecutiveGroupId);

  const updatedParts = [];
  if (payload?.outages?.sourceUpdatedAt) updatedParts.push(`OMS: ${payload.outages.sourceUpdatedAt}`);
  if (payload?.requests?.sourceUpdatedAt) updatedParts.push(`Заявки: ${payload.requests.sourceUpdatedAt}`);
  if (payload?.workorders?.sourceUpdatedAt) updatedParts.push(`НДР: ${payload.workorders.sourceUpdatedAt}`);
  executiveEl("executiveUpdatedAt").textContent = updatedParts.length ? updatedParts.join(" · ") : `Проверено ${formatDateTime(payload?.updatedAt || new Date().toISOString())}`;
}

async function loadExecutiveDashboard(options = {}) {
  const { openView = false, quiet = false } = options;

  if (!hasPanelAccess("executive-monitoring")) {
    if (!quiet) {
      openModal({
        type: "denied",
        eyebrow: "ДОСТУП ПО РОЛИ",
        title: "Нет доступа",
        message: "У вашей текущей роли нет доступа к панели «Диспетчерский мониторинг»."
      });
    }
    return false;
  }

  try {
    const params = new URLSearchParams();
    if (selectedExecutiveGroupId) params.set("group", selectedExecutiveGroupId);
    if (selectedExecutiveUnitId) params.set("unit", selectedExecutiveUnitId);
    const query = params.toString() ? `?${params.toString()}` : "";

    const response = await fetch(`${API_EXECUTIVE_MONITORING}${query}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: getSessionHeaders()
    });

    if (response.status === 401) {
      setAppSessionToken("");
      showLoginScreen();
      return false;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `Сервер вернул ошибку ${response.status}`);
    }

    if (openView) {
      setView("executive");
      startExecutiveRefresh();
    }

    renderExecutiveDashboard(payload);
    return true;
  } catch (error) {
    if (!quiet) {
      openModal({
        type: "denied",
        eyebrow: "ОШИБКА ДАННЫХ",
        title: "Не удалось обновить панель",
        message: error instanceof Error ? error.message : "Попробуйте ещё раз."
      });
    }
    return false;
  }
}

async function navigateExecutive() {
  await loadExecutiveDashboard({ openView: true });
}

function startExecutiveRefresh() {
  stopExecutiveRefresh();
  executiveRefreshTimer = setInterval(() => {
    if (currentView === "executive") {
      loadExecutiveDashboard({ quiet: true });
    }
  }, EXECUTIVE_REFRESH_INTERVAL_MS);
}

function stopExecutiveRefresh() {
  if (executiveRefreshTimer) {
    clearInterval(executiveRefreshTimer);
    executiveRefreshTimer = null;
  }
}

function navigateAdmin() {

  if (
    !hasPanelAccess(
      "system-control"
    )
  ) {
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

    const response =
      await fetchWithTimeout(
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
        },
        STARTUP_REQUEST_TIMEOUT_MS
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

function renderDispatcherSelectOptions(
  select,
  items,
  selectedId
) {
  const list =
    Array.isArray(items)
      ? items
      : [];

  select.innerHTML =
    list.map(
      (item) => `
        <option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>
          ${escapeHtml(item.name)}${item.description ? ` — ${escapeHtml(item.description)}` : ""}
        </option>
      `
    ).join("");
}

function renderDispatcherDonutChart(
  chartElement,
  segments
) {
  if (!chartElement) {
    return;
  }

  chartElement
    .querySelectorAll(
      ".dispatcher-donut-marker"
    )
    .forEach((item) => item.remove());

  const normalized = Array.isArray(segments)
    ? segments.map((segment) => ({
        ...segment,
        value: Number(segment?.value || 0)
      }))
    : [];

  const statusTotal = normalized.reduce(
    (sum, item) =>
      sum + Math.max(0, item.value),
    0
  );

  if (!statusTotal) {
    chartElement.style.background =
      "conic-gradient(rgba(129, 156, 178, .18) 0 100%)";
    return;
  }

  let cursor = 0;
  const gradientParts = [];

  normalized.forEach((segment) => {
    const safeValue = Math.max(0, segment.value);
    const size =
      (safeValue / statusTotal) * 100;
    const start = cursor;
    const end = cursor + size;

    gradientParts.push(
      `${segment.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`
    );

    if (safeValue > 0) {
      const angle =
        ((start + end) / 2 / 100) *
          Math.PI *
          2 -
        Math.PI / 2;
      const marker =
        document.createElement("div");

      marker.className =
        "dispatcher-donut-marker";
      marker.textContent = String(safeValue);
      marker.title = segment.label
        ? `${segment.label}: ${safeValue}`
        : String(safeValue);
      marker.style.left = `${50 + Math.cos(angle) * 41}%`;
      marker.style.top = `${50 + Math.sin(angle) * 41}%`;
      marker.style.background = segment.color;
      chartElement.appendChild(marker);
    }

    cursor = end;
  });

  chartElement.style.background =
    `conic-gradient(${gradientParts.join(", ")})`;
}

function setDispatcherRequestCounts(
  counts
) {
  const values = {
    review: Number(counts?.review || 0),
    approved: Number(counts?.approved || 0),
    open: Number(counts?.open || 0),
    closed: Number(counts?.closed || 0),
    acknowledged: Number(
      counts?.acknowledged || 0
    ),
    ending: Number(counts?.ending || 0),
    total: Number(counts?.total || 0)
  };

  dispatcherReqReview.textContent =
    values.review;
  dispatcherReqApproved.textContent =
    values.approved;
  dispatcherReqOpen.textContent =
    values.open;
  dispatcherReqClosed.textContent =
    values.closed;
  dispatcherReqAcknowledged.textContent =
    values.acknowledged;
  dispatcherReqEnding.textContent =
    values.ending;
  dispatcherReqTotal.textContent =
    values.total;

  renderDispatcherDonutChart(
    dispatcherRequestsChart,
    [
      {
        label: "В рассмотрении",
        value: values.review,
        color: "#38bdf8"
      },
      {
        label: "Разрешена",
        value: values.approved,
        color: "#22c55e"
      },
      {
        label: "Открыта",
        value: values.open,
        color: "#8b5cf6"
      },
      {
        label: "Закрыта",
        value: values.closed,
        color: "#f59e0b"
      },
      {
        label: "Принята к сведению",
        value: values.acknowledged,
        color: "#f43f5e"
      },
      {
        label: "Заканчиваются",
        value: values.ending,
        color: "#fb7185"
      }
    ]
  );
}

function renderDispatcherSourceBreakdown(
  payload
) {
  const breakdown =
    Array.isArray(
      payload?.sources?.breakdown
    )
      ? payload.sources.breakdown
      : [];

  const unitId =
    String(
      payload?.unit?.id || ""
    );

  if (
    dispatcherBreakdownUnitId !==
    unitId
  ) {
    dispatcherBreakdownUnitId =
      unitId;
    dispatcherBreakdownSelection =
      "__all__";
    dispatcherBreakdownExpanded =
      false;
  }

  if (breakdown.length <= 1) {
    dispatcherSourceBreakdown.hidden =
      true;
    dispatcherSourceBreakdown.innerHTML =
      "";
    dispatcherBreakdownSelection =
      "__all__";
    setDispatcherRequestCounts(
      payload?.requests
    );
    dispatcherReqTotalCaption.textContent =
      "Сумма по подключённым строкам СК-11";
    return;
  }

  const selectedRow =
    dispatcherBreakdownSelection ===
      "__all__"
      ? null
      : breakdown.find(
          (item, index) =>
            String(index) ===
            dispatcherBreakdownSelection
        ) || null;

  if (
    dispatcherBreakdownSelection !==
      "__all__" &&
    !selectedRow
  ) {
    dispatcherBreakdownSelection =
      "__all__";
  }

  setDispatcherRequestCounts(
    selectedRow ||
    payload?.requests
  );

  const selectedTitle =
    selectedRow
      ? selectedRow.label ||
        selectedRow.source
      : "Общая сумма";

  dispatcherReqTotalCaption.textContent =
    selectedRow
      ? "Всего по выбранной строке СК-11"
      : "Сумма по подключённым строкам СК-11";

  dispatcherSourceBreakdown.hidden =
    false;

  dispatcherSourceBreakdown.innerHTML = `
    <button
      class="dispatcher-breakdown-toggle"
      type="button"
      data-breakdown-toggle
    >
      <span>
        Детализация по источникам
        <small>Сейчас: ${escapeHtml(selectedTitle)}</small>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="${dispatcherBreakdownExpanded ? "is-open" : ""}">
        <path d="m7 10 5 5 5-5"></path>
      </svg>
    </button>

    <div
      class="dispatcher-breakdown-options"
      ${dispatcherBreakdownExpanded ? "" : "hidden"}
    >
      <button
        class="dispatcher-breakdown-chip ${dispatcherBreakdownSelection === "__all__" ? "is-active" : ""}"
        type="button"
        data-breakdown-source="__all__"
      >
        <strong>Общая сумма</strong>
        <span>${payload?.requests?.total ?? 0} всего · ${payload?.requests?.ending ?? 0} заканч.</span>
      </button>

      ${breakdown.map(
        (item, index) => `
          <button
            class="dispatcher-breakdown-chip ${dispatcherBreakdownSelection === String(index) ? "is-active" : ""} ${item.matched ? "" : "is-missing"}"
            type="button"
            data-breakdown-source="${index}"
          >
            <strong>${escapeHtml(item.label || item.source)}</strong>
            <span>
              ${item.matched ? `${item.total ?? 0} всего` : "Строка не найдена · 0"}
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;

  dispatcherSourceBreakdown
    .querySelector(
      "[data-breakdown-toggle]"
    )
    ?.addEventListener(
      "click",
      () => {
        dispatcherBreakdownExpanded =
          !dispatcherBreakdownExpanded;
        renderDispatcherSourceBreakdown(
          payload
        );
      }
    );

  dispatcherSourceBreakdown
    .querySelectorAll(
      "[data-breakdown-source]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            dispatcherBreakdownSelection =
              button.dataset
                .breakdownSource ||
              "__all__";

            renderDispatcherSourceBreakdown(
              payload
            );
          }
        );
      }
    );
}


function setDispatcherWorkordersCounts(
  counts
) {
  const values = {
    registered:
      Number(counts?.registered || 0),
    created:
      Number(counts?.created || 0),
    admission:
      Number(counts?.admission || 0),
    preparation:
      Number(counts?.preparation || 0),
    break:
      Number(counts?.break || 0),
    total:
      Number(counts?.total || 0)
  };

  dispatcherWorkordersRegistered.textContent =
    values.registered;
  dispatcherWorkordersCreated.textContent =
    values.created;
  dispatcherWorkordersAdmission.textContent =
    values.admission;
  dispatcherWorkordersPreparation.textContent =
    values.preparation;
  dispatcherWorkordersBreak.textContent =
    values.break;
  dispatcherWorkordersTotal.textContent =
    values.total;

  renderDispatcherDonutChart(
    dispatcherWorkordersChart,
    [
      {
        label: "Зарегистрирован",
        value: values.registered,
        color: "#2dd4bf"
      },
      {
        label: "Создано",
        value: values.created,
        color: "#3b82f6"
      },
      {
        label: "Допуск",
        value: values.admission,
        color: "#8b5cf6"
      },
      {
        label: "Подготовка р.м.",
        value: values.preparation,
        color: "#f59e0b"
      },
      {
        label: "Перерыв",
        value: values.break,
        color: "#f43f5e"
      }
    ]
  );
}

function renderDispatcherWorkordersBreakdown(
  payload
) {
  const workorders =
    payload?.workorders || {};

  const breakdown =
    Array.isArray(
      workorders?.sources?.breakdown
    )
      ? workorders.sources.breakdown
      : [];

  const unitId =
    String(
      payload?.unit?.id || ""
    );

  if (
    dispatcherWorkordersBreakdownUnitId !==
    unitId
  ) {
    dispatcherWorkordersBreakdownUnitId =
      unitId;
    dispatcherWorkordersBreakdownSelection =
      "__all__";
    dispatcherWorkordersBreakdownExpanded =
      true;
  }

  if (breakdown.length <= 1) {
    dispatcherWorkordersBreakdown.hidden =
      true;
    dispatcherWorkordersBreakdown.innerHTML =
      "";
    dispatcherWorkordersBreakdownSelection =
      "__all__";
    setDispatcherWorkordersCounts(
      workorders?.counts
    );
    return;
  }

  let selectedRow =
    dispatcherWorkordersBreakdownSelection ===
      "__all__"
      ? null
      : breakdown.find(
          (item, index) =>
            String(index) ===
            dispatcherWorkordersBreakdownSelection
        ) || null;

  if (
    dispatcherWorkordersBreakdownSelection !==
      "__all__" &&
    !selectedRow
  ) {
    dispatcherWorkordersBreakdownSelection =
      "__all__";
    selectedRow = null;
  }

  setDispatcherWorkordersCounts(
    selectedRow ||
    workorders?.counts
  );

  const selectedTitle =
    selectedRow
      ? selectedRow.label ||
        selectedRow.source
      : "Общая сумма";

  dispatcherWorkordersBreakdown.hidden =
    false;

  dispatcherWorkordersBreakdown.innerHTML = `
    <button
      class="dispatcher-breakdown-toggle"
      type="button"
      data-workorders-breakdown-toggle
      aria-expanded="${dispatcherWorkordersBreakdownExpanded ? "true" : "false"}"
    >
      <span>
        Детализация по источникам НДР
        <small>Сейчас: ${escapeHtml(selectedTitle)}</small>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="${dispatcherWorkordersBreakdownExpanded ? "is-open" : ""}">
        <path d="m7 10 5 5 5-5"></path>
      </svg>
    </button>

    <div
      class="dispatcher-breakdown-options"
      ${dispatcherWorkordersBreakdownExpanded ? "" : "hidden"}
    >
      <button
        class="dispatcher-breakdown-chip ${dispatcherWorkordersBreakdownSelection === "__all__" ? "is-active" : ""}"
        type="button"
        data-workorders-breakdown-source="__all__"
      >
        <strong>Общая сумма</strong>
        <span>${workorders?.counts?.total ?? 0} всего</span>
      </button>

      ${breakdown.map(
        (item, index) => `
          <button
            class="dispatcher-breakdown-chip ${dispatcherWorkordersBreakdownSelection === String(index) ? "is-active" : ""} ${item.matched ? "" : "is-missing"}"
            type="button"
            data-workorders-breakdown-source="${index}"
          >
            <strong>${escapeHtml(item.label || item.source)}</strong>
            <span>
              ${item.matched ? `${item.total ?? 0} всего` : "Строка не найдена · 0"}
            </span>
          </button>
        `
      ).join("")}
    </div>
  `;

  dispatcherWorkordersBreakdown
    .querySelector(
      "[data-workorders-breakdown-toggle]"
    )
    ?.addEventListener(
      "click",
      () => {
        dispatcherWorkordersBreakdownExpanded =
          !dispatcherWorkordersBreakdownExpanded;
        renderDispatcherWorkordersBreakdown(
          payload
        );
      }
    );

  dispatcherWorkordersBreakdown
    .querySelectorAll(
      "[data-workorders-breakdown-source]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            dispatcherWorkordersBreakdownSelection =
              button.dataset
                .workordersBreakdownSource ||
              "__all__";

            renderDispatcherWorkordersBreakdown(
              payload
            );
          }
        );
      }
    );
}

function renderDispatcherWorkorders(
  payload
) {
  const workorders =
    payload?.workorders || {};

  const configuredSources =
    Array.isArray(
      workorders?.sources?.configured
    )
      ? workorders.sources.configured
      : [];

  const missingSources =
    Array.isArray(
      workorders?.sources?.missing
    )
      ? workorders.sources.missing
      : [];

  dispatcherWorkordersSourcesText.textContent =
    configuredSources.length
      ? `Источники: ${configuredSources.join(" + ")}`
      : "Источники НДР не настроены · все значения = 0";

  renderDispatcherWorkordersBreakdown(
    payload
  );

  const sourceData =
    workorders?.sourceData || {};

  const metaParts = [];

  if (sourceData.sourceUpdatedAt) {
    metaParts.push(
      `СК-11: ${sourceData.sourceUpdatedAt}`
    );
  }

  if (sourceData.period) {
    metaParts.push(
      `Период: ${sourceData.period}`
    );
  }

  if (sourceData.rowCount) {
    metaParts.push(
      `журналов: ${sourceData.rowCount}`
    );
  }

  if (sourceData.parts > 1) {
    metaParts.push(
      `частей: ${sourceData.parts}`
    );
  }

  dispatcherWorkordersMeta.textContent =
    metaParts.length
      ? metaParts.join(" · ")
      : "Данные НДР пока не получены";

  dispatcherWorkordersNotice.hidden = true;
  dispatcherWorkordersNotice.classList.remove(
    "is-warning",
    "is-error",
    "is-stale"
  );

  if (
    sourceData.status &&
    sourceData.status !== "ok"
  ) {
    dispatcherWorkordersNotice.hidden = false;
    dispatcherWorkordersNotice.textContent =
      sourceData.message ||
      "Источник данных НДР временно недоступен";

    dispatcherWorkordersNotice.classList.add(
      sourceData.status === "error"
        ? "is-error"
        : sourceData.stale
          ? "is-stale"
          : "is-warning"
    );
  } else if (missingSources.length) {
    dispatcherWorkordersNotice.hidden = false;
    dispatcherWorkordersNotice.classList.add(
      "is-warning"
    );
    dispatcherWorkordersNotice.textContent =
      `В последнем сообщении НДР не найдены строки: ${missingSources.join(", ")}`;
  }

  dispatcherWorkordersLiveBadge.classList.toggle(
    "is-stale",
    Boolean(sourceData.stale)
  );
}

function renderDispatcherDashboard(payload) {
  const groups =
    Array.isArray(
      payload?.availableGroups
    )
      ? payload.availableGroups
      : [];

  const units =
    Array.isArray(
      payload?.availableUnits
    )
      ? payload.availableUnits
      : [];

  const selectedGroupId =
    String(
      payload?.group?.id ||
      groups[0]?.id ||
      ""
    );

  const selectedUnitId =
    String(
      payload?.unit?.id ||
      units[0]?.id ||
      ""
    );

  selectedDispatcherGroupId =
    selectedGroupId;

  selectedDispatcherUnitId =
    selectedUnitId;

  renderDispatcherSelectOptions(
    dispatcherGroupSelect,
    groups,
    selectedGroupId
  );

  renderDispatcherSelectOptions(
    dispatcherUnitSelect,
    units,
    selectedUnitId
  );

  dispatcherGroupSelectWrap.hidden =
    groups.length <= 1;

  const fullDispatcherScope =
    Boolean(
      payload?.hasAllDispatcherGroups
    );

  dispatcherAssignedDivision.textContent =
    fullDispatcherScope
      ? "Все подразделения"
      : (
          payload?.assignedGroupName ||
          payload?.group?.name ||
          "Не задан"
        );

  dispatcherAssignedHint.textContent =
    payload?.isDeveloper
      ? "Системная роль Разработчик · полный доступ"
      : fullDispatcherScope
        ? "Роль разрешает переключение между всеми подразделениями"
        : "Доступ ограничен подразделением назначенной роли";

  dispatcherUnitTitle.textContent =
    payload?.unit
      ? `${payload.unit.name} · ${payload?.group?.name || ""}`
      : "Оперативный счётчик";

  setDispatcherRequestCounts(
    payload?.requests
  );

  const configuredSources =
    Array.isArray(
      payload?.sources?.configured
    )
      ? payload.sources.configured
      : [];

  const missingSources =
    Array.isArray(
      payload?.sources?.missing
    )
      ? payload.sources.missing
      : [];

  dispatcherSourcesText.textContent =
    configuredSources.length
      ? `Источники: ${configuredSources.join(" + ")}`
      : "Источники не настроены · все значения = 0";

  renderDispatcherSourceBreakdown(
    payload
  );

  const sourceData =
    payload?.sourceData || {};

  const metaParts = [];

  if (sourceData.sourceUpdatedAt) {
    metaParts.push(
      `СК-11: ${sourceData.sourceUpdatedAt}`
    );
  }

  if (sourceData.period) {
    metaParts.push(
      `Период: ${sourceData.period}`
    );
  }

  if (sourceData.rowCount) {
    metaParts.push(
      `строк: ${sourceData.rowCount}`
    );
  }

  dispatcherSourceMeta.textContent =
    metaParts.length
      ? metaParts.join(" · ")
      : "Данные СК-11 пока не получены";

  dispatcherDataNotice.hidden = true;
  dispatcherDataNotice.classList.remove(
    "is-warning",
    "is-error",
    "is-stale"
  );

  if (
    sourceData.status &&
    sourceData.status !== "ok"
  ) {
    dispatcherDataNotice.hidden = false;
    dispatcherDataNotice.textContent =
      sourceData.message ||
      "Источник данных временно недоступен";

    dispatcherDataNotice.classList.add(
      sourceData.status === "error"
        ? "is-error"
        : sourceData.status === "stale"
          ? "is-stale"
          : "is-warning"
    );
  } else if (missingSources.length) {
    dispatcherDataNotice.hidden = false;
    dispatcherDataNotice.classList.add(
      "is-warning"
    );
    dispatcherDataNotice.textContent =
      `В последнем СК-11 не найдены строки: ${missingSources.join(", ")}`;
  }

  dispatcherLiveBadge.classList.toggle(
    "is-stale",
    Boolean(sourceData.stale)
  );

  renderDispatcherWorkorders(
    payload
  );

  const workordersUpdatedAt =
    payload?.workorders?.sourceData?.sourceUpdatedAt ||
    "";

  if (
    sourceData.sourceUpdatedAt ||
    workordersUpdatedAt
  ) {
    const updateParts = [];

    if (sourceData.sourceUpdatedAt) {
      updateParts.push(
        `Заявки: ${sourceData.sourceUpdatedAt}`
      );
    }

    if (workordersUpdatedAt) {
      updateParts.push(
        `НДР: ${workordersUpdatedAt}`
      );
    }

    dispatcherUpdatedAt.textContent =
      updateParts.join(" · ");
  } else {
    dispatcherUpdatedAt.textContent =
      payload?.updatedAt
        ? `Проверено ${formatDateTime(payload.updatedAt)}`
        : "Интерфейс готов";
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

    loginButton.disabled = true;
    loginButton.querySelector("span").textContent =
      "Подготовка MAX…";

    const initData =
      await waitForMaxInitData();

    if (!initData) {
      loginButton.disabled = false;
      loginButton.querySelector("span").textContent =
        "Войти в систему";

      showLoginError(
        "MAX Bridge не успел загрузиться. Проверьте интернет и нажмите «Войти» ещё раз."
      );
      return;
    }

    loginButton.querySelector("span").textContent =
      "Проверка доступа…";

    try {
      const response = await fetchWithTimeout(
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
        },
        LOGIN_REQUEST_TIMEOUT_MS
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
      const isTimeout =
        error?.name ===
        "AbortError";

      showLoginError(
        isTimeout
          ? "Соединение слишком медленное. Приложение уже загружено — проверьте сеть и повторите вход."
          : error instanceof Error
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

backFromDispatcherButton.addEventListener(
  "click",
  navigateHome
);

backFromExecutiveButton.addEventListener(
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

openExecutiveButton.addEventListener(
  "click",
  navigateExecutive
);

openAdminButton.addEventListener(
  "click",
  navigateAdmin
);

openDispatcherButton.addEventListener(
  "click",
  navigateDispatcher
);

executiveEl("executiveGroupSelect").addEventListener(
  "change",
  () => {
    selectedExecutiveGroupId = executiveEl("executiveGroupSelect").value;
    selectedExecutiveUnitId = "";

    if (currentView === "executive") {
      loadExecutiveDashboard();
    }
  }
);

executiveEl("executiveUnitSelect").addEventListener(
  "change",
  () => {
    selectedExecutiveUnitId = executiveEl("executiveUnitSelect").value;

    if (currentView === "executive") {
      loadExecutiveDashboard();
    }
  }
);

dispatcherGroupSelect.addEventListener(
  "change",
  () => {
    selectedDispatcherGroupId =
      dispatcherGroupSelect.value;
    selectedDispatcherUnitId = "";

    if (currentView === "dispatcher") {
      loadDispatcherDashboard();
    }
  }
);

dispatcherUnitSelect.addEventListener(
  "change",
  () => {
    selectedDispatcherUnitId =
      dispatcherUnitSelect.value;

    if (currentView === "dispatcher") {
      loadDispatcherDashboard();
    }
  }
);

dispatcherRefreshButton.addEventListener(
  "click",
  () =>
    loadDispatcherDashboard()
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
      return;
    }

    if (response.ok) {
      const payload =
        await response
          .json()
          .catch(() => null);

      if (payload?.user) {
        setUserUi(
          payload.user
        );

        /*
          Если во время открытой сессии у пользователя
          забрали доступ к текущей панели, возвращаем его
          в главное меню. Backend и так уже блокирует запросы,
          это только синхронизация интерфейса.
        */
        if (
          currentView === "admin" &&
          !hasPanelAccess(
            "system-control"
          )
        ) {
          navigateHome();
        }

        if (
          currentView === "monitoring" &&
          !hasPanelAccess(
            "monitoring"
          )
        ) {
          navigateHome();
        }

        if (
          currentView === "dispatcher" &&
          !hasPanelAccess(
            "dispatcher"
          )
        ) {
          navigateHome();
        }

        if (
          currentView === "executive" &&
          !hasPanelAccess(
            "executive-monitoring"
          )
        ) {
          navigateHome();
        }
      }
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
    Array.isArray(
      user?.roleNames
    ) &&
    user.roleNames.length
  ) {
    return user.roleNames.join(
      " · "
    );
  }

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

  const manageable =
    Boolean(
      currentUser?.isDeveloper
    );

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

        const roleBadges =
          Array.isArray(user.roles) && user.roles.length
            ? user.roles.map((role) => ({
                name: role.name || role.id,
                color: normalizeRoleColor(role.color)
              }))
            : (
                Array.isArray(user.roleNames) && user.roleNames.length
                  ? user.roleNames.map((name) => ({
                      name,
                      color: "#39c6e6"
                    }))
                  : [{
                      name: userRoleText(user),
                      color: "#39c6e6"
                    }]
              );

        return `
          <div
            class="session-row ${
              manageable
                ? "is-manageable"
                : ""
            }"
            data-username="${escapeHtml(
              user.username
            )}"
            role="${
              manageable
                ? "button"
                : "group"
            }"
            tabindex="${
              manageable
                ? "0"
                : "-1"
            }"
          >
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

            <div class="session-role-stack">
              ${roleBadges
                .map(
                  (role) => `
                    <span
                      class="session-role"
                      style="color:${normalizeRoleColor(role.color)};border-color:${roleColorRgba(role.color,.28)};background:${roleColorRgba(role.color,.08)}"
                    >
                      ${escapeHtml(
                        role.name
                      )}
                    </span>
                  `
                )
                .join("")}
            </div>

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

  if (manageable) {
    sessionList
      .querySelectorAll(
        ".session-row"
      )
      .forEach(
        (row) => {
          const open =
            () =>
              openUserRoleEditor(
                row.dataset.username
              );

          row.addEventListener(
            "click",
            open
          );

          row.addEventListener(
            "keydown",
            (event) => {
              if (
                event.key ===
                  "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                open();
              }
            }
          );
        }
      );
  }
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

  accessManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  createUserButton.hidden =
    !Boolean(
      payload.canManageRoles
    );

  outageManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  dispatcherSourceManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  dispatcherWorkordersManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  if (
    payload.canManageRoles
  ) {
    loadAccessManagement();
    loadOutageConfigManagement();
    loadDispatcherConfigManagement();
  }

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
  if (
    !hasPanelAccess(
      "system-control"
    )
  ) {
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
  if (
    !hasPanelAccess(
      "system-control"
    )
  ) {
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

function panelNameById(
  panelId
) {
  return (
    accessCatalog.panels.find(
      (panel) =>
        panel.id === panelId
    )?.name ||
    panelId
  );
}

function roleById(
  roleId
) {
  return (
    accessCatalog.roles.find(
      (role) =>
        role.id === roleId
    ) || null
  );
}

function renderRoleList() {
  if (
    !Array.isArray(
      accessCatalog.roles
    ) ||
    !accessCatalog.roles.length
  ) {
    roleList.innerHTML = `
      <div class="access-empty">
        Роли не найдены.
      </div>
    `;

    return;
  }

  roleList.innerHTML =
    accessCatalog.roles.map(
      (role) => `
        <article
          class="role-card ${
            role.builtin
              ? "is-builtin"
              : ""
          }"
          style="--role-accent: ${normalizeRoleColor(role.color)}; --role-accent-soft: ${roleColorRgba(role.color, 0.12)}; --role-accent-line: ${roleColorRgba(role.color, 0.32)}"
        >
          <div class="role-card-top">
            <div class="role-card-name">
              <strong>
                ${escapeHtml(
                  role.name
                )}
              </strong>
              <span>
                ${escapeHtml(
                  role.description ||
                  "Без описания"
                )}
              </span>
            </div>

            <div class="role-card-kind-wrap">
              <span class="role-color-swatch" title="Цвет роли" style="background: ${normalizeRoleColor(role.color)}"></span>
              <span
                class="role-kind ${
                  role.builtin
                    ? ""
                    : "is-custom"
                }"
              >
                ${
                  role.builtin
                    ? "СИСТЕМНАЯ"
                    : "ПОЛЬЗОВАТЕЛЬСКАЯ"
                }
              </span>
            </div>
          </div>

          <div class="role-panels">
            ${
              role.panelIds?.length
                ? role.panelIds
                    .map(
                      (panelId) => `
                        <span class="role-panel-chip">
                          ${escapeHtml(
                            panelNameById(
                              panelId
                            )
                          )}
                        </span>
                      `
                    )
                    .join("")
                : `
                  <span class="role-panel-chip">
                    Нет доступа к панелям
                  </span>
                `
            }
            ${
              role.dispatcherAllDivisions
                ? `
                  <span class="role-panel-chip role-panel-chip-dispatcher">
                    Контур: Все подразделения
                  </span>
                `
                : role.dispatcherDivisionName
                  ? `
                    <span class="role-panel-chip role-panel-chip-dispatcher">
                      Контур: ${escapeHtml(
                        role.dispatcherDivisionName
                      )}
                    </span>
                  `
                  : ""
            }
          </div>

          <div class="role-card-actions">
            ${
              role.builtin
                ? `
                  <button
                    class="role-action role-color-action"
                    type="button"
                    data-color-role="${role.id}"
                  >
                    Цвет роли
                  </button>
                `
                : `
                  <button
                    class="role-action"
                    type="button"
                    data-edit-role="${role.id}"
                  >
                    Изменить
                  </button>

                  <button
                    class="role-action role-color-action"
                    type="button"
                    data-color-role="${role.id}"
                  >
                    Цвет
                  </button>

                  <button
                    class="role-action is-danger"
                    type="button"
                    data-delete-role="${role.id}"
                  >
                    Удалить
                  </button>
                `
            }
          </div>
        </article>
      `
    ).join("");

  roleList
    .querySelectorAll(
      "[data-edit-role]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openRoleEditor(
              button.dataset
                .editRole
            )
        );
      }
    );

  roleList
    .querySelectorAll(
      "[data-color-role]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openRoleColorEditor(
              button.dataset.colorRole
            )
        );
      }
    );

  roleList
    .querySelectorAll(
      "[data-delete-role]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            deleteCustomRole(
              button.dataset
                .deleteRole
            )
        );
      }
    );
}

async function loadAccessManagement() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_ACCESS,
        {
          method: "GET",
          cache: "no-store",
          credentials:
            "include",
          headers:
            getSessionHeaders()
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить роли"
      );
    }

    accessCatalog = {
      panels:
        Array.isArray(
          payload.panels
        )
          ? payload.panels
          : [],
      roles:
        Array.isArray(
          payload.roles
        )
          ? payload.roles
          : [],
      users:
        Array.isArray(
          payload.users
        )
          ? payload.users
          : [],
      dispatcherDivisions:
        Array.isArray(
          payload.dispatcherDivisions
        )
          ? payload.dispatcherDivisions
          : []
    };

    renderRoleList();
  } catch (error) {
    roleList.innerHTML = `
      <div class="access-empty">
        ${escapeHtml(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки ролей"
        )}
      </div>
    `;
  }
}



function renderOutageConfigList() {
  const divisions =
    Array.isArray(outageConfigCatalog.divisions)
      ? outageConfigCatalog.divisions
      : [];

  outageCreateDivisionButton.disabled =
    !outageConfigCatalog.storageConfigured;

  if (!divisions.length) {
    outageConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>Подразделений пока нет</strong>
        <span>
          Нажмите «+ Подразделение», чтобы создать первый счётчик
          аварийного мониторинга.
        </span>
      </div>
    `;
    return;
  }

  outageConfigList.innerHTML =
    divisions.map(
      (division) => {
        const sources =
          Array.isArray(division.sources)
            ? division.sources
            : [];

        return `
          <article class="dispatcher-config-card outage-config-card">
            <div class="dispatcher-config-card-head">
              <div>
                <span class="micro-label">АВАРИЙНЫЙ МОНИТОРИНГ</span>
                <h3>${escapeHtml(division.name)}</h3>
              </div>

              <span class="dispatcher-config-state ${sources.length ? "is-custom" : ""}">
                ${sources.length ? `${sources.length} ИСТ.` : "НЕ НАСТРОЕНО"}
              </span>
            </div>

            <div class="dispatcher-config-sources">
              ${
                sources.length
                  ? sources
                      .map(
                        (source) => `
                          <span>${escapeHtml(source)}</span>
                        `
                      )
                      .join("")
                  : `
                    <span class="is-empty">
                      Источники не выбраны · счётчик будет равен нулю
                    </span>
                  `
              }
            </div>

            <div class="dispatcher-config-card-actions">
              <button
                class="role-action dispatcher-config-edit"
                type="button"
                data-outage-division="${escapeHtml(division.id)}"
              >
                Настроить
              </button>

              <button
                class="role-action is-danger"
                type="button"
                data-delete-outage-division="${escapeHtml(division.id)}"
                data-delete-outage-division-name="${escapeHtml(division.name)}"
              >
                Удалить
              </button>
            </div>
          </article>
        `;
      }
    ).join("");

  outageConfigList
    .querySelectorAll("[data-outage-division]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => openOutageDivisionEditor(
          button.dataset.outageDivision
        )
      );
    });

  outageConfigList
    .querySelectorAll("[data-delete-outage-division]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => deleteOutageDivisionFromAdmin(
          button.dataset.deleteOutageDivision,
          button.dataset.deleteOutageDivisionName
        )
      );
    });
}

function outageSourceEditorHtml({
  name = "",
  sources = []
} = {}) {
  const availableSourceLabels =
    Array.isArray(outageConfigCatalog.availableSourceLabels)
      ? outageConfigCatalog.availableSourceLabels
      : [];

  const sourceOptions =
    availableSourceLabels
      .map(
        (label) => `
          <option value="${escapeHtml(label)}">
            ${escapeHtml(label)}
          </option>
        `
      )
      .join("");

  return `
    <label class="management-field">
      <span>Название подразделения</span>
      <input
        id="outageDivisionNameInput"
        maxlength="80"
        value="${escapeHtml(name)}"
        placeholder="Например: ВЭС"
      />
    </label>

    <div class="management-note">
      Каждая выбранная строка соответствует названию подразделения из сообщения
      «СК-11 OMS • Аварийные отключения». Если добавить несколько строк,
      их значения «Активных аварийных» будут суммироваться в один счётчик.
    </div>

    ${
      availableSourceLabels.length
        ? `
          <div class="dispatcher-source-picker">
            <label class="management-field">
              <span>Добавить строку из последнего сообщения</span>
              <select id="outageSourceSuggestion" class="dispatcher-select">
                ${sourceOptions}
              </select>
            </label>
            <button id="outageAddSourceButton" class="role-action" type="button">
              + Добавить
            </button>
          </div>
        `
        : `
          <div class="management-note is-warning">
            Пока строки из сообщения не получены. Проверьте OUTAGES_CHAT_ID
            и наличие свежего сообщения «СК-11 OMS • Аварийные отключения».
          </div>
        `
    }

    <label class="management-field dispatcher-source-editor-field">
      <span>Строки-источники · по одной на строку</span>
      <textarea
        id="outageSourcesTextarea"
        rows="10"
        placeholder="Например:\nВыборгский РЭС\nПриозерский РЭС"
      >${escapeHtml(sources.join("\n"))}</textarea>
    </label>
  `;
}

function bindOutageSourcePicker() {
  document.getElementById(
    "outageAddSourceButton"
  )?.addEventListener(
    "click",
    () => {
      const select =
        document.getElementById(
          "outageSourceSuggestion"
        );
      const textarea =
        document.getElementById(
          "outageSourcesTextarea"
        );

      const value =
        String(select?.value || "").trim();

      if (!value || !textarea) return;

      const current =
        String(textarea.value || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

      if (!current.includes(value)) {
        current.push(value);
      }

      textarea.value = current.join("\n");
      textarea.focus();
    }
  );
}

function openCreateOutageDivisionEditor() {
  if (!currentUser?.isDeveloper) return;

  openManagementModal({
    eyebrow: "АВАРИЙНЫЕ ОТКЛЮЧЕНИЯ",
    title: "Новое подразделение",
    saveLabel: "Создать подразделение",
    context: {
      type: "outage-division-create"
    },
    bodyHtml: outageSourceEditorHtml()
  });

  bindOutageSourcePicker();
  document.getElementById(
    "outageDivisionNameInput"
  )?.focus();
}

function openOutageDivisionEditor(divisionId) {
  const division =
    outageConfigCatalog.divisions.find(
      (item) => item.id === divisionId
    );

  if (!division) return;

  openManagementModal({
    eyebrow: "АВАРИЙНЫЕ ОТКЛЮЧЕНИЯ",
    title: `Настройка · ${division.name}`,
    context: {
      type: "outage-division-edit",
      divisionId: division.id
    },
    bodyHtml: outageSourceEditorHtml({
      name: division.name,
      sources:
        Array.isArray(division.sources)
          ? division.sources
          : []
    })
  });

  bindOutageSourcePicker();
}

async function postOutageConfigAction(payload) {
  const response = await fetch(
    API_ADMIN_OUTAGE_CONFIG,
    {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getSessionHeaders()
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
      "Не удалось изменить настройки аварийных отключений"
    );
  }

  return data;
}

async function deleteOutageDivisionFromAdmin(
  divisionId,
  divisionName
) {
  const confirmed = window.confirm(
    `Удалить подразделение «${divisionName}» из аварийного мониторинга?`
  );

  if (!confirmed) return;

  try {
    await postOutageConfigAction({
      action: "delete",
      divisionId
    });

    await loadOutageConfigManagement();
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "АВАРИЙНЫЕ ОТКЛЮЧЕНИЯ",
      title: "Не удалось удалить подразделение",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

async function loadOutageConfigManagement() {
  if (!currentUser?.isDeveloper) return;

  try {
    const response = await fetch(
      API_ADMIN_OUTAGE_CONFIG,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: getSessionHeaders()
      }
    );

    const payload = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить настройки аварийных отключений"
      );
    }

    outageConfigCatalog = {
      divisions:
        Array.isArray(payload.divisions)
          ? payload.divisions
          : [],
      availableSourceLabels:
        Array.isArray(payload.availableSourceLabels)
          ? payload.availableSourceLabels
          : [],
      sourceData:
        payload.sourceData || {},
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    const sourceInfo = outageConfigCatalog.sourceData;
    const sourceSuffix =
      sourceInfo?.sourceUpdatedAt
        ? ` Последняя сводка: ${sourceInfo.sourceUpdatedAt}. Распознано строк: ${sourceInfo.rowCount || 0}.`
        : sourceInfo?.message
          ? ` ${sourceInfo.message}`
          : "";

    outageConfigStatus.textContent =
      outageConfigCatalog.storageConfigured
        ? `Подразделения и их источники сохраняются в Redis. Один общий чат задаётся через OUTAGES_CHAT_ID.${sourceSuffix}`
        : `Redis не подключён: изменения сохранить нельзя.${sourceSuffix}`;

    outageConfigStatus.classList.toggle(
      "is-warning",
      !outageConfigCatalog.storageConfigured ||
      (sourceInfo?.status && sourceInfo.status !== "ok")
    );

    renderOutageConfigList();
  } catch (error) {
    outageConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки аварийных отключений";
    outageConfigStatus.classList.add("is-warning");
    outageConfigList.innerHTML = "";
  }
}

function dispatcherConfigGroupName(
  groupId
) {
  return (
    dispatcherConfigCatalog.groups.find(
      (group) =>
        group.id === groupId
    )?.name ||
    groupId
  );
}

function renderDispatcherConfigList() {
  const selectedGroupId =
    dispatcherConfigGroupSelect.value ||
    dispatcherConfigCatalog.groups[0]?.id ||
    "";

  const units =
    dispatcherConfigCatalog.units.filter(
      (unit) =>
        unit.groupId === selectedGroupId
    );

  dispatcherCreateUnitButton.disabled =
    !selectedGroupId ||
    !dispatcherConfigCatalog.storageConfigured;

  dispatcherDeleteGroupButton.disabled =
    !selectedGroupId ||
    !dispatcherConfigCatalog.storageConfigured;

  if (!units.length) {
    dispatcherConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>В подразделении пока нет РЭС / районов</strong>
        <span>
          Нажмите «+ РЭС / район», чтобы добавить первый элемент.
        </span>
      </div>
    `;
    return;
  }

  dispatcherConfigList.innerHTML =
    units.map(
      (unit) => {
        const sources =
          Array.isArray(unit.sources)
            ? unit.sources
            : [];

        return `
          <article class="dispatcher-config-card">
            <div class="dispatcher-config-card-head">
              <div>
                <span class="micro-label">
                  ${escapeHtml(
                    dispatcherConfigGroupName(
                      unit.groupId
                    )
                  )}
                </span>
                <h3>${escapeHtml(unit.name)}</h3>
              </div>

              <span class="dispatcher-config-state ${unit.customized ? "is-custom" : ""}">
                ${unit.customized ? "ИЗМЕНЕНО" : unit.builtin ? "ПО УМОЛЧАНИЮ" : "НОВЫЙ"}
              </span>
            </div>

            <div class="dispatcher-config-sources">
              ${
                sources.length
                  ? sources
                      .map(
                        (source) => `
                          <span>${escapeHtml(source)}</span>
                        `
                      )
                      .join("")
                  : `
                    <span class="is-empty">
                      Источники отключены · счётчики будут по нулям
                    </span>
                  `
              }
            </div>

            <div class="dispatcher-config-card-actions">
              <button
                class="role-action dispatcher-config-edit"
                type="button"
                data-dispatcher-unit="${escapeHtml(unit.id)}"
              >
                Настроить источники
              </button>

              <button
                class="role-action is-danger"
                type="button"
                data-delete-dispatcher-unit="${escapeHtml(unit.id)}"
                data-delete-dispatcher-unit-name="${escapeHtml(unit.name)}"
              >
                Удалить
              </button>
            </div>
          </article>
        `;
      }
    ).join("");

  dispatcherConfigList
    .querySelectorAll(
      "[data-dispatcher-unit]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openDispatcherSourceEditor(
              button.dataset
                .dispatcherUnit
            )
        );
      }
    );

  dispatcherConfigList
    .querySelectorAll(
      "[data-delete-dispatcher-unit]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            deleteDispatcherUnitFromAdmin(
              button.dataset
                .deleteDispatcherUnit,
              button.dataset
                .deleteDispatcherUnitName
            )
        );
      }
    );
}

function renderDispatcherConfigGroups() {
  const groups =
    dispatcherConfigCatalog.groups || [];

  const oldValue =
    dispatcherConfigGroupSelect.value;

  dispatcherConfigGroupSelect.innerHTML =
    groups.length
      ? groups.map(
          (group) => `
            <option value="${escapeHtml(group.id)}">
              ${escapeHtml(group.name)}${group.description ? ` — ${escapeHtml(group.description)}` : ""}
            </option>
          `
        ).join("")
      : `<option value="">Нет подразделений</option>`;

  if (
    groups.some(
      (group) =>
        group.id === oldValue
    )
  ) {
    dispatcherConfigGroupSelect.value =
      oldValue;
  }

  const hasGroups =
    groups.length > 0;

  dispatcherConfigGroupSelect.disabled =
    !hasGroups;
  dispatcherCreateGroupButton.disabled =
    !dispatcherConfigCatalog.storageConfigured;
  dispatcherCreateUnitButton.disabled =
    !hasGroups ||
    !dispatcherConfigCatalog.storageConfigured;
  dispatcherEditGroupButton.disabled =
    !hasGroups ||
    !dispatcherConfigCatalog.storageConfigured;
  dispatcherDeleteGroupButton.disabled =
    !hasGroups ||
    !dispatcherConfigCatalog.storageConfigured;

  renderDispatcherConfigList();
}


function renderDispatcherWorkordersConfigList() {
  const selectedGroupId =
    dispatcherWorkordersConfigGroupSelect.value ||
    dispatcherWorkordersConfigCatalog.groups[0]?.id ||
    "";

  const units =
    dispatcherWorkordersConfigCatalog.units.filter(
      (unit) =>
        unit.groupId === selectedGroupId
    );

  if (!units.length) {
    dispatcherWorkordersConfigList.innerHTML = `
      <div class="access-empty dispatcher-structure-empty">
        <strong>В подразделении пока нет РЭС / районов</strong>
        <span>
          Структура синхронизируется с основным блоком настройки диспетчера выше.
        </span>
      </div>
    `;
    return;
  }

  dispatcherWorkordersConfigList.innerHTML =
    units.map(
      (unit) => {
        const sources =
          Array.isArray(unit.sources)
            ? unit.sources
            : [];

        return `
          <article class="dispatcher-config-card dispatcher-workorders-config-card">
            <div class="dispatcher-config-card-head">
              <div>
                <span class="micro-label">
                  ${escapeHtml(
                    dispatcherConfigGroupName(
                      unit.groupId
                    )
                  )}
                </span>
                <h3>${escapeHtml(unit.name)}</h3>
              </div>

              <span class="dispatcher-config-state ${unit.customized ? "is-custom" : ""}">
                ${unit.customized ? "НАСТРОЕНО" : "НЕ НАСТРОЕНО"}
              </span>
            </div>

            <div class="dispatcher-config-sources">
              ${
                sources.length
                  ? sources
                      .map(
                        (source) => `
                          <span>${escapeHtml(source)}</span>
                        `
                      )
                      .join("")
                  : `
                    <span class="is-empty">
                      Источники НДР не выбраны · диаграмма будет по нулям
                    </span>
                  `
              }
            </div>

            <div class="dispatcher-config-card-actions">
              <button
                class="role-action dispatcher-config-edit"
                type="button"
                data-workorders-unit="${escapeHtml(unit.id)}"
              >
                Настроить НДР
              </button>
            </div>
          </article>
        `;
      }
    ).join("");

  dispatcherWorkordersConfigList
    .querySelectorAll(
      "[data-workorders-unit]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            openDispatcherWorkordersSourceEditor(
              button.dataset
                .workordersUnit
            )
        );
      }
    );
}

function renderDispatcherWorkordersConfigGroups() {
  const groups =
    dispatcherWorkordersConfigCatalog.groups || [];

  const oldValue =
    dispatcherWorkordersConfigGroupSelect.value;

  dispatcherWorkordersConfigGroupSelect.innerHTML =
    groups.length
      ? groups.map(
          (group) => `
            <option value="${escapeHtml(group.id)}">
              ${escapeHtml(group.name)}${group.description ? ` — ${escapeHtml(group.description)}` : ""}
            </option>
          `
        ).join("")
      : `<option value="">Нет подразделений</option>`;

  if (
    groups.some(
      (group) =>
        group.id === oldValue
    )
  ) {
    dispatcherWorkordersConfigGroupSelect.value =
      oldValue;
  }

  dispatcherWorkordersConfigGroupSelect.disabled =
    !groups.length;

  renderDispatcherWorkordersConfigList();
}

function openDispatcherWorkordersSourceEditor(
  unitId
) {
  const unit =
    dispatcherWorkordersConfigCatalog.units.find(
      (item) =>
        item.id === unitId
    );

  if (!unit) {
    return;
  }

  const sources =
    Array.isArray(unit.sources)
      ? unit.sources
      : [];

  const availableSourceLabels =
    Array.isArray(
      dispatcherWorkordersConfigCatalog.availableSourceLabels
    )
      ? dispatcherWorkordersConfigCatalog.availableSourceLabels
      : [];

  const sourceOptions =
    availableSourceLabels
      .map(
        (label) => `
          <option value="${escapeHtml(label)}">
            ${escapeHtml(label)}
          </option>
        `
      )
      .join("");

  openManagementModal({
    eyebrow:
      "НАРЯДЫ / РАСПОРЯЖЕНИЯ / ДОПУСКИ",
    title:
      `${dispatcherConfigGroupName(unit.groupId)} · ${unit.name}`,
    context: {
      type:
        "dispatcher-workorders-source",
      unitId:
        unit.id
    },
    bodyHtml: `
      <div class="management-note">
        Выберите строки журналов из последнего сообщения «СК-11 • Наряды / допуски».
        Если добавить несколько строк, их статусы суммируются. В интерфейсе диспетчера
        по умолчанию будет показана общая сумма, а каждую строку можно открыть отдельно.
      </div>

      ${
        availableSourceLabels.length
          ? `
            <div class="dispatcher-source-picker">
              <label class="management-field">
                <span>Быстро добавить журнал из последнего СК-11</span>
                <select id="dispatcherWorkordersSourceSuggestion" class="dispatcher-select">
                  ${sourceOptions}
                </select>
              </label>
              <button id="dispatcherWorkordersAddSourceButton" class="role-action" type="button">
                + Добавить
              </button>
            </div>
          `
          : `
            <div class="management-note is-warning">
              Пока нет распознанных строк НДР. Проверьте DISPATCHER_WORKORDERS_CHAT_ID
              и наличие свежего сообщения в чате MAX.
            </div>
          `
      }

      <label class="management-field dispatcher-source-editor-field">
        <span>Журналы-источники · по одному на строку</span>
        <textarea
          id="dispatcherWorkordersSourcesTextarea"
          rows="10"
          placeholder="Например:\nВЭС. Журнал учета работ по НДР. Выборгский РЭС"
        >${escapeHtml(sources.join("\n"))}</textarea>
      </label>

      <div class="dispatcher-source-defaults">
        <span>Если оставить поле пустым:</span>
        <strong>все значения НДР для этого РЭС / района будут равны нулю</strong>
      </div>
    `
  });

  document.getElementById(
    "dispatcherWorkordersAddSourceButton"
  )?.addEventListener(
    "click",
    () => {
      const select =
        document.getElementById(
          "dispatcherWorkordersSourceSuggestion"
        );
      const textarea =
        document.getElementById(
          "dispatcherWorkordersSourcesTextarea"
        );

      const value =
        String(select?.value || "")
          .trim();

      if (!value || !textarea) {
        return;
      }

      const current =
        String(textarea.value || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

      if (!current.includes(value)) {
        current.push(value);
      }

      textarea.value =
        current.join("\n");
      textarea.focus();
    }
  );
}

async function loadDispatcherConfigManagement() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_DISPATCHER_CONFIG,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers:
            getSessionHeaders()
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "Не удалось загрузить источники СК-11"
      );
    }

    dispatcherConfigCatalog = {
      groups:
        Array.isArray(payload.groups)
          ? payload.groups
          : [],
      units:
        Array.isArray(payload.units)
          ? payload.units
          : [],
      availableSourceLabels:
        Array.isArray(
          payload.availableSourceLabels
        )
          ? payload.availableSourceLabels
          : [],
      sourceData:
        payload.sourceData || {},
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    dispatcherWorkordersConfigCatalog = {
      groups:
        Array.isArray(payload.groups)
          ? payload.groups
          : [],
      units:
        Array.isArray(
          payload?.workorders?.units
        )
          ? payload.workorders.units
          : [],
      availableSourceLabels:
        Array.isArray(
          payload?.workorders?.availableSourceLabels
        )
          ? payload.workorders.availableSourceLabels
          : [],
      sourceData:
        payload?.workorders?.sourceData || {},
      storageConfigured:
        Boolean(payload.storageConfigured)
    };

    const sourceInfo =
      dispatcherConfigCatalog.sourceData;

    const sourceSuffix =
      sourceInfo?.sourceUpdatedAt
        ? ` Последний СК-11: ${sourceInfo.sourceUpdatedAt}.`
        : sourceInfo?.message
          ? ` ${sourceInfo.message}`
          : "";

    dispatcherConfigStatus.textContent =
      dispatcherConfigCatalog.storageConfigured
        ? `Структура подразделений, РЭС / районов и источники сохраняются в Redis. Одна строка источника = одна строка из сообщения СК-11.${sourceSuffix}`
        : `Redis не подключён: отображается только базовая структура, изменения сохранить нельзя.${sourceSuffix}`;

    dispatcherConfigStatus.classList.toggle(
      "is-warning",
      !dispatcherConfigCatalog.storageConfigured
    );

    const workordersInfo =
      dispatcherWorkordersConfigCatalog.sourceData;

    const workordersSuffix =
      workordersInfo?.sourceUpdatedAt
        ? ` Последний НДР: ${workordersInfo.sourceUpdatedAt}. Распознано журналов: ${workordersInfo.rowCount || 0}${workordersInfo.parts > 1 ? ` · частей: ${workordersInfo.parts}` : ""}.`
        : workordersInfo?.message
          ? ` ${workordersInfo.message}`
          : "";

    dispatcherWorkordersConfigStatus.textContent =
      dispatcherWorkordersConfigCatalog.storageConfigured
        ? `Источники НДР сохраняются отдельно в Redis и привязаны к той же структуре подразделений и РЭС / районов.${workordersSuffix}`
        : `Redis не подключён: источники НДР сохранить нельзя.${workordersSuffix}`;

    dispatcherWorkordersConfigStatus.classList.toggle(
      "is-warning",
      !dispatcherWorkordersConfigCatalog.storageConfigured ||
      (workordersInfo?.status && workordersInfo.status !== "ok")
    );

    renderDispatcherConfigGroups();
    renderDispatcherWorkordersConfigGroups();
  } catch (error) {
    dispatcherConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки источников";

    dispatcherConfigStatus.classList.add(
      "is-warning"
    );

    dispatcherConfigList.innerHTML = "";

    dispatcherWorkordersConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки источников НДР";
    dispatcherWorkordersConfigStatus.classList.add(
      "is-warning"
    );
    dispatcherWorkordersConfigList.innerHTML = "";
  }
}

async function postDispatcherStructureAction(
  payload
) {
  const response =
    await fetch(
      API_ADMIN_DISPATCHER_CONFIG,
      {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
          ...getSessionHeaders()
        },
        body: JSON.stringify(payload)
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
      "Не удалось изменить структуру диспетчерского интерфейса"
    );
  }

  return data;
}

function openCreateDispatcherGroupEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  openManagementModal({
    eyebrow:
      "СТРУКТУРА ДИСПЕТЧЕРСКОГО ИНТЕРФЕЙСА",
    title:
      "Новое подразделение",
    saveLabel:
      "Создать подразделение",
    context: {
      type:
        "dispatcher-group-create"
    },
    bodyHtml: `
      <label class="management-field">
        <span>Название подразделения</span>
        <input
          id="dispatcherNewGroupName"
          maxlength="80"
          placeholder="Например: ЗЭС"
        />
      </label>

      <label class="management-field">
        <span>Описание</span>
        <input
          id="dispatcherNewGroupDescription"
          maxlength="160"
          placeholder="Например: Западные электрические сети"
        />
      </label>

      <div class="management-note">
        После создания подразделение автоматически появится в настройках ролей
        и в диспетчерском интерфейсе у Разработчика и ролей с доступом
        «Все подразделения». РЭС / районы добавляются отдельно.
      </div>
    `
  });

  document.getElementById(
    "dispatcherNewGroupName"
  )?.focus();
}

function openEditDispatcherGroupEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  const groupId =
    dispatcherConfigGroupSelect.value;

  const group =
    dispatcherConfigCatalog.groups.find(
      (item) => item.id === groupId
    );

  if (!group) {
    return;
  }

  openManagementModal({
    eyebrow:
      "СТРУКТУРА ДИСПЕТЧЕРСКОГО ИНТЕРФЕЙСА",
    title:
      `Редактирование · ${group.name}`,
    saveLabel:
      "Сохранить изменения",
    context: {
      type:
        "dispatcher-group-edit",
      groupId:
        group.id
    },
    bodyHtml: `
      <label class="management-field">
        <span>Название подразделения</span>
        <input
          id="dispatcherEditGroupName"
          maxlength="80"
          value="${escapeHtml(group.name)}"
          placeholder="Название подразделения"
        />
      </label>

      <label class="management-field">
        <span>Описание</span>
        <input
          id="dispatcherEditGroupDescription"
          maxlength="160"
          value="${escapeHtml(group.description || "")}"
          placeholder="Описание подразделения"
        />
      </label>

      <div class="management-note">
        Внутренний ID подразделения не меняется, поэтому существующие роли,
        РЭС / районы и их источники продолжат работать. Изменится только
        отображаемое название и описание во всём интерфейсе.
      </div>
    `
  });

  document.getElementById(
    "dispatcherEditGroupName"
  )?.focus();
}

function openCreateDispatcherUnitEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  const groups =
    dispatcherConfigCatalog.groups || [];

  if (!groups.length) {
    openModal({
      type: "denied",
      eyebrow: "СТРУКТУРА",
      title: "Сначала создайте подразделение",
      message:
        "Чтобы добавить РЭС / район, в системе должно быть хотя бы одно подразделение."
    });
    return;
  }

  const selectedGroupId =
    dispatcherConfigGroupSelect.value ||
    groups[0]?.id ||
    "";

  const options =
    groups.map(
      (group) => `
        <option
          value="${escapeHtml(group.id)}"
          ${group.id === selectedGroupId ? "selected" : ""}
        >
          ${escapeHtml(group.name)}
        </option>
      `
    ).join("");

  openManagementModal({
    eyebrow:
      "СТРУКТУРА ДИСПЕТЧЕРСКОГО ИНТЕРФЕЙСА",
    title:
      "Новый РЭС / район",
    saveLabel:
      "Создать РЭС / район",
    context: {
      type:
        "dispatcher-unit-create"
    },
    bodyHtml: `
      <label class="management-field">
        <span>Подразделение</span>
        <select
          id="dispatcherNewUnitGroup"
          class="dispatcher-select"
        >
          ${options}
        </select>
      </label>

      <label class="management-field">
        <span>Название РЭС / района</span>
        <input
          id="dispatcherNewUnitName"
          maxlength="80"
          placeholder="Например: Волосовский РЭС"
        />
      </label>

      <div class="management-note">
        Новый РЭС / район создаётся без источников СК-11. После создания
        откройте его карточку и назначьте нужные строки через «Настроить источники».
      </div>
    `
  });

  document.getElementById(
    "dispatcherNewUnitName"
  )?.focus();
}

async function deleteDispatcherUnitFromAdmin(
  unitId,
  unitName
) {
  const confirmed =
    window.confirm(
      `Удалить «${unitName}»? РЭС / район исчезнет из диспетчерского интерфейса. Это разрешено и для элементов, которые были в системе изначально.`
    );

  if (!confirmed) {
    return;
  }

  try {
    await postDispatcherStructureAction({
      action: "delete_unit",
      unitId
    });

    await Promise.all([
      loadDispatcherConfigManagement(),
      loadAccessManagement()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "СТРУКТУРА",
      title: "Не удалось удалить РЭС / район",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

async function deleteSelectedDispatcherGroup() {
  const groupId =
    dispatcherConfigGroupSelect.value;

  const group =
    dispatcherConfigCatalog.groups.find(
      (item) => item.id === groupId
    );

  if (!group) {
    return;
  }

  const unitCount =
    dispatcherConfigCatalog.units.filter(
      (unit) =>
        unit.groupId === group.id
    ).length;

  const confirmed =
    window.confirm(
      `Удалить подразделение «${group.name}»? Вместе с ним из интерфейса будут удалены все его РЭС / районы (${unitCount}). Роли, ограниченные этим подразделением, потеряют диспетчерский контур до перенастройки.`
    );

  if (!confirmed) {
    return;
  }

  try {
    await postDispatcherStructureAction({
      action: "delete_group",
      groupId: group.id
    });

    await Promise.all([
      loadDispatcherConfigManagement(),
      loadAccessManagement(),
      loadAdminDashboard()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow: "СТРУКТУРА",
      title: "Не удалось удалить подразделение",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

function openDispatcherSourceEditor(
  unitId
) {
  const unit =
    dispatcherConfigCatalog.units.find(
      (item) =>
        item.id === unitId
    );

  if (!unit) {
    return;
  }

  const sources =
    Array.isArray(unit.sources)
      ? unit.sources
      : [];

  const defaults =
    Array.isArray(unit.defaultSources)
      ? unit.defaultSources
      : [];

  const availableSourceLabels =
    Array.isArray(
      dispatcherConfigCatalog.availableSourceLabels
    )
      ? dispatcherConfigCatalog.availableSourceLabels
      : [];

  const sourceOptions =
    availableSourceLabels
      .map(
        (label) => `
          <option value="${escapeHtml(label)}">
            ${escapeHtml(label)}
          </option>
        `
      )
      .join("");

  openManagementModal({
    eyebrow:
      "ИСТОЧНИКИ СК-11",
    title:
      `${dispatcherConfigGroupName(unit.groupId)} · ${unit.name}`,
    context: {
      type:
        "dispatcher-source",
      unitId:
        unit.id
    },
    bodyHtml: `
      <div class="management-note">
        Каждая строка ниже должна точно совпадать с названием строки в сообщении СК-11.
        Все найденные строки суммируются. Можно оставить поле пустым — тогда все счётчики
        этого РЭС/района будут равны нулю.
      </div>

      ${
        availableSourceLabels.length
          ? `
            <div class="dispatcher-source-picker">
              <label class="management-field">
                <span>Быстро добавить строку из последнего СК-11</span>
                <select id="dispatcherSourceSuggestion" class="dispatcher-select">
                  ${sourceOptions}
                </select>
              </label>
              <button id="dispatcherAddSourceButton" class="role-action" type="button">
                + Добавить
              </button>
            </div>
          `
          : ""
      }

      <label class="management-field dispatcher-source-editor-field">
        <span>Строки-источники · по одной на строку</span>
        <textarea
          id="dispatcherSourcesTextarea"
          rows="8"
          placeholder="Например:\nЮжный ВВР\nГПС Волосово"
        >${escapeHtml(sources.join("\n"))}</textarea>
      </label>

      <div class="dispatcher-source-defaults">
        <span>Настройка по умолчанию:</span>
        <strong>${escapeHtml(defaults.length ? defaults.join(" + ") : "нет источников")}</strong>
        <button id="dispatcherRestoreDefaultsButton" class="role-action" type="button">
          Подставить по умолчанию
        </button>
      </div>
    `
  });

  const addSourceButton =
    document.getElementById(
      "dispatcherAddSourceButton"
    );

  addSourceButton?.addEventListener(
    "click",
    () => {
      const select =
        document.getElementById(
          "dispatcherSourceSuggestion"
        );
      const textarea =
        document.getElementById(
          "dispatcherSourcesTextarea"
        );

      const value =
        String(select?.value || "")
          .trim();

      if (!value || !textarea) {
        return;
      }

      const current =
        String(textarea.value || "")
          .split("\n")
          .map(
            (item) =>
              item.trim()
          )
          .filter(Boolean);

      if (!current.includes(value)) {
        current.push(value);
      }

      textarea.value =
        current.join("\n");
      textarea.focus();
    }
  );

  const restoreButton =
    document.getElementById(
      "dispatcherRestoreDefaultsButton"
    );

  restoreButton?.addEventListener(
    "click",
    () => {
      const textarea =
        document.getElementById(
          "dispatcherSourcesTextarea"
        );

      if (textarea) {
        textarea.value =
          defaults.join("\n");
        textarea.focus();
      }
    }
  );
}

function openManagementModal({
  eyebrow,
  title,
  bodyHtml,
  context,
  saveLabel = "Сохранить"
}) {
  managementEyebrow.textContent =
    eyebrow;

  managementTitle.textContent =
    title;

  managementBody.innerHTML =
    bodyHtml;

  managementContext =
    context;

  managementSaveButton
    .querySelector("span")
    .textContent =
      saveLabel;

  managementModal.classList.add(
    "is-open"
  );

  managementModal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeManagementEditor() {
  managementModal.classList.remove(
    "is-open"
  );

  managementModal.setAttribute(
    "aria-hidden",
    "true"
  );

  managementContext = null;
  managementBody.innerHTML = "";
  managementSaveButton
    .querySelector("span")
    .textContent =
      "Сохранить";
}

function panelCheckboxes(
  selectedPanelIds = []
) {
  const selected =
    new Set(
      selectedPanelIds
    );

  return `
    <div class="permission-grid">
      ${
        accessCatalog.panels
          .map(
            (panel) => `
              <label class="permission-option">
                <input
                  type="checkbox"
                  name="panelAccess"
                  value="${escapeHtml(
                    panel.id
                  )}"
                  ${
                    selected.has(
                      panel.id
                    )
                      ? "checked"
                      : ""
                  }
                />

                <span class="permission-copy">
                  <strong>
                    ${escapeHtml(
                      panel.name
                    )}
                  </strong>
                  <span>
                    ${escapeHtml(
                      panel.description ||
                      ""
                    )}
                  </span>
                </span>
              </label>
            `
          )
          .join("")
      }
    </div>
  `;
}

function renderDispatcherRoleScope(
  selectedDivisionId = "",
  allDivisions = false
) {
  const host =
    document.getElementById(
      "dispatcherRoleScopeWrap"
    );

  if (!host) {
    return;
  }

  const dispatcherEnabled =
    Boolean(
      managementBody.querySelector(
        'input[name="panelAccess"][value="dispatcher"]:checked'
      )
    );

  if (!dispatcherEnabled) {
    host.innerHTML = "";
    return;
  }

  const options =
    (accessCatalog.dispatcherDivisions || [])
      .map(
        (division) => `
          <option value="${escapeHtml(division.id)}" ${division.id === selectedDivisionId ? "selected" : ""}>
            ${escapeHtml(division.name)} — ${escapeHtml(division.description || "")}
          </option>
        `
      )
      .join("");

  host.innerHTML = `
    <div class="management-section-title">
      Подразделение диспетчерской роли
    </div>

    <label class="management-field">
      <span>Подразделение / филиал</span>
      <select id="dispatcherRoleDivisionSelect" class="dispatcher-select dispatcher-role-select">
        <option value="">Выберите подразделение</option>
        <option value="__all__" ${allDivisions ? "selected" : ""}>Все подразделения</option>
        ${options}
      </select>
    </label>

    <div class="management-note">
      Обычный контур жёстко ограничивает доступ на сервере. Например, роль
      «Диспетчер ВЭС» увидит только ВЭС и не сможет открыть ЮЭС, КС и другие
      подразделения даже прямым запросом к API. Опция «Все подразделения»
      подходит, например, для роли «Главный диспетчер».
    </div>
  `;
}

function bindDispatcherRoleScope(
  role
) {
  const checkboxes =
    managementBody.querySelectorAll(
      'input[name="panelAccess"]'
    );

  const refresh = () => {
    const currentValue =
      document.getElementById(
        "dispatcherRoleDivisionSelect"
      )?.value ||
      (
        role?.dispatcherAllDivisions
          ? "__all__"
          : role?.dispatcherDivisionId
      ) ||
      "";

    renderDispatcherRoleScope(
      currentValue === "__all__"
        ? ""
        : currentValue,
      currentValue === "__all__"
    );
  };

  checkboxes.forEach(
    (checkbox) => {
      checkbox.addEventListener(
        "change",
        refresh
      );
    }
  );

  refresh();
}

function roleColorEditorHtml(color) {
  const clean = normalizeRoleColor(color);
  return `
    <div class="role-color-editor">
      <div class="management-section-title">
        Цвет роли
      </div>
      <div class="role-color-control">
        <input
          id="roleColorPicker"
          class="role-color-picker"
          type="color"
          value="${clean}"
          aria-label="Выберите цвет роли"
        />
        <label class="management-field role-color-hex-field">
          <span>HEX</span>
          <input
            id="roleColorHexInput"
            maxlength="7"
            value="${clean}"
            placeholder="#39c6e6"
          />
        </label>
        <div id="roleColorPreview" class="role-color-preview" style="--role-preview: ${clean}; --role-preview-soft: ${roleColorRgba(clean, .12)}; --role-preview-line: ${roleColorRgba(clean, .38)}">
          <span></span>
          <strong>Предпросмотр роли</strong>
        </div>
      </div>
      <div class="role-color-presets">
        ${["#39c6e6", "#45d5a2", "#9f7bff", "#ffb84d", "#ff6b89", "#5b8cff", "#e879f9", "#94a3b8"].map((preset) => `
          <button type="button" class="role-color-preset" data-role-color-preset="${preset}" style="background:${preset}" title="${preset}"></button>
        `).join("")}
      </div>
    </div>
  `;
}

function bindRoleColorEditor() {
  const picker = document.getElementById("roleColorPicker");
  const hex = document.getElementById("roleColorHexInput");
  const preview = document.getElementById("roleColorPreview");

  if (!picker || !hex || !preview) return;

  const update = (value) => {
    const clean = normalizeRoleColor(value, picker.value || "#39c6e6");
    picker.value = clean;
    hex.value = clean;
    preview.style.setProperty("--role-preview", clean);
    preview.style.setProperty("--role-preview-soft", roleColorRgba(clean, .12));
    preview.style.setProperty("--role-preview-line", roleColorRgba(clean, .38));
  };

  picker.addEventListener("input", () => update(picker.value));
  hex.addEventListener("change", () => update(hex.value));
  hex.addEventListener("blur", () => update(hex.value));

  managementBody.querySelectorAll("[data-role-color-preset]").forEach((button) => {
    button.addEventListener("click", () => update(button.dataset.roleColorPreset));
  });
}

function getRoleColorEditorValue() {
  return normalizeRoleColor(
    document.getElementById("roleColorHexInput")?.value ||
    document.getElementById("roleColorPicker")?.value
  );
}

function openRoleColorEditor(roleId) {
  const role = roleById(roleId);
  if (!role) return;

  openManagementModal({
    eyebrow: "ЦВЕТ РОЛИ",
    title: role.name,
    saveLabel: "Сохранить цвет",
    context: {
      type: "role-color",
      roleId: role.id
    },
    bodyHtml: `
      <div class="management-note">
        Цвет используется в шапке Mini App и в интерфейсе управления ролями.
        Настройка применяется и к системным ролям, и к созданным вручную.
      </div>
      ${roleColorEditorHtml(role.color)}
    `
  });

  bindRoleColorEditor();
}

function openRoleEditor(
  roleId = null
) {
  const role =
    roleId
      ? roleById(roleId)
      : null;

  if (role?.builtin) {
    return;
  }

  openManagementModal({
    eyebrow:
      role
        ? "РЕДАКТИРОВАНИЕ РОЛИ"
        : "НОВАЯ РОЛЬ",
    title:
      role
        ? role.name
        : "Создать роль",
    context: {
      type: "role",
      roleId:
        role?.id || null
    },
    bodyHtml: `
      <label class="management-field">
        <span>Название роли</span>
        <input
          id="roleNameInput"
          maxlength="80"
          value="${escapeHtml(
            role?.name || ""
          )}"
          placeholder="Например: Старший диспетчер"
        />
      </label>

      <label class="management-field">
        <span>Описание</span>
        <textarea
          id="roleDescriptionInput"
          maxlength="300"
          placeholder="Кратко опишите назначение роли"
        >${escapeHtml(
          role?.description || ""
        )}</textarea>
      </label>

      ${roleColorEditorHtml(
        role?.color || "#39c6e6"
      )}

      <div class="management-section-title">
        Доступ к панелям
      </div>

      ${panelCheckboxes(
        role?.panelIds || []
      )}

      <div id="dispatcherRoleScopeWrap"></div>

      <div class="management-note">
        Список панелей формируется из единого реестра Mini App.
        Когда в будущем будет добавлена новая панель и зарегистрирована
        в системе, она автоматически появится здесь.
      </div>
    `
  });

  bindDispatcherRoleScope(
    role || null
  );
  bindRoleColorEditor();
}

function createUserRoleChoices() {
  const selected =
    new Set(["user"]);

  return accessCatalog.roles
    .map(
      (role) => {
        const panels =
          (role.panelIds || [])
            .map(panelNameById)
            .join(", ");

        return `
          <label class="role-choice">
            <input
              type="checkbox"
              name="newUserRole"
              value="${escapeHtml(role.id)}"
              ${selected.has(role.id) ? "checked" : ""}
            />

            <span class="role-choice-copy">
              <strong class="role-choice-title">
                <i class="role-choice-color" style="background:${normalizeRoleColor(role.color)}"></i>
                ${escapeHtml(role.name)}
                ${role.builtin ? " · системная" : ""}
              </strong>

              <span>
                ${escapeHtml(role.description || "Без описания")}
              </span>

              ${
                role.dispatcherAllDivisions
                  ? `
                    <span class="role-choice-panels">
                      Подразделения: Все
                    </span>
                  `
                  : role.dispatcherDivisionName
                    ? `
                      <span class="role-choice-panels">
                        Подразделение: ${escapeHtml(role.dispatcherDivisionName)}
                      </span>
                    `
                    : ""
              }

              <span class="role-choice-panels">
                Панели: ${escapeHtml(panels || "нет")}
              </span>
            </span>
          </label>
        `;
      }
    )
    .join("");
}

function openCreateUserEditor() {
  if (!currentUser?.isDeveloper) {
    return;
  }

  openManagementModal({
    eyebrow:
      "НОВАЯ УЧЁТНАЯ ЗАПИСЬ",
    title:
      "Создать пользователя",
    saveLabel:
      "Создать пользователя",
    context: {
      type: "create-user"
    },
    bodyHtml: `
      <div class="user-create-grid">
        <label class="management-field">
          <span>Логин</span>
          <input
            id="newUserLoginInput"
            maxlength="64"
            autocomplete="off"
            placeholder="Например: Ivanov.II"
          />
        </label>

        <label class="management-field">
          <span>ФИО</span>
          <input
            id="newUserFullNameInput"
            maxlength="120"
            autocomplete="off"
            placeholder="Иванов Иван Иванович"
          />
        </label>
      </div>

      <label class="management-field">
        <span>Пароль</span>
        <input
          id="newUserPasswordInput"
          type="password"
          maxlength="200"
          autocomplete="new-password"
          placeholder="Минимум 8 символов"
        />
      </label>

      <div class="management-note">
        Пароль не сохраняется в открытом виде. На сервере хранится
        только PBKDF2-хэш и индивидуальная соль пользователя.
      </div>

      <div class="management-section-title">
        Роли пользователя
      </div>

      <div class="role-choice-grid">
        ${createUserRoleChoices()}
      </div>
    `
  });

  document.getElementById(
    "newUserLoginInput"
  )?.focus();
}

async function openUserRoleEditor(
  username,
  allowReload = true
) {
  if (!currentUser?.isDeveloper) {
    return;
  }

  let user =
    accessCatalog.users.find(
      (item) =>
        item.username ===
        username
    );

  if (
    !user &&
    allowReload
  ) {
    await loadAccessManagement();

    user =
      accessCatalog.users.find(
        (item) =>
          item.username ===
          username
      );
  }

  if (!user) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ДОСТУПОМ",
      title:
        "Пользователь не найден",
      message:
        "Не удалось загрузить данные пользователя. Обновите центр управления и попробуйте ещё раз."
    });

    return;
  }

  const selected =
    new Set(
      user.roleIds || []
    );

  const choices =
    accessCatalog.roles
      .map(
        (role) => {
          const panels =
            (role.panelIds || [])
              .map(
                panelNameById
              )
              .join(", ");

          return `
            <label class="role-choice">
              <input
                type="checkbox"
                name="userRole"
                value="${escapeHtml(
                  role.id
                )}"
                ${
                  selected.has(
                    role.id
                  )
                    ? "checked"
                    : ""
                }
              />

              <span class="role-choice-copy">
                <strong class="role-choice-title">
                  <i class="role-choice-color" style="background:${normalizeRoleColor(role.color)}"></i>
                  ${escapeHtml(
                    role.name
                  )}
                  ${
                    role.builtin
                      ? " · системная"
                      : ""
                  }
                </strong>

                <span>
                  ${escapeHtml(
                    role.description ||
                    "Без описания"
                  )}
                </span>

                ${
                  role.dispatcherAllDivisions
                    ? `
                      <span class="role-choice-panels">
                        Подразделения: Все
                      </span>
                    `
                    : role.dispatcherDivisionName
                      ? `
                        <span class="role-choice-panels">
                          Подразделение: ${escapeHtml(
                            role.dispatcherDivisionName
                          )}
                        </span>
                      `
                      : ""
                }

                <span class="role-choice-panels">
                  Панели: ${
                    escapeHtml(
                      panels ||
                      "нет"
                    )
                  }
                </span>
              </span>
            </label>
          `;
        }
      )
      .join("");

  openManagementModal({
    eyebrow:
      "РОЛИ ПОЛЬЗОВАТЕЛЯ",
    title:
      user.fullName ||
      user.username,
    context: {
      type: "user",
      username:
        user.username
    },
    bodyHtml: `
      <div class="management-note">
        Логин: ${escapeHtml(
          user.username
        )}. Изменения вступают в силу сразу на сервере;
        повторный вход обычно не требуется.
        ${
          user.accountSource === "managed"
            ? "Учётная запись создана через Центр управления."
            : "Исходная учётная запись из APP_USERS_JSON; удаление отключит её через Redis/KV."
        }
      </div>

      <div class="management-section-title">
        Назначенные роли
      </div>

      <div class="role-choice-grid">
        ${choices}
      </div>

      ${
        user.username ===
          currentUser.username &&
        user.roleIds?.includes(
          "developer"
        )
          ? `
            <div class="management-note">
              Для защиты от случайной блокировки нельзя снять роль
              «Разработчик» у своей текущей учётной записи.
            </div>
          `
          : ""
      }

      ${
        user.username !==
          currentUser.username
          ? `
            <div class="user-danger-zone">
              <div>
                <strong>Удаление пользователя</strong>
                <span>Доступ будет отозван, роли и активная сессия очищены.</span>
              </div>
              <button
                id="deleteUserButton"
                class="danger-action"
                type="button"
              >
                Удалить
              </button>
            </div>
          `
          : ""
      }
    `
  });

  document.getElementById(
    "deleteUserButton"
  )?.addEventListener(
    "click",
    () =>
      deleteUserAccount(
        user.username,
        user.fullName ||
        user.username
      )
  );
}

async function saveManagementEditor() {
  if (!managementContext) {
    return;
  }

  managementSaveButton.disabled =
    true;

  managementSaveButton
    .querySelector("span")
    .textContent =
      "Сохранение…";

  try {
    if (
      managementContext.type ===
      "create-user"
    ) {
      const username =
        document.getElementById(
          "newUserLoginInput"
        )?.value.trim() || "";

      const fullName =
        document.getElementById(
          "newUserFullNameInput"
        )?.value.trim() || "";

      const password =
        document.getElementById(
          "newUserPasswordInput"
        )?.value || "";

      const roleIds =
        [
          ...managementBody
            .querySelectorAll(
              'input[name="newUserRole"]:checked'
            )
        ].map(
          (input) =>
            input.value
        );

      const response =
        await fetch(
          API_ADMIN_USERS,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action: "create",
              username,
              fullName,
              password,
              roleIds
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
          "Не удалось создать пользователя"
        );
      }
    }

    if (
      managementContext.type ===
      "role"
    ) {
      const name =
        document.getElementById(
          "roleNameInput"
        )?.value
          .trim();

      const description =
        document.getElementById(
          "roleDescriptionInput"
        )?.value
          .trim();

      const color =
        getRoleColorEditorValue();

      const panelIds =
        [
          ...managementBody
            .querySelectorAll(
              'input[name="panelAccess"]:checked'
            )
        ].map(
          (input) =>
            input.value
        );

      const dispatcherScopeValue =
        document.getElementById(
          "dispatcherRoleDivisionSelect"
        )?.value || "";

      const dispatcherAllDivisions =
        dispatcherScopeValue ===
        "__all__";

      const dispatcherDivisionId =
        dispatcherAllDivisions
          ? ""
          : dispatcherScopeValue;

      const response =
        await fetch(
          API_ADMIN_ROLES,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action:
                managementContext
                  .roleId
                  ? "update"
                  : "create",
              roleId:
                managementContext
                  .roleId,
              name,
              description,
              color,
              panelIds,
              dispatcherDivisionId,
              dispatcherAllDivisions
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
          "Не удалось сохранить роль"
        );
      }
    }

    if (
      managementContext.type ===
      "role-color"
    ) {
      const response = await fetch(
        API_ADMIN_ROLES,
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            action: "color",
            roleId: managementContext.roleId,
            color: getRoleColorEditorValue()
          })
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось сохранить цвет роли");
      }
    }

    if (
      managementContext.type ===
      "outage-division-create" ||
      managementContext.type ===
      "outage-division-edit"
    ) {
      const name =
        document.getElementById(
          "outageDivisionNameInput"
        )?.value.trim() || "";

      const sources =
        String(
          document.getElementById(
            "outageSourcesTextarea"
          )?.value || ""
        )
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean);

      await postOutageConfigAction({
        action:
          managementContext.type ===
          "outage-division-create"
            ? "create"
            : "update",
        divisionId:
          managementContext.divisionId || "",
        name,
        sources
      });
    }

    if (
      managementContext.type ===
      "dispatcher-group-create"
    ) {
      const name =
        document.getElementById(
          "dispatcherNewGroupName"
        )?.value.trim() || "";

      const description =
        document.getElementById(
          "dispatcherNewGroupDescription"
        )?.value.trim() || "";

      await postDispatcherStructureAction({
        action: "create_group",
        name,
        description
      });
    }

    if (
      managementContext.type ===
      "dispatcher-group-edit"
    ) {
      const name =
        document.getElementById(
          "dispatcherEditGroupName"
        )?.value.trim() || "";

      const description =
        document.getElementById(
          "dispatcherEditGroupDescription"
        )?.value.trim() || "";

      await postDispatcherStructureAction({
        action: "update_group",
        groupId:
          managementContext.groupId,
        name,
        description
      });
    }

    if (
      managementContext.type ===
      "dispatcher-unit-create"
    ) {
      const groupId =
        document.getElementById(
          "dispatcherNewUnitGroup"
        )?.value || "";

      const name =
        document.getElementById(
          "dispatcherNewUnitName"
        )?.value.trim() || "";

      await postDispatcherStructureAction({
        action: "create_unit",
        groupId,
        name
      });
    }

    if (
      managementContext.type ===
      "user"
    ) {
      const roleIds =
        [
          ...managementBody
            .querySelectorAll(
              'input[name="userRole"]:checked'
            )
        ].map(
          (input) =>
            input.value
        );

      const response =
        await fetch(
          API_ADMIN_USER_ROLES,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              username:
                managementContext
                  .username,
              roleIds
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
          "Не удалось назначить роли"
        );
      }
    }

    if (
      managementContext.type ===
      "dispatcher-workorders-source"
    ) {
      const textarea =
        document.getElementById(
          "dispatcherWorkordersSourcesTextarea"
        );

      const sources =
        String(
          textarea?.value || ""
        )
          .split("\n")
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      const response =
        await fetch(
          API_ADMIN_DISPATCHER_CONFIG,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action: "save_workorders",
              unitId:
                managementContext
                  .unitId,
              sources
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
          "Не удалось сохранить источники НДР"
        );
      }
    }

    if (
      managementContext.type ===
      "dispatcher-source"
    ) {
      const textarea =
        document.getElementById(
          "dispatcherSourcesTextarea"
        );

      const sources =
        String(
          textarea?.value || ""
        )
          .split("\n")
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      const response =
        await fetch(
          API_ADMIN_DISPATCHER_CONFIG,
          {
            method: "POST",
            cache: "no-store",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              ...getSessionHeaders()
            },
            body: JSON.stringify({
              action: "save",
              unitId:
                managementContext
                  .unitId,
              sources
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
          "Не удалось сохранить источники СК-11"
        );
      }
    }

    closeManagementEditor();

    await Promise.all([
      loadAccessManagement(),
      loadAdminDashboard(),
      loadOutageConfigManagement(),
      loadDispatcherConfigManagement()
    ]);

    /*
      Если разработчик изменил кому-то роли, backend уже применяет
      их сразу. Для текущего пользователя обновляем /api/me тоже.
    */
    const meResponse =
      await fetch(
        API_ME,
        {
          method: "GET",
          cache: "no-store",
          credentials:
            "include",
          headers:
            getSessionHeaders()
        }
      );

    if (meResponse.ok) {
      const mePayload =
        await meResponse.json();

      if (
        mePayload?.user
      ) {
        setUserUi(
          mePayload.user
        );
      }
    }
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ДОСТУПОМ",
      title:
        "Не удалось сохранить",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  } finally {
    managementSaveButton.disabled =
      false;

    managementSaveButton
      .querySelector("span")
      .textContent =
        managementContext?.type ===
          "create-user"
          ? "Создать пользователя"
          : managementContext?.type === "role-color"
            ? "Сохранить цвет"
            : "Сохранить";
  }
}

async function deleteUserAccount(
  username,
  fullName
) {
  const confirmed =
    window.confirm(
      `Удалить пользователя «${fullName}» (${username})? Доступ к Mini App будет отозван.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_USERS,
        {
          method: "POST",
          cache: "no-store",
          credentials:
            "include",
          headers: {
            "Content-Type":
              "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            action: "delete",
            username
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
        "Не удалось удалить пользователя"
      );
    }

    closeManagementEditor();

    await Promise.all([
      loadAccessManagement(),
      loadAdminDashboard()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ",
      title:
        "Не удалось удалить пользователя",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

async function deleteCustomRole(
  roleId
) {
  const role =
    roleById(roleId);

  if (!role || role.builtin) {
    return;
  }

  const confirmed =
    window.confirm(
      `Удалить роль «${role.name}»? Пользователи с этой ролью вернутся к оставшимся ролям или к значениям из APP_USERS_JSON.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        API_ADMIN_ROLES,
        {
          method: "POST",
          cache: "no-store",
          credentials:
            "include",
          headers: {
            "Content-Type":
              "application/json",
            ...getSessionHeaders()
          },
          body: JSON.stringify({
            action: "delete",
            roleId
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
        "Не удалось удалить роль"
      );
    }

    await Promise.all([
      loadAccessManagement(),
      loadAdminDashboard()
    ]);
  } catch (error) {
    openModal({
      type: "denied",
      eyebrow:
        "УПРАВЛЕНИЕ ДОСТУПОМ",
      title:
        "Не удалось удалить роль",
      message:
        error instanceof Error
          ? error.message
          : "Попробуйте ещё раз."
    });
  }
}

createUserButton.addEventListener(
  "click",
  openCreateUserEditor
);

createRoleButton.addEventListener(
  "click",
  () =>
    openRoleEditor()
);

outageCreateDivisionButton.addEventListener(
  "click",
  openCreateOutageDivisionEditor
);

dispatcherConfigGroupSelect.addEventListener(
  "change",
  renderDispatcherConfigList
);

dispatcherWorkordersConfigGroupSelect.addEventListener(
  "change",
  renderDispatcherWorkordersConfigList
);

dispatcherCreateGroupButton.addEventListener(
  "click",
  openCreateDispatcherGroupEditor
);

dispatcherCreateUnitButton.addEventListener(
  "click",
  openCreateDispatcherUnitEditor
);

dispatcherEditGroupButton.addEventListener(
  "click",
  openEditDispatcherGroupEditor
);

dispatcherDeleteGroupButton.addEventListener(
  "click",
  deleteSelectedDispatcherGroup
);

closeManagementModal.addEventListener(
  "click",
  closeManagementEditor
);

managementCancelButton.addEventListener(
  "click",
  closeManagementEditor
);

managementSaveButton.addEventListener(
  "click",
  saveManagementEditor
);

managementModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      managementModal
    ) {
      closeManagementEditor();
    }
  }
);

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

function renderOutageObjects(objects = []) {
  const items = Array.isArray(objects)
    ? objects.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!items.length) return "";

  const PREVIEW_LIMIT = 6;
  const preview = items.slice(0, PREVIEW_LIMIT);
  const hidden = items.slice(PREVIEW_LIMIT);

  const chips = (values) => values
    .map((item) => `<span class="outage-object-chip">${escapeHtml(item)}</span>`)
    .join("");

  if (!hidden.length) {
    return `
      <div class="outage-detail-field outage-objects-field">
        <span>Обесточенные объекты</span>
        <div class="outage-object-chips">${chips(preview)}</div>
      </div>
    `;
  }

  return `
    <div class="outage-detail-field outage-objects-field">
      <span>Обесточенные объекты</span>
      <div class="outage-object-chips">${chips(preview)}</div>
      <details class="outage-objects-more">
        <summary>Показать ещё ${hidden.length} ${pluralizeRu(hidden.length, "объект", "объекта", "объектов")}</summary>
        <div class="outage-object-chips outage-object-chips-more">${chips(hidden)}</div>
      </details>
    </div>
  `;
}

function renderOutageEvent(event = {}) {
  const appeals = Number(event?.appeals || 0);
  const equipment = String(event?.equipment || "").trim();
  const energyObject = String(event?.energyObject || "").trim();
  const createdAt = String(event?.createdAt || "").trim();

  return `
    <article class="outage-event-card">
      <div class="outage-event-head">
        <div>
          <span class="outage-event-kicker">ОТКЛЮЧЕНИЕ</span>
          <strong>#${escapeHtml(event?.id || "—")}</strong>
        </div>
        <div class="outage-event-appeals ${appeals > 0 ? "has-appeals" : ""}">
          <span>Обращений</span>
          <strong>${appeals}</strong>
        </div>
      </div>

      <div class="outage-event-grid">
        ${createdAt ? `
          <div class="outage-detail-field">
            <span>Создано</span>
            <strong>${escapeHtml(createdAt)}</strong>
          </div>
        ` : ""}
        ${equipment ? `
          <div class="outage-detail-field">
            <span>Оборудование</span>
            <strong>${escapeHtml(equipment)}</strong>
          </div>
        ` : ""}
        ${energyObject ? `
          <div class="outage-detail-field">
            <span>Энергообъект</span>
            <strong>${escapeHtml(energyObject)}</strong>
          </div>
        ` : ""}
      </div>

      ${renderOutageObjects(event?.disconnectedObjects)}
    </article>
  `;
}

function renderOutageSource(source = {}) {
  const outages = Array.isArray(source?.outages) ? source.outages : [];
  const count = Number(source?.count || 0);
  const appeals = Number(source?.appeals || 0);
  const canOpen = Boolean(source?.matched) && outages.length > 0;

  return `
    <details class="outage-source-details ${source?.matched ? "" : "is-missing"}">
      <summary ${canOpen ? "" : "data-no-toggle=\"true\""}>
        <div class="outage-source-summary-main">
          <span>${escapeHtml(source?.label || source?.source || "Источник")}</span>
          ${source?.matched ? "" : "<small>Строка не найдена в последней сводке</small>"}
        </div>
        <div class="outage-source-summary-metrics">
          <span><b>${count}</b> откл.</span>
          <span class="${appeals > 0 ? "has-appeals" : ""}"><b>${appeals}</b> обращ.</span>
          ${canOpen ? `
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>
          ` : ""}
        </div>
      </summary>
      ${canOpen ? `
        <div class="outage-events-list">
          ${outages.map((event) => renderOutageEvent(event)).join("")}
        </div>
      ` : ""}
    </details>
  `;
}

function renderDivisionCards(divisions = []) {
  const items = Array.isArray(divisions) ? divisions : [];

  divisionCountCaption.textContent =
    `${items.length} ${pluralizeRu(
      items.length,
      "подразделение",
      "подразделения",
      "подразделений"
    )}`;

  if (!items.length) {
    divisionGrid.innerHTML = `
      <div class="monitoring-loading-card">
        Подразделения аварийного мониторинга пока не настроены.
      </div>
    `;
    return;
  }

  divisionGrid.innerHTML = items.map((division) => {
    const breakdown = Array.isArray(division?.sourceBreakdown)
      ? division.sourceBreakdown
      : [];
    const canExpand = breakdown.length > 0;
    const isExpanded = canExpand && expandedOutageDivisionIds.has(String(division.id));
    const appeals = Number(division?.appeals || 0);

    return `
      <article
        class="division-card outage-counter-card ${isExpanded ? "is-expanded" : ""}"
        id="card-${escapeHtml(division.id)}"
      >
        <div class="division-header outage-counter-header">
          <div class="division-main">
            <div class="division-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2 4 14h7l-1 8 10-13h-7z"></path>
              </svg>
            </div>

            <div>
              <div class="division-kicker">ПОДРАЗДЕЛЕНИЕ</div>
              <h2>${escapeHtml(division.name)}</h2>
              <p>Активные аварийные отключения</p>
            </div>
          </div>

          <div class="division-actions outage-counter-actions">
            <div class="outage-counter-metrics">
              <div class="counter outage-counter-value">
                <span>Отключений</span>
                <strong class="division-count">${Number(division.count || 0)}</strong>
              </div>
              <div class="counter outage-counter-value outage-appeals-value ${appeals > 0 ? "has-appeals" : ""}">
                <span>Обращений</span>
                <strong>${appeals}</strong>
              </div>
            </div>

            ${canExpand ? `
              <button
                class="outage-sources-toggle"
                type="button"
                data-outage-sources-toggle="${escapeHtml(division.id)}"
                aria-expanded="${isExpanded ? "true" : "false"}"
                aria-controls="outage-sources-${escapeHtml(division.id)}"
                title="Показать РЭС и отключения"
              >
                <span>${isExpanded ? "Скрыть детали" : `Подробнее · ${breakdown.length} ${pluralizeRu(breakdown.length, "РЭС", "РЭС", "РЭС")}`}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" class="${isExpanded ? "is-open" : ""}">
                  <path d="m7 10 5 5 5-5"></path>
                </svg>
              </button>
            ` : ""}
          </div>
        </div>

        ${canExpand ? `
          <div
            id="outage-sources-${escapeHtml(division.id)}"
            class="outage-sources-breakdown outage-sources-detailed"
            ${isExpanded ? "" : "hidden"}
          >
            <div class="outage-breakdown-head">
              <div>
                <span>ДЕТАЛИЗАЦИЯ</span>
                <strong>РЭС / районы и активные отключения</strong>
              </div>
              <div>
                <span>${Number(division.count || 0)} отключений</span>
                <span>${appeals} обращений</span>
              </div>
            </div>
            ${breakdown.map((source) => renderOutageSource(source)).join("")}
          </div>
        ` : ""}
      </article>
    `;
  }).join("");

  divisionGrid
    .querySelectorAll("[data-outage-sources-toggle]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const divisionId = String(button.dataset.outageSourcesToggle || "");
        if (!divisionId) return;

        if (expandedOutageDivisionIds.has(divisionId)) {
          expandedOutageDivisionIds.delete(divisionId);
        } else {
          expandedOutageDivisionIds.add(divisionId);
        }

        renderDivisionCards(items);
      });
    });

  divisionGrid
    .querySelectorAll('.outage-source-details > summary[data-no-toggle="true"]')
    .forEach((summary) => {
      summary.addEventListener("click", (event) => event.preventDefault());
    });
}

function pluralizeRu(
  value,
  one,
  few,
  many
) {
  const number = Math.abs(Number(value || 0));
  const lastTwo = number % 100;
  const last = number % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return many;
  }

  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function renderOutageLoadError(message) {
  dashboardStatus.textContent =
    message || "Данные недоступны";

  totalOutages.textContent = "—";

  if (!divisionGrid.children.length) {
    divisionGrid.innerHTML = `
      <div class="monitoring-loading-card is-error">
        ${escapeHtml(message || "Не удалось получить аварийные отключения.")}
      </div>
    `;
  }
}

async function loadAllDivisions() {
  const version = ++loadVersion;

  dashboardStatus.textContent =
    "Обновление сводки СК-11 OMS";

  const initData = getMaxInitData();

  if (!initData) {
    renderOutageLoadError(
      "Откройте мини-приложение внутри MAX."
    );
    return;
  }

  const sessionToken = getAppSessionToken();

  try {
    const response = await fetch(
      API_OUTAGES,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          "X-Max-Init-Data": initData,
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

    if (response.status === 401) {
      setAppSessionToken("");
      stopAutoRefresh();
      showLoginScreen();

      throw new Error(
        "Сессия завершена. Авторизуйтесь снова."
      );
    }

    const payload = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        `Сервер вернул ошибку ${response.status}`
      );
    }

    if (version !== loadVersion) return;

    const divisions =
      Array.isArray(payload?.divisions)
        ? payload.divisions
        : [];

    renderDivisionCards(divisions);

    totalOutages.textContent =
      payload?.total === null ||
      payload?.total === undefined
        ? "—"
        : Number(payload.total || 0);

    if (payload?.status === "ok") {
      dashboardStatus.textContent =
        "Все подразделения обновлены";
    } else if (payload?.stale) {
      dashboardStatus.textContent =
        "Показаны последние сохранённые данные";
    } else {
      dashboardStatus.textContent =
        payload?.message ||
        "Сводка пока недоступна";
    }

    if (payload?.sourceUpdatedAt) {
      updatedAt.textContent =
        `СК-11 обновлено ${payload.sourceUpdatedAt}`;
    } else {
      const now = new Date();
      updatedAt.textContent =
        `Проверено ${now.toLocaleTimeString(
          "ru-RU",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )}`;
    }
  } catch (error) {
    if (version !== loadVersion) return;

    renderOutageLoadError(
      error instanceof Error
        ? error.message
        : "Ошибка загрузки аварийных отключений"
    );
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer = setInterval(
    () => {
      if (currentView === "monitoring") {
        loadAllDivisions();
      }
    },
    REFRESH_INTERVAL_MS
  );
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

checkSession();


document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      managementModal.classList.contains(
        "is-open"
      )
    ) {
      closeManagementEditor();
    }
  }
);
