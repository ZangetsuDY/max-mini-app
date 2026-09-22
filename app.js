/* =========================================================
   MAX MINI APP — все подразделения
   ========================================================= */

const API_LOGIN = "/api/login";
const API_LOGOUT = "/api/logout";
const API_ME = "/api/me";
const API_OUTAGES = "/api/outages";
const REFRESH_INTERVAL_MS = 120_000;

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
const logoutButton = document.getElementById("logoutButton");
const divisionGrid = document.getElementById("divisionGrid");
const totalOutages = document.getElementById("totalOutages");
const updatedAt = document.getElementById("updatedAt");
const dashboardStatus = document.getElementById("dashboardStatus");

let refreshTimer = null;
let loadVersion = 0;

const SESSION_STORAGE_KEY = "le_app_session";

function getAppSessionToken() {
  try {
    return sessionStorage.getItem(
      SESSION_STORAGE_KEY
    ) || "";
  } catch {
    return "";
  }
}

function setAppSessionToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        token
      );
    } else {
      sessionStorage.removeItem(
        SESSION_STORAGE_KEY
      );
    }
  } catch {}
}

function getMaxInitData() {
  try { return window.WebApp?.initData || ""; }
  catch { return ""; }
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
  const [date = "", time = ""] = String(value || "").split(/\s+/);
  return { date, time };
}

function showLoginError(message) {
  loginError.textContent = message || "Ошибка авторизации";
  loginError.hidden = false;
}

function clearLoginError() {
  loginError.hidden = true;
  loginError.textContent = "";
}

function showLoginScreen() {
  stopAutoRefresh();
  document.body.classList.remove("authenticated");
  document.body.classList.add("auth-pending");
  authScreen.classList.remove("is-leaving");
  setTimeout(() => usernameInput?.focus(), 700);
}

function showApplication(user) {
  userFullName.textContent = user?.fullName || "Пользователь";
  document.body.classList.add("authenticated");
  document.body.classList.remove("auth-pending");
  authScreen.classList.add("is-leaving");
  clearLoginError();
  renderDivisionCards();
  setTimeout(() => {
    loadAllDivisions();
    startAutoRefresh();
  }, 250);
}

async function checkSession() {
  try {
    const sessionToken =
      getAppSessionToken();

    const response = await fetch(API_ME, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: sessionToken
        ? { "X-App-Session": sessionToken }
        : {}
    });
    if (!response.ok) {
      setAppSessionToken("");
      return showLoginScreen();
    }
    const payload = await response.json();
    if (payload?.authenticated && payload?.user) return showApplication(payload.user);
    showLoginScreen();
  } catch { showLoginScreen(); }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearLoginError();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) return showLoginError("Введите логин и пароль");
  const initData = getMaxInitData();
  if (!initData) return showLoginError("Авторизация доступна только внутри мини-приложения MAX.");

  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = "Проверка…";
  try {
    const response = await fetch(API_LOGIN, {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Max-Init-Data": initData },
      body: JSON.stringify({ username, password })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Не удалось выполнить вход");
    setAppSessionToken(
      payload?.sessionToken || ""
    );

    passwordInput.value = "";
    showApplication(payload.user);
  } catch (error) {
    showLoginError(error instanceof Error ? error.message : "Ошибка авторизации");
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = "Войти";
  }
});

togglePassword.addEventListener("click", () => {
  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";
  togglePassword.setAttribute("aria-label", hidden ? "Скрыть пароль" : "Показать пароль");
});

logoutButton.addEventListener("click", async () => {
  stopAutoRefresh();
  try {
    await fetch(API_LOGOUT, {
      method: "POST",
      cache: "no-store",
      credentials: "include"
    });
  } finally {
    setAppSessionToken("");
    usernameInput.value = "";
    passwordInput.value = "";
    showLoginScreen();
  }
});

function renderDivisionCards() {
  divisionGrid.innerHTML = DIVISIONS.map((division) => `
    <article class="division-card glass" id="card-${division.id}">
      <button class="division-header" type="button" aria-expanded="false">
        <div class="division-main">
          <div class="division-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 5.5 13.1h5.3L9.9 22l8.6-12.2h-5.6L13.2 2Z"></path></svg>
          </div>
          <div>
            <div class="division-kicker">ПОДРАЗДЕЛЕНИЕ</div>
            <h2>${escapeHtml(division.name)}</h2>
            <p>Аварийные отключения 6–20 кВ</p>
          </div>
        </div>
        <div class="division-actions">
          <div class="counter"><span>Отключений</span><strong class="division-count">—</strong></div>
          <span class="chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"></path></svg></span>
        </div>
      </button>
      <div class="division-body">
        <div class="section-heading">
          <div><h3>Текущие отключения</h3><p class="division-description">Загрузка данных…</p></div>
          <div class="live-badge loading"><span></span><b>LOAD</b></div>
        </div>
        <div class="outage-list"></div>
        <div class="empty-state" hidden>
          <div class="empty-icon">✓</div>
          <h3>Активных отключений нет</h3>
          <p>Все зарегистрированные объекты находятся во включённом состоянии.</p>
        </div>
      </div>
    </article>
  `).join("");

  divisionGrid.querySelectorAll(".division-card").forEach((card) => {
    const header = card.querySelector(".division-header");
    header.addEventListener("click", () => {
      const willOpen = !card.classList.contains("is-open");
      card.classList.toggle("is-open", willOpen);
      header.setAttribute("aria-expanded", String(willOpen));
    });
  });
}

function setBadge(card, type, text) {
  const badge = card.querySelector(".live-badge");
  badge.className = `live-badge ${type || ""}`.trim();
  badge.querySelector("b").textContent = text;
}

function renderDivisionLoading(division) {
  const card = document.getElementById(`card-${division.id}`);
  if (!card) return;
  card.querySelector(".division-description").textContent = "Получаем данные из чата…";
  setBadge(card, "loading", "LOAD");
}

function renderDivisionError(division, message) {
  const card = document.getElementById(`card-${division.id}`);
  if (!card) return;
  card.querySelector(".division-count").textContent = "—";
  card.querySelector(".division-description").textContent = message || "Данные недоступны";
  card.querySelector(".outage-list").innerHTML = `
    <div class="empty-state" style="display:block">
      <div class="empty-icon" style="color:#ff7b84;background:rgba(255,90,102,.09)">!</div>
      <h3>Данные недоступны</h3>
      <p>${escapeHtml(message || "Не удалось получить данные.")}</p>
    </div>`;
  card.querySelector(".empty-state:not(.outage-list .empty-state)")?.setAttribute("hidden", "");
  setBadge(card, "error", "ERR");
}

function renderDivisionData(division, payload) {
  const card = document.getElementById(`card-${division.id}`);
  if (!card) return;
  const outages = Array.isArray(payload.outages) ? payload.outages : [];
  const count = Number(payload.count ?? outages.length);
  card.querySelector(".division-count").textContent = count;
  card.querySelector(".division-description").textContent = count ? `Активных объектов: ${count}` : "Активных отключений нет";
  const list = card.querySelector(".outage-list");
  const empty = card.querySelector(".division-body > .empty-state");
  list.innerHTML = "";
  empty.hidden = count !== 0;
  setBadge(card, "", "LIVE");

  for (const outage of outages) {
    const { date, time } = splitDateTime(outage.eventTime);
    const item = document.createElement("article");
    item.className = "outage-item";
    item.innerHTML = `
      <button class="outage-summary" type="button" aria-expanded="false">
        <div class="outage-object"><span class="alert-dot"></span><div>
          <span class="object-name">${escapeHtml(outage.object)}</span>
          <span class="object-author">${escapeHtml(outage.author)}</span>
        </div></div>
        <div class="outage-time"><strong>${escapeHtml(time)}</strong><span>${escapeHtml(date)}</span></div>
        <span class="item-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"></path></svg></span>
      </button>
      <div class="outage-details"><div class="details-panel">
        <div class="detail-grid">
          <div class="detail"><span>Отключено</span><strong>${escapeHtml(outage.eventTime)}</strong></div>
          <div class="detail"><span>Добавлено</span><strong>${escapeHtml(outage.addedTime || "—")}</strong></div>
          <div class="detail"><span>Записал</span><strong>${escapeHtml(outage.author || "—")}</strong></div>
          <div class="detail"><span>Должность</span><strong>${escapeHtml(outage.role || "—")}</strong></div>
        </div>
        <div class="record-block"><span>Запись</span><p>${escapeHtml(outage.record || "—")}</p></div>
      </div></div>`;
    const summary = item.querySelector(".outage-summary");
    summary.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      item.classList.toggle("is-open", willOpen);
      summary.setAttribute("aria-expanded", String(willOpen));
    });
    list.appendChild(item);
  }
}

async function loadDivision(division, version) {
  renderDivisionLoading(division);
  const initData = getMaxInitData();
  if (!initData) throw new Error("Откройте мини-приложение внутри MAX.");
  const sessionToken =
    getAppSessionToken();

  const response = await fetch(`${API_OUTAGES}?division=${encodeURIComponent(division.id)}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: {
      "X-Max-Init-Data": initData,
      ...(sessionToken
        ? { "X-App-Session": sessionToken }
        : {})
    }
  });
  if (response.status === 401) {
    setAppSessionToken("");
    stopAutoRefresh();
    showLoginScreen();
    throw new Error("Сессия завершена. Авторизуйтесь снова.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Сервер вернул ошибку ${response.status}`);
  if (version !== loadVersion) return null;
  renderDivisionData(division, payload);
  return Number(payload.count || 0);
}

async function loadAllDivisions() {
  const version = ++loadVersion;
  dashboardStatus.textContent = "Обновление данных";
  totalOutages.textContent = "—";

  const results = await Promise.allSettled(
    DIVISIONS.map(async (division) => {
      try { return await loadDivision(division, version); }
      catch (error) {
        if (version === loadVersion && document.body.classList.contains("authenticated")) {
          renderDivisionError(division, error instanceof Error ? error.message : "Ошибка загрузки");
        }
        throw error;
      }
    })
  );

  if (version !== loadVersion) return;
  let total = 0;
  let successful = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      successful += 1;
      total += Number(result.value || 0);
    }
  }
  totalOutages.textContent = total;
  dashboardStatus.textContent = successful === DIVISIONS.length
    ? "Все подразделения обновлены"
    : `Доступно ${successful} из ${DIVISIONS.length}`;
  const now = new Date();
  updatedAt.textContent = `Обновлено ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(loadAllDivisions, REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

checkSession();
