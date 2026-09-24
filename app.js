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
const API_ADMIN_ACCESS = "/api/admin/access";
const API_ADMIN_ROLES = "/api/admin/roles";
const API_ADMIN_USER_ROLES = "/api/admin/user-roles";
const API_ADMIN_DISPATCHER_CONFIG = "/api/admin/dispatcher-config";

const REFRESH_INTERVAL_MS = 120_000;
const HEARTBEAT_INTERVAL_MS = 45_000;
const ADMIN_REFRESH_INTERVAL_MS = 30_000;
const DISPATCHER_REFRESH_INTERVAL_MS = 20_000;
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
const dispatcherView = document.getElementById("dispatcherView");
const adminView = document.getElementById("adminView");

const openMonitoringButton = document.getElementById("openMonitoringButton");
const openDispatcherButton = document.getElementById("openDispatcherButton");
const openAdminButton = document.getElementById("openAdminButton");
const dispatcherCardStatus = document.getElementById("dispatcherCardStatus");
const moduleCount = document.getElementById("moduleCount");
const backToMenuButton = document.getElementById("backToMenuButton");
const backFromDispatcherButton = document.getElementById("backFromDispatcherButton");
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
const dispatcherLiveBadge = document.getElementById("dispatcherLiveBadge");
const dispatcherReqReview = document.getElementById("dispatcherReqReview");
const dispatcherReqApproved = document.getElementById("dispatcherReqApproved");
const dispatcherReqOpen = document.getElementById("dispatcherReqOpen");
const dispatcherReqClosed = document.getElementById("dispatcherReqClosed");
const dispatcherReqAcknowledged = document.getElementById("dispatcherReqAcknowledged");
const dispatcherReqTotal = document.getElementById("dispatcherReqTotal");

const dispatcherSourceManagementPanel = document.getElementById("dispatcherSourceManagementPanel");
const dispatcherConfigGroupSelect = document.getElementById("dispatcherConfigGroupSelect");
const dispatcherConfigStatus = document.getElementById("dispatcherConfigStatus");
const dispatcherConfigList = document.getElementById("dispatcherConfigList");

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
let loadVersion = 0;
let divisionCardsRendered = false;
let selectedSystemMode = "normal";
let selectedDispatcherGroupId = "";
let selectedDispatcherUnitId = "";

let accessCatalog = {
  panels: [],
  roles: [],
  users: [],
  dispatcherDivisions: []
};

let dispatcherConfigCatalog = {
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
    panelIds:
      Array.isArray(
        user?.panelIds
      )
        ? [...user.panelIds]
        : (
            user?.isDeveloper
              ? [
                  "monitoring",
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

  openAdminButton.hidden =
    !hasPanelAccess(
      "system-control"
    );

  const visibleModules =
    2 +
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

  currentUser = null;
  currentView = "home";

  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  authScreen.classList.remove("is-leaving");

  homeView.classList.add("is-active");
  monitoringView.classList.remove("is-active");
  dispatcherView.classList.remove("is-active");
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

  if (!divisionCardsRendered) {
    renderDivisionCards();
    divisionCardsRendered = true;
  }

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

  dispatcherReqReview.textContent =
    payload?.requests?.review ?? 0;
  dispatcherReqApproved.textContent =
    payload?.requests?.approved ?? 0;
  dispatcherReqOpen.textContent =
    payload?.requests?.open ?? 0;
  dispatcherReqClosed.textContent =
    payload?.requests?.closed ?? 0;
  dispatcherReqAcknowledged.textContent =
    payload?.requests?.acknowledged ?? 0;
  dispatcherReqTotal.textContent =
    payload?.requests?.total ?? 0;

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

  dispatcherUpdatedAt.textContent =
    sourceData.sourceUpdatedAt
      ? `СК-11 обновлён ${sourceData.sourceUpdatedAt}`
      : payload?.updatedAt
        ? `Проверено ${formatDateTime(payload.updatedAt)}`
        : "Интерфейс готов";
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

backFromDispatcherButton.addEventListener(
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
  navigateDispatcher
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

        const roleNames =
          Array.isArray(
            user.roleNames
          ) &&
          user.roleNames.length
            ? user.roleNames
            : [
                userRoleText(user)
              ];

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
              ${roleNames
                .map(
                  (roleName) => `
                    <span class="session-role">
                      ${escapeHtml(
                        roleName
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

  dispatcherSourceManagementPanel.hidden =
    !Boolean(
      payload.canManageRoles
    );

  if (
    payload.canManageRoles
  ) {
    loadAccessManagement();
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

          ${
            role.builtin
              ? ""
              : `
                <div class="role-card-actions">
                  <button
                    class="role-action"
                    type="button"
                    data-edit-role="${
                      role.id
                    }"
                  >
                    Изменить
                  </button>

                  <button
                    class="role-action is-danger"
                    type="button"
                    data-delete-role="${
                      role.id
                    }"
                  >
                    Удалить
                  </button>
                </div>
              `
          }
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

  if (!units.length) {
    dispatcherConfigList.innerHTML = `
      <div class="access-empty">
        Для выбранного подразделения РЭС/районы не настроены.
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
                ${unit.customized ? "ИЗМЕНЕНО" : "ПО УМОЛЧАНИЮ"}
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

            <button
              class="role-action dispatcher-config-edit"
              type="button"
              data-dispatcher-unit="${escapeHtml(unit.id)}"
            >
              Настроить источники
            </button>
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
}

function renderDispatcherConfigGroups() {
  const groups =
    dispatcherConfigCatalog.groups || [];

  const oldValue =
    dispatcherConfigGroupSelect.value;

  dispatcherConfigGroupSelect.innerHTML =
    groups.map(
      (group) => `
        <option value="${escapeHtml(group.id)}">
          ${escapeHtml(group.name)} — ${escapeHtml(group.description || "")}
        </option>
      `
    ).join("");

  if (
    groups.some(
      (group) =>
        group.id === oldValue
    )
  ) {
    dispatcherConfigGroupSelect.value =
      oldValue;
  }

  renderDispatcherConfigList();
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
        ? `Настройки сохраняются в Redis. Одна строка источника = одна строка из сообщения СК-11.${sourceSuffix}`
        : `Redis не подключён: отображаются только настройки по умолчанию, изменения сохранить нельзя.${sourceSuffix}`;

    dispatcherConfigStatus.classList.toggle(
      "is-warning",
      !dispatcherConfigCatalog.storageConfigured
    );

    renderDispatcherConfigGroups();
  } catch (error) {
    dispatcherConfigStatus.textContent =
      error instanceof Error
        ? error.message
        : "Ошибка загрузки источников";

    dispatcherConfigStatus.classList.add(
      "is-warning"
    );

    dispatcherConfigList.innerHTML = "";
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
  context
}) {
  managementEyebrow.textContent =
    eyebrow;

  managementTitle.textContent =
    title;

  managementBody.innerHTML =
    bodyHtml;

  managementContext =
    context;

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
                <strong>
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
    `
  });
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
        "Сохранить";
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

createRoleButton.addEventListener(
  "click",
  () =>
    openRoleEditor()
);

dispatcherConfigGroupSelect.addEventListener(
  "change",
  renderDispatcherConfigList
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
