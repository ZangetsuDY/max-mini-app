const apiResult = document.getElementById("apiResult");
const bridgeResult = document.getElementById("bridgeResult");
const initDataResult = document.getElementById("initDataResult");
const report = document.getElementById("report");
const rerunButton = document.getElementById("rerunButton");
const copyButton = document.getElementById("copyButton");

const state = {
  startedAt: performance.now(),
  api: null,
  bridge: null,
  initData: null
};

function setResult(element, type, title, message) {
  element.className = `result ${type}`;
  element.innerHTML = `<b>${title}</b><span>${message}</span>`;
}

function connectionInfo() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return c ? {
    effectiveType: c.effectiveType || null,
    downlink: c.downlink ?? null,
    rtt: c.rtt ?? null,
    saveData: Boolean(c.saveData)
  } : null;
}

function buildReport() {
  const timing = performance.getEntriesByType("navigation")[0];
  const payload = {
    generatedAt: new Date().toISOString(),
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    platform: navigator.platform || null,
    language: navigator.language || null,
    online: navigator.onLine,
    connection: connectionInfo(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    },
    documentReadyState: document.readyState,
    navigation: timing ? {
      type: timing.type,
      responseStartMs: Math.round(timing.responseStart),
      domContentLoadedMs: Math.round(timing.domContentLoadedEventEnd),
      loadEventMs: Math.round(timing.loadEventEnd)
    } : null,
    tests: state
  };

  report.textContent = JSON.stringify(payload, null, 2);
  return payload;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function testApi() {
  setResult(apiResult, "pending", "Проверка…", "Запрашиваем /api/ping");
  const started = performance.now();

  try {
    const response = await fetchWithTimeout(`/api/ping?t=${Date.now()}`, 8000);
    const data = await response.json();
    const elapsed = Math.round(performance.now() - started);

    state.api = {
      ok: response.ok,
      status: response.status,
      elapsedMs: elapsed,
      response: data
    };

    setResult(
      apiResult,
      response.ok ? "ok" : "fail",
      response.ok ? `Успешно · ${elapsed} мс` : `HTTP ${response.status}`,
      response.ok
        ? "Serverless API Vercel отвечает с того же домена."
        : "Страница загрузилась, но API вернул ошибку."
    );
  } catch (error) {
    const elapsed = Math.round(performance.now() - started);
    state.api = {
      ok: false,
      elapsedMs: elapsed,
      error: error?.name === "AbortError" ? "timeout" : String(error)
    };
    setResult(
      apiResult,
      "fail",
      error?.name === "AbortError" ? "Таймаут API" : "Ошибка API",
      `Запрос не завершился за ${elapsed} мс.`
    );
  }
}

function removeBridgeScript() {
  document.querySelectorAll('script[data-diagnostic-bridge="1"]').forEach((node) => node.remove());
}

async function testBridge() {
  removeBridgeScript();
  delete window.WebApp;

  setResult(bridgeResult, "pending", "Проверка…", "Загружаем st.max.ru");
  setResult(initDataResult, "pending", "Ожидание…", "Проверим после загрузки Bridge");

  const started = performance.now();

  const bridge = await new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://st.max.ru/js/max-web-app.js?diag=${Date.now()}`;
    script.async = true;
    script.dataset.diagnosticBridge = "1";

    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };

    script.onload = () => finish({ ok: true });
    script.onerror = () => finish({ ok: false, error: "script_error" });

    const timer = setTimeout(() => {
      script.remove();
      finish({ ok: false, error: "timeout" });
    }, 10000);

    document.head.appendChild(script);
  });

  const elapsed = Math.round(performance.now() - started);

  state.bridge = {
    ...bridge,
    elapsedMs: elapsed,
    webAppObject: Boolean(window.WebApp)
  };

  if (bridge.ok && window.WebApp) {
    setResult(
      bridgeResult,
      "ok",
      `Bridge загружен · ${elapsed} мс`,
      "st.max.ru доступен из этого WebView, объект window.WebApp создан."
    );
  } else if (bridge.ok) {
    setResult(
      bridgeResult,
      "warn",
      `Скрипт загружен · ${elapsed} мс`,
      "Скрипт пришёл, но window.WebApp не появился."
    );
  } else {
    setResult(
      bridgeResult,
      "fail",
      bridge.error === "timeout" ? "Таймаут MAX Bridge" : "MAX Bridge не загрузился",
      bridge.error === "timeout"
        ? "st.max.ru не ответил за 10 секунд."
        : "WebView не смог загрузить скрипт MAX Bridge."
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  const initData = (() => {
    try {
      return window.WebApp?.initData || "";
    } catch {
      return "";
    }
  })();

  state.initData = {
    present: Boolean(initData),
    length: initData.length
  };

  if (initData) {
    setResult(
      initDataResult,
      "ok",
      `initData получен · ${initData.length} символов`,
      "MAX действительно открыл страницу как Mini App и передал данные запуска."
    );
  } else if (window.WebApp) {
    setResult(
      initDataResult,
      "warn",
      "window.WebApp есть, initData пустой",
      "Bridge доступен, но данные запуска Mini App не были переданы."
    );
  } else {
    setResult(
      initDataResult,
      "fail",
      "initData недоступен",
      "Без window.WebApp получить initData невозможно."
    );
  }
}

async function runAll() {
  rerunButton.disabled = true;
  rerunButton.textContent = "Проверка…";

  state.api = null;
  state.bridge = null;
  state.initData = null;

  buildReport();

  await Promise.allSettled([
    testApi(),
    testBridge()
  ]);

  buildReport();

  rerunButton.disabled = false;
  rerunButton.textContent = "Запустить проверки снова";
}

copyButton.addEventListener("click", async () => {
  const text = report.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Скопировано";
    setTimeout(() => copyButton.textContent = "Скопировать отчёт", 1500);
  } catch {
    window.prompt("Скопируйте отчёт:", text);
  }
});

rerunButton.addEventListener("click", runAll);

window.addEventListener("load", () => {
  buildReport();
  setTimeout(runAll, 100);
}, { once: true });
