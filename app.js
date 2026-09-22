/* =========================================================
   ДЕМО-ДАННЫЕ

   Сейчас Mini App работает БЕЗ сервера и БЕЗ токена MAX.
   Ниже находятся тестовые сообщения, которые имитируют чат ВЭС.

   Важная логика:
   - "Отключился" -> объект появляется в активных отключениях.
   - "Включил", "Включен", "РПВ успешно" -> объект удаляется.
   - состояние определяется по ПОСЛЕДНЕМУ сообщению об объекте.
   ========================================================= */

const demoMessages = [
  `
🏷 **Аварийное отключение фидера 6-20 кВ**

[👤](https://st.max.ru/emojis/1F464_32.webp)

Никифоров Андрей Евгеньевич (Диспетчер ОДГ Рощинского РЭС ВЭС) 🕐 **22.09.2026 07:11:04** *Добавлено: 22.09.2026 07:17:59*

[📍](https://st.max.ru/emojis/1F4CD_32.webp)

Объект: ф331-03 ✏ Запись: Отключился ф.331-03
  `,

  `
🏷 **Аварийное отключение фидера 6-20 кВ**

[👤](https://st.max.ru/emojis/1F464_32.webp)

Никифоров Андрей Евгеньевич (Диспетчер ОДГ Рощинского РЭС ВЭС) 🕐 **22.09.2026 07:12:15** *Добавлено: 22.09.2026 07:20:03*

[📍](https://st.max.ru/emojis/1F4CD_32.webp)

Объект: ф331-03 ✏ Запись: Включил по ТУ ф.331-03 РПВ успешно
  `,

  /* Два сообщения ниже добавлены только для демонстрации карточек интерфейса. */
  `
🏷 **Аварийное отключение фидера 6-20 кВ**

👤 Демо диспетчер ВЭС (Диспетчер ОДГ ВЭС) 🕐 **22.09.2026 08:03:41** *Добавлено: 22.09.2026 08:04:12*

📍 Объект: ф208-04 ✏ Запись: Отключился ф.208-04. АПВ неуспешно.
  `,

  `
🏷 **Аварийное отключение фидера 6-20 кВ**

👤 Демо диспетчер ВЭС (Диспетчер ОДГ ВЭС) 🕐 **22.09.2026 08:26:18** *Добавлено: 22.09.2026 08:27:02*

📍 Объект: ф115-02 ✏ Запись: Отключился ф.115-02, причина уточняется.
  `
];

/* =========================================================
   ПАРСЕР СООБЩЕНИЙ
   ========================================================= */

function cleanMaxMarkdown(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\r/g, "")
    .trim();
}

function normalizeObjectName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, "")
    .replace(/\./g, "");
}

function getRecordState(record) {
  const value = String(record || "").toLowerCase().replace(/ё/g, "е");

  // Проверяем восстановление раньше отключения.
  if (
    value.includes("включил") ||
    value.includes("включен") ||
    value.includes("включена") ||
    value.includes("включено") ||
    value.includes("рпв успешно")
  ) {
    return "enabled";
  }

  if (
    value.includes("отключился") ||
    value.includes("отключилась") ||
    value.includes("отключено") ||
    value.includes("отключен") ||
    value.includes("отключена")
  ) {
    return "disabled";
  }

  return "unknown";
}

function parseRussianDate(value) {
  const match = String(value || "").match(
    /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/
  );

  if (!match) {
    return new Date(0);
  }

  const [, day, month, year, hour, minute, second] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function parseEmergencyMessage(rawText) {
  const text = cleanMaxMarkdown(rawText);

  if (!text.includes("Аварийное отключение фидера 6-20 кВ")) {
    return null;
  }

  const objectMatch = text.match(/Объект:\s*(.*?)\s*✏\s*Запись:/i);
  const recordMatch = text.match(/Запись:\s*([\s\S]*)$/i);

  const authorTimeMatch = text.match(
    /👤\s*([\s\S]*?)\s*🕐\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i
  );

  const addedMatch = text.match(
    /Добавлено:\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i
  );

  if (!objectMatch || !recordMatch || !authorTimeMatch) {
    console.warn("Не удалось разобрать сообщение:", rawText);
    return null;
  }

  const authorFull = authorTimeMatch[1].trim();
  const authorParts = authorFull.match(/^(.*?)\s*\((.*?)\)\s*$/);

  const author = authorParts ? authorParts[1].trim() : authorFull;
  const role = authorParts ? authorParts[2].trim() : "";
  const object = objectMatch[1].trim();
  const record = recordMatch[1].trim();
  const eventTime = authorTimeMatch[2].trim();
  const addedTime = addedMatch ? addedMatch[1].trim() : "";

  return {
    object,
    objectKey: normalizeObjectName(object),
    eventTime,
    addedTime,
    timestamp: parseRussianDate(eventTime).getTime(),
    author,
    role,
    record,
    state: getRecordState(record)
  };
}

/* =========================================================
   РАСЧЁТ ТЕКУЩИХ ОТКЛЮЧЕНИЙ
   ========================================================= */

function calculateActiveOutages(rawMessages) {
  const parsed = rawMessages
    .map(parseEmergencyMessage)
    .filter(Boolean)
    .filter(item => item.state !== "unknown")
    .sort((a, b) => a.timestamp - b.timestamp);

  const currentState = new Map();

  for (const message of parsed) {
    if (message.state === "disabled") {
      currentState.set(message.objectKey, message);
      continue;
    }

    if (message.state === "enabled") {
      currentState.delete(message.objectKey);
    }
  }

  return [...currentState.values()].sort((a, b) => b.timestamp - a.timestamp);
}

/* =========================================================
   ОТОБРАЖЕНИЕ
   ========================================================= */

const vesCard = document.getElementById("vesCard");
const vesToggle = document.getElementById("vesToggle");
const openVes = document.getElementById("openVes");

const totalOutages = document.getElementById("totalOutages");
const vesCount = document.getElementById("vesCount");
const vesDescription = document.getElementById("vesDescription");
const outageList = document.getElementById("outageList");
const emptyState = document.getElementById("emptyState");
const updatedAt = document.getElementById("updatedAt");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitDateTime(value) {
  const [date = "", time = ""] = String(value || "").split(/\s+/);

  return {
    date,
    time
  };
}

function renderOutages(outages) {
  const count = outages.length;

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
              <strong>${escapeHtml(outage.author)}</strong>
            </div>

            <div class="detail">
              <span>Должность</span>
              <strong>${escapeHtml(outage.role || "—")}</strong>
            </div>
          </div>

          <div class="record-block">
            <span>Запись</span>
            <p>${escapeHtml(outage.record)}</p>
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

  const now = new Date();

  updatedAt.textContent =
    `Обновлено ${now.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
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

/* =========================================================
   ЗАПУСК ДЕМО
   ========================================================= */

const activeOutages = calculateActiveOutages(demoMessages);
renderOutages(activeOutages);

/*
  Проверка логики на примере пользователя:

  07:11:04 — ф331-03 отключился -> добавлен.
  07:12:15 — ф331-03 включён, РПВ успешно -> удалён.

  Поэтому ф331-03 в интерфейсе НЕ отображается.

  Следующим этапом вместо demoMessages можно будет получать
  реальные сообщения с backend API, например:

  const response = await fetch("https://your-api.example.com/api/ves/outages");
  const outages = await response.json();
  renderOutages(outages);
*/
