/* =========================================================
   MAX MINI APP — ВЭС / аварийные отключения

   Этот файл НЕ содержит токен бота и chat_id.
   Они хранятся только на серверной стороне (Vercel Environment Variables).

   Схема:
   MAX Mini App -> /api/ves -> MAX Bot API -> чат ВЭС
   ========================================================= */

const API_URL = "/api/ves";
const REFRESH_INTERVAL_MS = 60_000;

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

function setVesOpen(open) {
  vesCard.classList.toggle("is-open", open);
  vesToggle.setAttribute("aria-expanded", String(open));
}

vesToggle.addEventListener("click", () => {
  setVesOpen(!vesCard.classList.contains("is-open"));
});

openVes.addEventListener("click", () => {
  setVesOpen(true);

  window.setTimeout(() => {
    vesCard.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 50);
});

function getMaxInitData() {
  try {
    return window.WebApp?.initData || "";
  } catch {
    return "";
  }
}

function renderLoading() {
  vesDescription.textContent = "Получаем данные из чата ВЭС…";
  updatedAt.textContent = "Обновление…";
}

function renderError(message) {
  totalOutages.textContent = "—";
  vesCount.textContent = "—";

  vesDescription.textContent = message || "Не удалось загрузить данные";

  outageList.innerHTML = `
    <div class="empty-state" style="display:block">
      <div class="empty-icon" style="color:#ff7b84;background:rgba(255,90,102,.09)">!</div>
      <h3>Данные недоступны</h3>
      <p>${escapeHtml(message || "Попробуйте обновить приложение позже.")}</p>
    </div>
  `;

  emptyState.hidden = true;
  updatedAt.textContent = "Ошибка обновления";
}

function renderOutages(payload) {
  const outages = Array.isArray(payload.outages) ? payload.outages : [];
  const count = Number(payload.count ?? outages.length);

  totalOutages.textContent = count;
  vesCount.textContent = count;

  vesDescription.textContent = count
    ? `Активных объектов: ${count}`
    : "Сеть работает без зарегистрированных аварийных отключений";

  outageList.innerHTML = "";
  emptyState.hidden = count !== 0;

  for (const outage of outages) {
    const { date, time } = splitDateTime(outage.eventTime);

    const item = document.createElement("article");
    item.className = "outage-item";

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

    const summary = item.querySelector(".outage-summary");

    summary.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      item.classList.toggle("is-open", willOpen);
      summary.setAttribute("aria-expanded", String(willOpen));
    });

    outageList.appendChild(item);
  }

  const updated = payload.updatedAt
    ? new Date(payload.updatedAt)
    : new Date();

  updatedAt.textContent =
    `Обновлено ${updated.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;

  if (payload.historyLimited) {
    vesDescription.textContent += " · история ограничена";
  }
}

async function loadOutages() {
  if (isLoading) return;

  isLoading = true;
  renderLoading();

  try {
    const initData = getMaxInitData();

    if (!initData) {
      throw new Error(
        "Откройте мини-приложение внутри MAX. В обычном браузере защищённые данные не загружаются."
      );
    }

    const response = await fetch(API_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Max-Init-Data": initData
      }
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        `Сервер вернул ошибку ${response.status}`
      );
    }

    renderOutages(payload);
  } catch (error) {
    console.error(error);
    renderError(error.message);
  } finally {
    isLoading = false;
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(loadOutages, REFRESH_INTERVAL_MS);
}

/* MAX Bridge создаёт window.WebApp при запуске внутри MAX. */
loadOutages();
startAutoRefresh();
