/*
  Демонстрационный режим мини-приложения.

  Включается, только если страница открыта с диска (file:///…/index.html)
  или по адресу с параметром ?demo=1. В обычной работе файл ничего не делает.

  Подменяет ответы сервера (/api/…) вымышленными данными прямо в браузере:
  сервер, интернет и MAX не нужны. Вход: логин test, пароль test.
  Все филиалы, отключения, заявки, наряды, люди и сообщения — выдуманы.
*/
(function () {
  "use strict";
  const enabled = location.protocol === "file:" || new URLSearchParams(location.search).has("demo");
  if (!enabled) return;
  window.LE_DEMO_MODE = true;

  const DEMO_EXCEL_CONFIG = {"version":1,"name":"Аварийные отключения","sheetName":"Аварийные отключения","fileName":"Аварийные_отключения","title":"Аварийные отключения","subtitle":"Оперативная выгрузка СК-11 OMS","tableStartRow":5,"showGeneratedAt":true,"showSourceUpdatedAt":true,"freezeHeader":true,"autoFilter":true,"includeDivisionIds":[],"titleStyle":{"fontSize":16,"bold":true,"color":"#FFFFFF","fill":"#12334A","align":"left","rowHeight":28},"headerStyle":{"fontSize":10,"bold":true,"color":"#15100A","fill":"#D6A446","align":"center","rowHeight":24},"bodyStyle":{"fontSize":10,"color":"#17212B","fill":"#FFFFFF","alternateFill":"#F3F7F9","rowHeight":24},"columns":[{"id":"col-index","field":"index","label":"№ п/п","width":8,"align":"center","fontSize":10,"bold":false,"wrap":false,"autoWidth":false,"autoHeight":false},{"id":"col-division","field":"divisionName","label":"Подразделение","width":20,"align":"left","fontSize":10,"bold":true,"wrap":true,"autoWidth":false,"autoHeight":false},{"id":"col-source","field":"sourceLabel","label":"Роль / источник","width":32,"align":"left","fontSize":10,"bold":false,"wrap":true,"autoWidth":false,"autoHeight":false},{"id":"col-outage","field":"outageId","label":"№ отключения","width":14,"align":"center","fontSize":10,"bold":true,"wrap":false,"autoWidth":false,"autoHeight":false},{"id":"col-created","field":"createdAt","label":"Создано","width":20,"align":"center","fontSize":10,"bold":false,"wrap":true,"autoWidth":false,"autoHeight":false},{"id":"col-equipment","field":"equipment","label":"Оборудование","width":28,"align":"left","fontSize":10,"bold":false,"wrap":true,"autoWidth":false,"autoHeight":false},{"id":"col-energy","field":"energyObject","label":"Энергообъект","width":28,"align":"left","fontSize":10,"bold":false,"wrap":true,"autoWidth":false,"autoHeight":false},{"id":"col-objects","field":"disconnectedObjects","label":"Обесточенные объекты","width":38,"align":"left","fontSize":10,"bold":false,"wrap":true,"autoWidth":false,"autoHeight":false},{"id":"col-appeals","field":"appeals","label":"Обращения","width":12,"align":"center","fontSize":10,"bold":true,"wrap":false,"autoWidth":false,"autoHeight":false}]};
  const DEMO_EXCEL_FIELDS = [{"id":"pending","name":"Пока не указан","type":"text"},{"id":"index","name":"№ п/п","type":"number"},{"id":"divisionName","name":"Подразделение","type":"text"},{"id":"sourceLabel","name":"Роль / источник","type":"text"},{"id":"outageId","name":"№ отключения","type":"text"},{"id":"createdAt","name":"Дата и время создания","type":"text"},{"id":"createdBy","name":"Создал","type":"text"},{"id":"equipment","name":"Оборудование","type":"text"},{"id":"energyObject","name":"Энергообъект","type":"text"},{"id":"disconnectedObjects","name":"Обесточенные объекты","type":"text"},{"id":"appeals","name":"Обращения","type":"number"}];
  const DEMO_GROUPS = [{"id":"ves","name":"ВЭС","description":"Выборгские электрические сети"},{"id":"gtes","name":"ГтЭС","description":"Гатчинские электрические сети"},{"id":"knes","name":"КнЭС","description":"Кингисеппские электрические сети"},{"id":"ks","name":"КС","description":"Кабельная сеть Санкт-Петербурга"},{"id":"nles","name":"НлЭС","description":"Новоладожские электрические сети"},{"id":"ses","name":"СЭС","description":"Северные электрические сети"},{"id":"thes","name":"ТхЭС","description":"Тихвинские электрические сети"},{"id":"yues","name":"ЮЭС","description":"Южные электрические сети"},{"id":"os","name":"ОС","description":"Оперативная служба"}];
  const DEMO_UNITS = [{"id":"ves-vyborg","groupId":"ves","name":"Выборгский","sources":["Выборгский РЭС"]},{"id":"ves-priozersk","groupId":"ves","name":"Приозерский","sources":["Приозерский РЭС"]},{"id":"ves-roshchino","groupId":"ves","name":"Рощинский","sources":["Рощинский РЭС"]},{"id":"ves-sosnovo","groupId":"ves","name":"Сосновский","sources":["Сосновский РЭС"]},{"id":"gtes-gatchina","groupId":"gtes","name":"Гатчинский","sources":["Гатчинский РЭС"]},{"id":"gtes-lomonosov","groupId":"gtes","name":"Ломоносовский","sources":["Ломоносовский РЭС"]},{"id":"gtes-tosno","groupId":"gtes","name":"Тосненский","sources":["Тосненский РЭС"]},{"id":"knes-kingisepp","groupId":"knes","name":"Кингисеппский","sources":["Кингисеппский РЭС","Лужский РЭС"]},{"id":"ks-east","groupId":"ks","name":"Восточный","sources":["Восточный район"]},{"id":"ks-west","groupId":"ks","name":"Западный район","sources":["Западный район"]},{"id":"ks-nevsky","groupId":"ks","name":"Невский район","sources":["Невский район"]},{"id":"ks-island","groupId":"ks","name":"Островной район","sources":["Островной район"]},{"id":"ks-right-bank","groupId":"ks","name":"Правобережный район","sources":["Правобережный район"]},{"id":"ks-north","groupId":"ks","name":"Северный район","sources":["Северный район"]},{"id":"ks-central","groupId":"ks","name":"Центральный район","sources":["Центральный район"]},{"id":"ks-southwest","groupId":"ks","name":"Юго-западный район","sources":["Юго-Западный район"]},{"id":"ks-south","groupId":"ks","name":"Южный район","sources":["Южный район"]},{"id":"nles-volkhov","groupId":"nles","name":"Волховский РЭС","sources":["Волховский РЭС"]},{"id":"nles-lodeynoye","groupId":"nles","name":"Лодейнопольский РЭС","sources":["Лодейнопольский РЭС"]},{"id":"ses-vsevolozhsk","groupId":"ses","name":"Всеволожский","sources":["СЭС Всеволожский РЭС"]},{"id":"ses-kurortny","groupId":"ses","name":"Курортный","sources":["СЭС Курортный РЭС"]},{"id":"ses-pesochinsky","groupId":"ses","name":"Песочинский","sources":["СЭС Песочинский РЭС"]},{"id":"ses-sertolovo","groupId":"ses","name":"Сертоловский","sources":["СЭС Сертоловский РЭС"]},{"id":"thes-boksitogorsk","groupId":"thes","name":"Бокситогорский","sources":["Бокситогорский РЭС"]},{"id":"thes-tikhvin","groupId":"thes","name":"Тихвинский","sources":["Тихвинский РЭС"]},{"id":"yues-kolpino","groupId":"yues","name":"Колпинский","sources":["Колпинский РЭС"]},{"id":"yues-krasnoselsky","groupId":"yues","name":"Красносельский","sources":["Красносельский РЭС"]},{"id":"yues-petrodvorets","groupId":"yues","name":"Петродворцовый","sources":["Петродворцовый РЭС"]},{"id":"yues-pushkin","groupId":"yues","name":"Пушкинский","sources":["Пушкинский РЭС"]},{"id":"os-thes","groupId":"os","name":"ОС ТхЭС","sources":["Диспетчерская служба ТхЭС"]},{"id":"os-east","groupId":"os","name":"Восточный","sources":["Восточный ВВР"]},{"id":"os-nles","groupId":"os","name":"ОС НлЭС","sources":["ДП ДС НлЭС"]},{"id":"os-central","groupId":"os","name":"Центральный","sources":["Центральный ВВР"]},{"id":"os-knes","groupId":"os","name":"ОС КнЭС","sources":["Диспетчерская служба КнЭС"]},{"id":"os-gtes","groupId":"os","name":"ОС ГтЭС","sources":[]},{"id":"os-south","groupId":"os","name":"Южный","sources":["Южный ВВР"]},{"id":"os-north","groupId":"os","name":"Северный","sources":["Северный ВВР"]},{"id":"os-ves","groupId":"os","name":"ОС ВЭС","sources":[]},{"id":"os-spbbs","groupId":"os","name":"СПбБС","sources":[]},{"id":"os-yues","groupId":"os","name":"ОС ЮЭС","sources":[]}];
  const DEMO_PANELS = [{"id":"monitoring","name":"Активные отключения","description":"Просмотр оперативных аварийных отключений и состояния подразделений.","category":"Оперативная работа"},{"id":"dispatcher","name":"Интерфейс Диспетчера","description":"Специализированное рабочее место оперативно-диспетчерского персонала.","category":"Оперативная работа"},{"id":"executive-monitoring","name":"Диспетчерский мониторинг","description":"Сводная инфографика по аварийным отключениям, заявкам и НДР.","category":"Оперативная работа"},{"id":"excel-exports","name":"Excel выгрузки","description":"Предпросмотр и скачивание настраиваемых Excel-выгрузок оперативных данных.","category":"Отчётность"},{"id":"branch-chats","name":"Филиалы","description":"Информационные панели филиалов: сообщения из настроенных чатов MAX.","category":"Оперативная работа"},{"id":"system-control","name":"Центр управления системой","description":"Режим работы Mini App, пользовательские сессии и эксплуатационная диагностика.","category":"Администрирование"}];
  const DEMO_MAP_ZONES = [["spb","Санкт-Петербург","СПб",["ks-east","ks-west","ks-nevsky","ks-island","ks-right-bank","ks-north","ks-central","ks-southwest","ks-south","os-east","os-central","os-south","os-north","yues-kolpino","yues-krasnoselsky","yues-petrodvorets","yues-pushkin","ses-kurortny","ses-pesochinsky"]],["vyborg","Выборгский район","Выборг",["ves-vyborg","ves-roshchino"]],["priozersk","Приозерский район","Приозерск",["ves-priozersk","ves-sosnovo"]],["vsevolozhsk","Всеволожский район","Всеволожск",["ses-vsevolozhsk","ses-sertolovo"]],["kirovsk","Кировский район","Кировск",[]],["volkhov","Волховский район","Волхов",["nles-volkhov"]],["lodeynoye","Лодейнопольский район","Лодейное Поле",["nles-lodeynoye"]],["podporozhye","Подпорожский район","Подпорожье",[]],["tikhvin","Тихвинский район","Тихвин",["thes-tikhvin"]],["boksitogorsk","Бокситогорский район","Бокситогорск",["thes-boksitogorsk"]],["kirishi","Киришский район","Кириши",[]],["tosno","Тосненский район","Тосно",["gtes-tosno"]],["gatchina","Гатчинский район","Гатчина",["gtes-gatchina"]],["lomonosov","Ломоносовский район","Ломоносов",["gtes-lomonosov"]],["sosnovy-bor","Сосновоборский городской округ","Сосновый Бор",[]],["kingisepp","Кингисеппский район","Кингисепп",["knes-kingisepp"]],["slantsy","Сланцевский район","Сланцы",[]],["volosovo","Волосовский район","Волосово",[]],["luga","Лужский район","Луга",[]]];

  /* ---------------- случайные, но повторяемые данные ---------------- */
  let seed = 20261111;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const chance = (p) => rnd() < p;
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const shiftMinutes = (minutes) => new Date(Date.now() + minutes * 60_000);
  const uuid = () => "demo-xxxxxxxx-xxxx".replace(/x/g, () => Math.floor(rnd() * 16).toString(16));

  const SURNAMES = ["Петров", "Смирнов", "Кузнецов", "Соколов", "Попов", "Лебедев", "Козлов", "Новиков", "Морозов", "Волков", "Зайцев", "Павлов", "Семёнов", "Голубев", "Виноградов", "Богданов", "Воробьёв", "Фёдоров", "Михайлов", "Белов", "Тарасов", "Беляев", "Комаров", "Орлов"];
  const INITIALS = ["А.А.", "И.В.", "С.Н.", "Д.М.", "О.П.", "Е.В.", "М.С.", "П.А.", "Н.И.", "В.Г."];
  const person = () => `${pick(SURNAMES)} ${pick(INITIALS)}`;
  const SETTLEMENTS = ["п. Сосновка", "д. Озерки", "п. Лесное", "д. Горки", "СНТ «Рассвет»", "п. Ручьи", "д. Каменка", "п. Заречье", "СНТ «Берёзка»", "д. Липки", "п. Луговое", "ул. Садовая", "пр. Строителей", "ул. Лесная", "ул. Центральная"];
  const EQUIPMENT = () => pick([
    `ВЛ-10 кВ Ф-${int(1, 40)}`, `ВЛ-0,4 кВ Л-${int(1, 9)} от ТП-${int(100, 999)}`, `КЛ-6 кВ ф.${int(100, 899)}-${int(1, 30)}`,
    `ТП-${int(100, 999)} Т-${int(1, 2)}`, `РП-${int(1, 60)} секция ${int(1, 2)}`, `ВЛ-35 кВ Л-${int(300, 399)}`
  ]);
  const OBJECT = () => pick([`ПС 110 кВ №${int(10, 99)}`, `ПС 35 кВ №${int(100, 300)}`, `РП-${int(1, 60)}`, `ТП-${int(100, 999)}`]);

  /* ---------------- структура: филиалы и РЭС ---------------- */
  const units = DEMO_UNITS.map((unit) => {
    const outageCount = chance(0.45) ? int(1, 4) : 0;
    const outages = Array.from({ length: outageCount }, () => ({
      id: String(int(100000, 999999)),
      createdAt: fmt(shiftMinutes(-int(15, 600))),
      createdBy: `${person()} (диспетчер)`,
      equipment: EQUIPMENT(),
      energyObject: OBJECT(),
      disconnectedObjects: Array.from({ length: int(1, 4) }, () => `ТП-${int(100, 999)} (${pick(SETTLEMENTS)})`),
      appeals: chance(0.7) ? int(1, 25) : 0
    }));
    const planned = Array.from({ length: chance(0.5) ? int(1, 3) : 0 }, () => ({
      id: String(int(100000, 999999)),
      createdAt: fmt(shiftMinutes(-int(60, 2000))),
      createdBy: `${person()} (мастер)`,
      equipment: EQUIPMENT(),
      energyObject: OBJECT(),
      disconnectedObjects: Array.from({ length: int(1, 3) }, () => `ТП-${int(100, 999)} (${pick(SETTLEMENTS)})`),
      appeals: chance(0.2) ? int(1, 3) : 0
    }));
    const requests = { review: int(0, 3), approved: int(1, 12), open: int(2, 25), closed: int(0, 4), acknowledged: int(0, 3), ending: 0 };
    requests.ending = Math.min(requests.open, int(0, 3));
    requests.total = requests.review + requests.approved + requests.open + requests.closed + requests.acknowledged;
    const workorders = { registered: int(0, 4), created: int(0, 3), admission: int(1, 9), preparation: int(0, 3), break: int(0, 2) };
    workorders.total = workorders.registered + workorders.created + workorders.admission + workorders.preparation + workorders.break;
    return { ...unit, outages, planned, requests, workorders };
  });
  // РЭС, который открывается в интерфейсе диспетчера первым, — с отключениями.
  const firstUnit = units.find((unit) => unit.groupId === DEMO_GROUPS[0].id);
  if (firstUnit && firstUnit.outages.length < 2) {
    firstUnit.outages.push(...units.filter((unit) => unit !== firstUnit).flatMap((unit) => unit.outages).slice(0, 2));
  }
  if (firstUnit && !firstUnit.planned.length) {
    firstUnit.planned.push(...units.flatMap((unit) => unit.planned).slice(0, 1));
  }
  const groupById = new Map(DEMO_GROUPS.map((group) => [group.id, group]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const sum = (list, fn) => list.reduce((total, item) => total + Number(fn(item) || 0), 0);
  const appealsOf = (list) => sum(list, (item) => item.appeals);

  /* ---------------- пользователь ---------------- */
  const DEMO_USER = {
    username: "test",
    fullName: "Демо-пользователь",
    isDispatcher: true,
    isDeveloper: true,
    canManageRoles: true,
    roleIds: ["developer"],
    roleNames: ["Разработчик"],
    roles: [{ id: "developer", name: "Разработчик", color: "#d6a446" }],
    primaryRoleColor: "#d6a446",
    panelIds: DEMO_PANELS.map((panel) => panel.id),
    dispatcherDivisionId: "",
    dispatcherDivisionIds: [],
    dispatcherAllDivisions: true
  };

  /* ---------------- отключения ---------------- */
  const outageDivisions = DEMO_GROUPS.filter((group) => group.id !== "os").map((group) => {
    const groupUnits = units.filter((unit) => unit.groupId === group.id);
    return { id: group.id, name: group.name, units: groupUnits };
  });

  function outagesPayload(params) {
    const kind = params.get("kind") === "planned" ? "planned" : "emergency";
    const field = kind === "planned" ? "planned" : "outages";
    const all = units.flatMap((unit) => unit[field]);
    const base = {
      kind, configured: true, status: "ok", message: "", stale: false, cached: false,
      total: all.length, totalAppeals: appealsOf(all), sourceUpdatedAt: fmt(shiftMinutes(-4)),
      messageTimestamp: Date.now() - 240_000, updatedAt: new Date().toISOString()
    };
    if (params.get("overview") === "1") return base;
    const divisionId = params.get("division") || "";
    const details = params.get("details") === "1" || Boolean(divisionId);
    const divisions = outageDivisions
      .filter((division) => !divisionId || division.id === divisionId)
      .map((division) => {
        const breakdown = division.units.map((unit) => ({
          source: unit.sources[0] || unit.name,
          label: unit.sources[0] || unit.name,
          matched: true,
          count: unit[field].length,
          appeals: appealsOf(unit[field]),
          ...(details ? { outages: unit[field] } : {})
        }));
        return {
          id: division.id, name: division.name,
          count: sum(breakdown, (item) => item.count),
          appeals: sum(breakdown, (item) => item.appeals),
          detailsLoaded: details,
          sourceBreakdown: breakdown
        };
      });
    return { ...base, availableDepartments: units.length, withoutDepartment: 0, parts: 1, divisions };
  }

  /* ---------------- интерфейс диспетчера ---------------- */
  function dispatcherPayload(params) {
    const groups = DEMO_GROUPS.map(({ id, name }) => ({ id, name }));
    const group = groupById.get(params.get("group")) || DEMO_GROUPS[0];
    const groupUnits = units.filter((unit) => unit.groupId === group.id);
    const unit = unitById.get(params.get("unit")) && unitById.get(params.get("unit")).groupId === group.id
      ? unitById.get(params.get("unit"))
      : groupUnits[0];
    const source = unit.sources[0] || unit.name;
    const outageBreakdown = (field) => [{
      id: group.id, source: group.name, label: group.name, matched: true,
      count: unit[field].length, appeals: appealsOf(unit[field]),
      sourceCount: 1, selectedSources: [source], matchedSources: [source], missingSources: [],
      sourceBreakdown: [{ source, label: source, matched: true, count: unit[field].length, appeals: appealsOf(unit[field]), outages: unit[field] }]
    }];
    const sourceData = (rowCount) => ({ configured: true, status: "ok", message: "", stale: false, cached: false, sourceUpdatedAt: fmt(shiftMinutes(-6)), messageTimestamp: Date.now() - 360_000, rowCount });
    return {
      allowed: true, code: "READY", isDeveloper: true, hasAllDispatcherGroups: true,
      assignedGroupId: group.id, assignedGroupIds: [], assignedGroupName: "Все подразделения",
      group: { id: group.id, name: group.name }, unit: { id: unit.id, name: unit.name, groupId: group.id },
      availableGroups: groups,
      availableUnits: groupUnits.map(({ id, name }) => ({ id, name })),
      hierarchy: {
        mainRole: `Диспетчер ${unit.name}`,
        mainPersonNames: [person()],
        subordinateRoles: [`ОВБ ${unit.name}`, `Мастер ${unit.name}`],
        subordinatePersonnel: [
          { role: `ОВБ ${unit.name}`, personNames: [person(), person()] },
          { role: `Мастер ${unit.name}`, personNames: [person()] }
        ],
        customized: false,
        personnelSource: { configured: true, status: "ok", message: "", sourceUpdatedAt: fmt(shiftMinutes(-30)), employees: 42, assignmentCount: 18 }
      },
      sources: {
        configured: [source], defaults: [source], customized: false, matched: [source], missing: [],
        breakdown: [{ source, label: source, matched: true, ...unit.requests }]
      },
      requests: { ...unit.requests },
      sourceData: { ...sourceData(units.length), period: shiftPeriod(), reportedTotal: unit.requests.total, reportedEnding: unit.requests.ending },
      workorders: {
        counts: { ...unit.workorders },
        sources: { configured: [source], matched: [source], missing: [], breakdown: [{ source, label: source, matched: true, ...unit.workorders }] },
        sourceData: { ...sourceData(units.length), period: shiftPeriod(), parts: 1, received: 1, counted: unit.workorders.total, withoutJournal: 0, journals: units.length }
      },
      outages: {
        sources: { configured: [group.name], configuredDivisionIds: [group.id], selections: [{ divisionId: group.id, divisionName: group.name, sources: [source] }], customized: false },
        emergency: { count: unit.outages.length, appeals: appealsOf(unit.outages), matched: [group.name], missing: [], breakdown: outageBreakdown("outages"), sourceData: sourceData(units.length) },
        planned: { count: unit.planned.length, appeals: appealsOf(unit.planned), matched: [group.name], missing: [], breakdown: outageBreakdown("planned"), sourceData: sourceData(units.length) }
      },
      defects: { available: false, message: "В разработке" },
      updatedAt: new Date().toISOString()
    };
  }

  function shiftPeriod() {
    const now = new Date();
    const day = now.getHours() >= 8 && now.getHours() < 20;
    const start = new Date(now);
    start.setHours(day ? 8 : 20, 0, 0, 0);
    if (!day && now.getHours() < 8) start.setDate(start.getDate() - 1);
    const end = new Date(start.getTime() + 12 * 3600_000);
    return `${fmt(start)} - ${fmt(end)}`;
  }
  const shiftName = () => (new Date().getHours() >= 8 && new Date().getHours() < 20 ? "ДНЕВНАЯ" : "НОЧНАЯ");

  /* ---------------- диспетчерский мониторинг ---------------- */
  const history = Array.from({ length: 12 }, (_, index) => {
    const ts = Date.now() - (11 - index) * 30 * 60_000;
    const factor = 0.7 + index * 0.03 + rnd() * 0.08;
    const outagesNow = sum(units, (unit) => unit.outages.length);
    return {
      ts,
      label: new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      outages: index === 11 ? outagesNow : Math.max(0, Math.round(outagesNow * factor)),
      appeals: index === 11 ? sum(units, (unit) => appealsOf(unit.outages)) : Math.round(sum(units, (unit) => appealsOf(unit.outages)) * factor),
      requests: index === 11 ? sum(units, (unit) => unit.requests.total) : Math.round(sum(units, (unit) => unit.requests.total) * (0.9 + rnd() * 0.15)),
      workorders: index === 11 ? sum(units, (unit) => unit.workorders.total) : Math.round(sum(units, (unit) => unit.workorders.total) * (0.85 + rnd() * 0.2))
    };
  });

  function executivePayload(params) {
    const groupId = groupById.has(params.get("group")) ? params.get("group") : "";
    const groupUnits = groupId ? units.filter((unit) => unit.groupId === groupId) : units;
    const unitId = groupUnits.some((unit) => unit.id === params.get("unit")) ? params.get("unit") : "";
    const visible = unitId ? groupUnits.filter((unit) => unit.id === unitId) : groupUnits;
    const group = groupById.get(groupId);
    const unit = unitById.get(unitId);
    const totals = (list) => ({
      outages: sum(list, (item) => item.outages.length),
      appeals: sum(list, (item) => appealsOf(item.outages)),
      requests: sum(list, (item) => item.requests.total),
      workorders: sum(list, (item) => item.workorders.total)
    });
    const now = totals(visible);
    const sumKeys = (keys, field) => Object.fromEntries(keys.map((key) => [key, sum(visible, (item) => item[field][key])]));
    const ranked = (fn, label) => visible
      .map((item) => ({ id: item.id, name: `${groupById.get(item.groupId)?.name} · ${item.name}`, count: fn(item) }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const rankedOutages = ranked((item) => item.outages.length);
    const rankedAppeals = ranked((item) => appealsOf(item.outages));
    const rankedRequests = ranked((item) => item.requests.total);
    const rankedWorkorders = ranked((item) => item.workorders.total);
    const scale = totals(units).outages ? now.outages / totals(units).outages : 0;
    const scaledHistory = history.map((point) => ({
      ...point,
      outages: Math.round(point.outages * (scale || 0)),
      appeals: Math.round(point.appeals * (scale || 0)),
      requests: Math.round(point.requests * (totals(units).requests ? now.requests / totals(units).requests : 0)),
      workorders: Math.round(point.workorders * (totals(units).workorders ? now.workorders / totals(units).workorders : 0))
    }));
    scaledHistory[scaledHistory.length - 1] = { ...scaledHistory.at(-1), ...now };
    const delta = (key) => ({ value: now[key] - scaledHistory[0][key], current: now[key], previous: scaledHistory[0][key], available: true });
    const status = (list) => {
      const t = totals(list);
      if (t.outages > 0) return { code: "outages", label: "Есть отключения", tone: "alert" };
      if (t.requests > 0 || t.workorders > 0) return { code: "active", label: "Активная работа", tone: "active" };
      return { code: "clear", label: "Без активных событий", tone: "ok" };
    };
    const divisionTable = DEMO_GROUPS.filter((item) => !groupId || item.id === groupId).map((item) => {
      const list = units.filter((u) => u.groupId === item.id);
      const t = totals(list);
      return {
        id: item.id, name: item.name, description: item.description, status: status(list),
        outages: t.outages, appeals: t.appeals, requests: t.requests,
        openRequests: sum(list, (u) => u.requests.open), workorders: t.workorders,
        workBreaks: sum(list, (u) => u.workorders.break), units: list.length, selectable: true
      };
    });
    const zones = DEMO_MAP_ZONES.map(([id, name, shortName, unitIds]) => {
      const list = unitIds.map((uid) => unitById.get(uid)).filter((u) => u && (!groupId || u.groupId === groupId));
      return { id, name, shortName, enabled: unitIds.length > 0, outages: sum(list, (u) => u.outages.length), appeals: sum(list, (u) => appealsOf(u.outages)) };
    });
    const updated = fmt(shiftMinutes(-4));
    return {
      allowed: true, code: "READY", isDeveloper: true, hasAllGroups: true,
      availableGroups: DEMO_GROUPS.map(({ id, name }) => ({ id, name })),
      availableUnits: groupId ? groupUnits.map(({ id, name }) => ({ id, name })) : [],
      filter: { groupId, unitId, groupName: group?.name || "", unitName: unit?.name || "" },
      scope: { groupCount: DEMO_GROUPS.length, unitCount: groupUnits.length, visibleUnitCount: visible.length },
      headline: { outagesTotal: now.outages, appealsTotal: now.appeals, requestsTotal: now.requests, workordersTotal: now.workorders, divisions: DEMO_GROUPS.length, units: visible.length },
      deltas: { outages: delta("outages"), appeals: delta("appeals"), requests: delta("requests"), workorders: delta("workorders") },
      history: scaledHistory, historyConfigured: true,
      divisionTable,
      map: { zones, source: "Демонстрационные данные", updatedAt: updated },
      outages: { status: "ok", message: "", stale: false, sourceUpdatedAt: updated, reportedTotal: now.outages, total: now.outages, appeals: now.appeals, scopeLabel: unit ? `${group.name} · ${unit.name}` : group ? group.name : "Все подразделения", cards: [], ranked: rankedOutages, rankedAppeals },
      requests: { status: "ok", message: "", stale: false, sourceUpdatedAt: updated, period: shiftPeriod(), rowCount: visible.length, counts: { ...sumKeys(["review", "approved", "open", "closed", "acknowledged", "ending"], "requests"), total: now.requests }, ranked: rankedRequests },
      workorders: { status: "ok", message: "", stale: false, sourceUpdatedAt: updated, period: shiftPeriod(), rowCount: visible.length, counted: now.workorders, received: now.workorders, counts: { ...sumKeys(["registered", "created", "admission", "preparation", "break"], "workorders"), total: now.workorders }, ranked: rankedWorkorders },
      highlights: { outageLeader: rankedOutages[0] || null, appealLeader: rankedAppeals[0] || null, requestLeader: rankedRequests[0] || null, workorderLeader: rankedWorkorders[0] || null },
      updatedAt: new Date().toISOString()
    };
  }

  /* ---------------- детальные окна: заявки и НДР ---------------- */
  function scopeOf(params) {
    const scope = params.get("scope") === "executive" ? "executive" : "dispatcher";
    let groupId = groupById.has(params.get("group")) ? params.get("group") : "";
    if (scope === "dispatcher" && !groupId) groupId = DEMO_GROUPS[0].id;
    const groupUnits = groupId ? units.filter((unit) => unit.groupId === groupId) : units;
    let unitId = groupUnits.some((unit) => unit.id === params.get("unit")) ? params.get("unit") : "";
    if (scope === "dispatcher" && !unitId) unitId = groupUnits[0].id;
    const visible = unitId ? groupUnits.filter((unit) => unit.id === unitId) : groupUnits;
    const group = groupById.get(groupId);
    const unit = unitById.get(unitId);
    return {
      scope, groupId, unitId, visible,
      scopeLabel: unit ? `${group.name} · ${unit.name}` : group ? group.name : "Все подразделения",
      filters: {
        allowAllGroups: scope === "executive", allowAllUnits: scope === "executive",
        groups: DEMO_GROUPS.map(({ id, name }) => ({ id, name })),
        units: groupId ? groupUnits.map(({ id, name }) => ({ id, name })) : []
      },
      sources: visible.map((item) => item.sources[0]).filter(Boolean)
    };
  }

  const REQUEST_STATUS = { review: "В рассмотрении", approved: "Разрешена", open: "Открыта", closed: "Закрыта", acknowledged: "Принята к сведению" };
  const requestCache = new Map();
  function requestsFor(unit) {
    if (requestCache.has(unit.id)) return requestCache.get(unit.id);
    const list = [];
    for (const [key, label] of Object.entries(REQUEST_STATUS)) {
      for (let index = 0; index < Math.min(unit.requests[key], 8); index += 1) {
        const start = shiftMinutes(-int(60, 6000));
        const end = shiftMinutes(int(30, 4000));
        list.push({
          id: String(int(1000, 9999)), status: label, statusKey: key,
          ending: key === "open" && index < unit.requests.ending, flags: [],
          source: `Диспетчер ${unit.name}`, object: unit.sources[0] || unit.name,
          equipment: EQUIPMENT(), start: fmt(start), end: fmt(end), openedAt: fmt(start), closedAt: key === "closed" ? fmt(shiftMinutes(-int(5, 50))) : "",
          works: [`Вывод в ремонт ${EQUIPMENT()}`, pick(["Замена опор", "Ремонт изоляции", "Техническое обслуживание", "Расчистка трассы", "Замена разъединителя"])],
          alsoSources: []
        });
      }
    }
    requestCache.set(unit.id, list);
    return list;
  }

  function requestsDetailsPayload(params) {
    const scope = scopeOf(params);
    const requests = scope.visible.flatMap(requestsFor);
    const counts = { review: 0, approved: 0, open: 0, closed: 0, acknowledged: 0, other: 0, ending: 0, total: requests.length };
    for (const item of requests) { counts[item.statusKey] += 1; if (item.ending) counts.ending += 1; }
    return {
      scope: scope.scope, scopeLabel: scope.scopeLabel, groupId: scope.groupId, unitId: scope.unitId, filters: scope.filters,
      status: "ok", message: "", stale: false, configured: true, sources: scope.sources,
      shift: shiftName(), period: shiftPeriod(), generatedAt: fmt(shiftMinutes(-5)), fileName: "demo-zayavki.txt",
      counts, requests, updatedAt: new Date().toISOString()
    };
  }

  const WO_GROUPS = [["notChecked", "Не проверен"], ["checked", "Проверен, не начат"], ["started", "Работы начаты"], ["notAdmitted", "Допуск не производился"], ["other", "Прочие"]];
  const WO_STATUS = { registered: "Зарегистрирован", created: "Создан", admission: "Допуск", preparation: "Подготовка р.м.", break: "Перерыв" };
  const orderCache = new Map();
  function ordersFor(unit) {
    if (orderCache.has(unit.id)) return orderCache.get(unit.id);
    const list = [];
    for (const [key, label] of Object.entries(WO_STATUS)) {
      for (let index = 0; index < unit.workorders[key]; index += 1) {
        const [group, groupLabel] = key === "admission" ? (chance(0.7) ? WO_GROUPS[2] : WO_GROUPS[1]) : key === "registered" ? WO_GROUPS[0] : pick(WO_GROUPS);
        const issued = shiftMinutes(-int(300, 3000));
        const admitted = group === "started" ? shiftMinutes(-int(30, 300)) : null;
        const admissionMinutes = admitted ? int(5, 70) : null;
        const brigade = Array.from({ length: int(1, 3) }, person);
        list.push({
          number: `${int(1000, 9999)}/${groupById.get(unit.groupId)?.name}/${unit.name}`,
          statusRaw: label, status: label, statusKey: key, group, groupLabel,
          organization: groupById.get(unit.groupId)?.name || "", journal: unit.sources[0] || unit.name,
          object: OBJECT(), places: `${EQUIPMENT()}, ${pick(SETTLEMENTS)}`,
          works: pick(["Техническое обслуживание оборудования", "Замена опор ВЛ", "Ремонт КЛ", "Замена вводов", "Расчистка трассы ВЛ от ДКР", "Испытания оборудования"]),
          planStart: fmt(shiftMinutes(-int(0, 200))), planEnd: fmt(shiftMinutes(int(60, 600))),
          startsInShift: chance(0.6), issuedAt: fmt(issued),
          checkedAt: group !== "notChecked" ? fmt(shiftMinutes(-int(200, 400))) : "",
          admittedAt: admitted ? fmt(admitted) : "",
          actualStartAt: admitted ? fmt(new Date(admitted.getTime() + admissionMinutes * 60_000)) : "",
          admissionMinutes, stageSince: fmt(shiftMinutes(-int(5, 200))), stageBy: person(),
          issuer: `${person()} (мастер)`, responsible: person(), producer: person(),
          brigade, brigadeCount: brigade.length,
          notes: "Работы выполнять по наряду-допуску с соблюдением ПОТЭЭ",
          preparation: `Отключить ${EQUIPMENT()}, установить заземления`,
          result: "", otherDates: "", uid: uuid()
        });
      }
    }
    orderCache.set(unit.id, list);
    return list;
  }

  function workordersDetailsPayload(params) {
    const scope = scopeOf(params);
    const orders = scope.visible.flatMap(ordersFor);
    return {
      scope: scope.scope, scopeLabel: scope.scopeLabel, groupId: scope.groupId, unitId: scope.unitId, filters: scope.filters,
      status: "ok", message: "", stale: false, configured: true, sources: scope.sources,
      shift: shiftName(), period: shiftPeriod(), generatedAt: fmt(shiftMinutes(-7)), fileName: "demo-ndr.txt",
      reportedTotal: orders.length, snapshotId: params.get("snapshot") || "", isArchive: Boolean(params.get("snapshot")),
      archive: { backend: "demo", retentionDays: 32, longAdmissionMinutes: 40 },
      orders, updatedAt: new Date().toISOString()
    };
  }

  function demoShiftReport(day, shift) {
    const night = shift === "night";
    const orders = units.flatMap(ordersFor).slice(0, 60);
    const brief = (order) => ({ uid: order.uid, number: order.number, journal: order.journal, object: order.object, works: order.works, status: order.status, group: order.group, groupLabel: order.groupLabel });
    const time = (h, m) => `${day} ${pad(h)}:${pad(m)}`;
    const changed = orders.slice(0, 14).map((order, index) => ({
      ...brief(order),
      path: [{ status: "Создан", at: "" }, { status: "Проверен", at: time(night ? 21 : 9, index * 3) }, ...(index % 2 ? [{ status: "Допуск", at: time(night ? 23 : 12, index * 2) }] : [])]
    }));
    return {
      day, shift: night ? "night" : "day", shiftLabel: night ? "Ночная смена" : "Дневная смена",
      periodLabel: night ? `${day} 20:00 — следующие сутки 08:00` : `${day} 08:00 — ${day} 20:00`,
      complete: true, snapshots: 25, empty: false, scopeLabel: "Демо",
      baseline: { id: "demo-a", generatedAt: time(night ? 19 : 7, 41), beforeShift: true },
      final: { id: "demo-b", generatedAt: time(night ? 7 : 19, 41) },
      start: { total: 412, groups: { notChecked: 120, checked: 190, started: 70, notAdmitted: 20, other: 12 } },
      end: { total: 426, groups: { notChecked: 98, checked: 196, started: 99, notAdmitted: 21, other: 12 } },
      appearedCount: 22, goneCount: 8, changedCount: changed.length, startedDuringShift: 29,
      transitions: [{ from: "Создан", to: "Проверен", count: 31 }, { from: "Проверен", to: "Допуск", count: 29 }, { from: "Допуск", to: "Окончание работ", count: 11 }, { from: "Создан", to: "Отменён", count: 2 }],
      changed,
      appeared: orders.slice(20, 30).map((order) => ({ ...brief(order), at: time(night ? 22 : 10, 41) })),
      gone: orders.slice(40, 45).map((order) => ({ ...brief(order), at: time(night ? 2 : 15, 39) }))
    };
  }

  function workordersHistoryPayload(params) {
    const uid = params.get("uid");
    if (uid) {
      const order = units.flatMap(ordersFor).find((item) => item.uid === uid);
      if (!order) return [404, { error: "История наряда не найдена" }];
      const first = { ...order, status: "Создан", statusKey: "created", group: "notChecked", groupLabel: "Не проверен", checkedAt: "", admittedAt: "", actualStartAt: "" };
      return [200, {
        uid, number: order.number,
        events: [
          { ts: Date.now() - 6 * 3600_000, type: "version", generatedAt: fmt(shiftMinutes(-360)), snapshotId: "demo-1", first: true, state: first, changes: [], longAdmission: false },
          { ts: Date.now() - 3600_000, type: "version", generatedAt: fmt(shiftMinutes(-60)), snapshotId: "demo-2", first: false, state: order,
            changes: [{ field: "status", label: "Статус", from: first.status, to: order.status }, { field: "groupLabel", label: "Группа", from: first.groupLabel, to: order.groupLabel }],
            longAdmission: Number(order.admissionMinutes) > 40 }
        ],
        inLatestSnapshot: true, latestSnapshot: { id: "demo-2", generatedAt: fmt(shiftMinutes(-60)) },
        archive: { backend: "demo", retentionDays: 32, longAdmissionMinutes: 40 }
      }];
    }
    if (params.get("report") === "shift") return [200, { ...demoShiftReport(params.get("day"), params.get("shift")), kind: "shift" }];
    if (params.get("report") === "period") {
      const from = params.get("from") || "", to = params.get("to") || "";
      return [200, { ...demoShiftReport(from.split(" ")[0], "day"), day: undefined, shift: undefined, shiftLabel: undefined, kind: "period", periodLabel: `${from} — ${to}`, complete: true }];
    }
    // Сводки дважды в час за последние 20 суток, как в реальном архиве.
    const snapshots = [];
    const hour = new Date(); hour.setMinutes(0, 0, 0);
    for (let step = 0; step < 20 * 24; step += 1) {
      const base = new Date(hour.getTime() - step * 3600_000);
      for (const minute of [41, 39]) {
        const at = new Date(base.getTime() + minute * 60_000);
        if (at.getTime() > Date.now()) continue;
        const h = at.getHours();
        snapshots.push({ id: `demo-${at.getTime()}`, ts: at.getTime(), generatedAt: fmt(at), shift: h >= 8 && h < 20 ? "ДНЕВНАЯ" : "НОЧНАЯ", period: "", total: 400 + ((step * 7) % 170), started: 80 + ((step * 5) % 40) });
      }
    }
    return [200, { snapshots, archive: { backend: "demo", retentionDays: 32, longAdmissionMinutes: 40 } }];
  }

  /* ---------------- филиалы и чаты ---------------- */
  const BRANCH_NAMES = ["ВЭС", "ГтЭС", "ЮЭС", "СЭС", "ТхЭС", "КС", "НлЭС", "КнЭС", "ЮВВР", "ВВВР", "СВВР", "ЦВВР", "ОС", "Волхов"];
  const PANEL_NAMES = ["Оперативные переключения", "Аварийные Отключения", "Ввод/вывод ЛЭП 35-110 кВ", "ОЗЗ ЛЭП 6-35 кВ", "Ввод/вывод трансформатора", "Ввод нового оборудования или ЛЭП", "Ввод/вывод РЗА", "Остальные категории"];
  const branches = BRANCH_NAMES.map((name, index) => ({
    id: `branch-${index + 1}`, name, description: "",
    chats: PANEL_NAMES.map((panel, chatIndex) => ({ id: `branch-${index + 1}-chat-${chatIndex + 1}`, name: panel, description: "", chatId: `-7790${index}${chatIndex}000000` }))
  }));
  const LONG_REPORT = Array.from({ length: 14 }, (_, i) => `${i + 1}. ${EQUIPMENT()} — ${pick(["отключено", "включено", "выведено в ремонт", "введено в работу"])} в ${pad(int(6, 22))}:${pad(int(0, 59))}, ${pick(SETTLEMENTS)}`).join("\n");
  const chatMessages = new Map();
  function messagesFor(panelId, panelName) {
    if (!chatMessages.has(panelId)) {
      let ts = Date.now();
      const list = Array.from({ length: 18 }, (_, index) => {
        ts -= int(9, 40) * 60_000;
        const text = index === 3
          ? `Сводка за смену по панели «${panelName}»:\n${LONG_REPORT}`
          : pick([
              `${pick(["Отключен", "Включен", "Выведен в ремонт", "Введен в работу"])} ${EQUIPMENT()} (${OBJECT()}). Причина: ${pick(["плановые работы", "срабатывание защиты", "по заявке", "оперативные переключения"])}.`,
              `СК-11: ${EQUIPMENT()} — ${pick(["переведено в резерв", "работа завершена, схема восстановлена", "бригада выехала на место", "допуск выдан"])}.`,
              `Обесточены: ${pick(SETTLEMENTS)}, ${pick(SETTLEMENTS)}. Ориентировочное время восстановления ${pad(int(10, 23))}:00.`
            ]);
        return {
          id: `${panelId}-m${index}`, ts, author: index % 4 === 0 ? "СК-11 Бот" : person(), isBot: index % 4 === 0,
          text, markup: [], attachments: index === 5 ? [{ type: "file", name: "svodka_smeny.xlsx", url: "" }] : [],
          linked: index === 7 ? { type: "reply", author: person(), text: "Прошу подтвердить выполнение переключений", markup: [], attachments: [] } : null,
          views: int(3, 40)
        };
      });
      chatMessages.set(panelId, list);
    }
    // Каждые 40 секунд в демо «приходит» новое сообщение — видно живое обновление.
    const list = chatMessages.get(panelId);
    const lastTs = list[0]?.ts || 0;
    if (Date.now() - lastTs > 40_000) {
      list.unshift({
        id: `${panelId}-live-${Date.now()}`, ts: Date.now(), author: person(), isBot: false,
        text: `${pick(["Включен", "Отключен", "Выведен в ремонт"])} ${EQUIPMENT()}. ${pick(["Работы по наряду начаты.", "Схема нормальная.", "Потребители запитаны."])}`,
        markup: [], attachments: [], linked: null, views: 1
      });
      list.length = Math.min(list.length, 100);
    }
    return list;
  }

  function branchChatsPayload(params) {
    const branchId = params.get("branch");
    const panelId = params.get("panel");
    if (!branchId || !panelId) {
      return [200, { branches: branches.map((branch) => ({ ...branch, chats: branch.chats.map(({ id, name, description }) => ({ id, name, description })) })), updatedAt: "" }];
    }
    const branch = branches.find((item) => item.id === branchId);
    const panel = branch?.chats.find((item) => item.id === panelId);
    if (!panel) return [404, { error: "Информационная панель не найдена" }];
    const messages = messagesFor(panel.id, panel.name);
    const version = `${messages.length}-${messages[0]?.id}`;
    const base = { branch: { id: branch.id, name: branch.name }, panel: { id: panel.id, name: panel.name, description: "" }, version, fetchedAt: new Date().toISOString(), stale: false, warning: "" };
    return [200, params.get("version") === version ? { ...base, unchanged: true } : { ...base, messages }];
  }

  /* ---------------- Excel ---------------- */
  function excelPayload(params) {
    if (params.get("download") === "1") return [400, { error: "В демонстрационной версии скачивание файла недоступно" }];
    const rows = units.flatMap((unit) => unit.outages.map((outage) => ({
      divisionName: groupById.get(unit.groupId)?.name || "", sourceLabel: unit.sources[0] || unit.name,
      outageId: outage.id, createdAt: outage.createdAt, createdBy: outage.createdBy, equipment: outage.equipment,
      energyObject: outage.energyObject, disconnectedObjects: outage.disconnectedObjects.join("; "), appeals: outage.appeals
    })));
    const limit = Math.max(5, Math.min(Number(params.get("limit")) || 25, 100));
    return [200, {
      type: "emergency", config: DEMO_EXCEL_CONFIG, fieldOptions: DEMO_EXCEL_FIELDS,
      source: { status: "ok", message: "", sourceUpdatedAt: fmt(shiftMinutes(-4)) },
      rowCount: rows.length, rows: rows.slice(0, limit),
      layout: { columnWidths: DEMO_EXCEL_CONFIG.columns.map((column) => column.width), rowHeights: rows.slice(0, limit).map(() => 30) },
      previewLimit: limit, updatedAt: new Date().toISOString()
    }];
  }

  /* ---------------- центр управления ---------------- */
  const demoUsers = [
    { ...DEMO_USER, online: true, lastSeenAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(), firstLoginAt: shiftMinutes(-60 * 24 * 30).toISOString(), lastSessionAt: new Date().toISOString() },
    ...["dispatcher1", "dispatcher2", "chief", "operator"].map((username, index) => ({
      username, fullName: `${pick(SURNAMES)} ${pick(INITIALS)}`,
      isDispatcher: index < 2, isDeveloper: false,
      roleIds: [index < 2 ? "dispatcher" : "user"], roleNames: [index < 2 ? "Диспетчер" : "Пользователь"],
      roles: [{ id: index < 2 ? "dispatcher" : "user", name: index < 2 ? "Диспетчер" : "Пользователь", color: index < 2 ? "#3cc3e8" : "#39c6e6" }],
      panelIds: index < 2 ? ["monitoring", "dispatcher"] : ["monitoring", "executive-monitoring"],
      online: index === 0, lastSeenAt: shiftMinutes(-int(1, 600)).toISOString(), lastLoginAt: shiftMinutes(-int(60, 3000)).toISOString(),
      firstLoginAt: shiftMinutes(-60 * 24 * 20).toISOString(), lastSessionAt: shiftMinutes(-int(1, 600)).toISOString()
    }))
  ];
  const demoRoles = [
    { id: "user", name: "Пользователь", description: "Базовый доступ", panelIds: ["monitoring"], dispatcherDivisionId: "", dispatcherAllDivisions: false, color: "#39c6e6", builtin: true, protected: true, dispatcherDivisionName: "" },
    { id: "dispatcher", name: "Диспетчер", description: "Рабочее место диспетчера", panelIds: ["monitoring", "dispatcher"], dispatcherDivisionId: "ks", dispatcherAllDivisions: false, color: "#3cc3e8", builtin: true, protected: false, dispatcherDivisionName: "КС" },
    { id: "developer", name: "Разработчик", description: "Полный доступ", panelIds: DEMO_PANELS.map((panel) => panel.id), dispatcherDivisionId: "", dispatcherAllDivisions: true, color: "#d6a446", builtin: true, protected: true, dispatcherDivisionName: "Все подразделения" }
  ];

  function adminDashboardPayload() {
    return {
      storageConfigured: true,
      storage: { backend: "local", keys: 1240, mainKeys: 86, archiveKeys: 1154, archiveLoaded: true, s3Backup: true, lastS3Upload: shiftMinutes(-3).toISOString(), lastArchiveS3Upload: shiftMinutes(-12).toISOString(), lastS3Error: "", restoredFrom: `disk ${shiftMinutes(-600).toISOString()}`, health: { ok: true, backend: "local", latencyMs: 1 } },
      system: systemState(),
      onlineCount: demoUsers.filter((user) => user.online).length, onlineWindowSeconds: 120,
      totalUsers: demoUsers.length, dispatcherCount: 2, developerCount: 1, canManageRoles: true,
      users: demoUsers, updatedAt: new Date().toISOString()
    };
  }

  let demoSystem = { mode: "normal", message: "", storageConfigured: true, changedAt: null, changedBy: null };
  const systemState = () => ({ ...demoSystem });

  const LENENERGO_DEMO = {
    ok: true, blocked: "", totalPages: 1, fetchedRows: 3,
    rows: [
      { id: "1", region: "Ленинградская область", district: "р-н Выборгский", addresses: ["п. Сосновка", "п. Лесное"], start: fmt(shiftMinutes(1440)), end: fmt(shiftMinutes(1440 + 480)), branch: "Выборгские ЭС", res: "Рощинский РЭС", comment: "Демонстрационная запись: замена опор ВЛ-10 кВ", fias: [] },
      { id: "2", region: "Ленинградская область", district: "р-н Выборгский", addresses: ["д. Озерки"], start: fmt(shiftMinutes(2880)), end: fmt(shiftMinutes(2880 + 420)), branch: "Выборгские ЭС", res: "Выборгский РЭС", comment: "", fias: [] },
      { id: "3", region: "Ленинградская область", district: "р-н Выборгский", addresses: ["п. Заречье"], start: fmt(shiftMinutes(4320)), end: fmt(shiftMinutes(4320 + 360)), branch: "Выборгские ЭС", res: "Приозерский РЭС", comment: "Расчистка трассы ВЛ", fias: [] }
    ]
  };

  /* ---------------- маршруты ---------------- */
  const DEMO_ONLY = { error: "В демонстрационной версии изменения не сохраняются" };
  const isLoggedIn = () => {
    try { return Boolean(sessionStorage.getItem("le_app_session")); } catch { return false; }
  };

  function route(path, params, method, body) {
    if (path === "login") {
      return String(body?.username || "").trim().toLowerCase() === "test" && String(body?.password || "") === "test"
        ? [200, { ok: true, sessionToken: "demo-session", user: DEMO_USER }]
        : [401, { error: "Неверный логин или пароль. В демо-версии: логин test, пароль test" }];
    }
    if (path === "logout") return [200, { ok: true }];
    if (path === "me") return isLoggedIn() ? [200, { authenticated: true, user: DEMO_USER }] : [401, { authenticated: false }];
    if (!isLoggedIn()) return [401, { error: "Требуется авторизация" }];

    switch (path) {
      case "heartbeat": return [200, { ok: true }];
      case "system": return [200, systemState()];
      case "outages": return [200, outagesPayload(params)];
      case "dispatcher": return [200, dispatcherPayload(params)];
      case "executive-monitoring": return [200, executivePayload(params)];
      case "requests-details": return [200, requestsDetailsPayload(params)];
      case "workorders-details": return [200, workordersDetailsPayload(params)];
      case "workorders-history": return workordersHistoryPayload(params);
      case "workorders-export":
        if (params.get("options") === "1") {
          const day = (value) => { const [d, m, y] = String(value).split("."); return Date.UTC(+y, +m - 1, +d); };
          const days = Math.max(1, Math.round((day(params.get("to")) - day(params.get("from"))) / 86400000) + 1);
          const shifts = params.get("split") === "shift" ? days * 2 : days;
          return [200, {
            scopeLabel: "Демо", periodLabel: `${params.get("from")} — ${params.get("to")}`, snapshots: days * 48, days: shifts,
            options: [
              ["group", "Не проверен", 64], ["group", "Проверен, не начат", 120], ["group", "Работы начаты", 88], ["group", "Допуск не производился", 9], ["group", "Прочие", 41],
              ["status", "Создан", 64], ["status", "Проверен", 120], ["status", "Допуск", 61], ["status", "Подготовка рабочего места", 27], ["status", "Окончание работ", 33], ["status", "Отменён", 8]
            ].map(([kind, value, count]) => ({ key: `${kind}:${value}`, kind, value, count: count * Math.ceil(days / 3) }))
          }];
        }
        return [400, { error: "В демонстрационной версии выгрузка файла недоступна" }];
      case "branch-chats": return branchChatsPayload(params);
      case "excel-exports": return excelPayload(params);
      case "admin/dashboard": return [200, adminDashboardPayload()];
      case "admin/system":
        if (method === "POST") {
          demoSystem = { ...demoSystem, mode: body?.mode || "normal", message: body?.message || "", changedAt: new Date().toISOString(), changedBy: { username: "test", fullName: DEMO_USER.fullName } };
          return [200, { ok: true, system: systemState(), ...systemState() }];
        }
        return [200, { ...systemState(), system: systemState() }];
      case "admin/access": return [200, { panels: DEMO_PANELS, dispatcherDivisions: DEMO_GROUPS, roles: demoRoles, users: demoUsers, currentUser: DEMO_USER }];
      case "admin/branch-chats": return method === "POST" ? [403, DEMO_ONLY] : [200, { storageConfigured: true, config: { version: 1, presetsApplied: true, branches, updatedAt: "", updatedBy: "" } }];
      case "admin/excel-export-config": return method === "POST" ? [403, DEMO_ONLY] : [200, { storageConfigured: true, config: DEMO_EXCEL_CONFIG, divisions: outageDivisions.map(({ id, name }) => ({ id, name })), fieldOptions: DEMO_EXCEL_FIELDS }];
      case "admin/lenenergo-site":
        if (params.get("options") === "1") return [200, { regions: [{ id: "4", name: "Санкт-Петербург" }, { id: "5", name: "Ленинградская область" }], res: [{ id: "71", name: "Выборгский РЭС" }, { id: "72", name: "Приозерский РЭС" }, { id: "73", name: "Рощинский РЭС" }] }];
        return [200, { ...LENENERGO_DEMO, checkedAt: new Date().toISOString(), query: { reg: params.get("reg"), res: params.get("res"), street: params.get("street"), district: params.get("district") }, steps: [{ url: "https://rosseti-lenenergo.ru/clients/planned_work/ (демо)", status: 200, ms: 640, server: "демо", rows: 3, note: "" }] }];
      case "admin/outages-export": return [400, { error: "В демонстрационной версии выгрузка файла недоступна" }];
      case "admin/roles-export": return [400, { error: "В демонстрационной версии выгрузка файла недоступна" }];
      default:
        return method === "GET"
          ? [503, { error: "Этот раздел в демонстрационной версии не настроен" }]
          : [403, DEMO_ONLY];
    }
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const raw = typeof input === "string" ? input : String(input?.url || "");
    const match = raw.match(/\/api\/([^?#]*)(\?[^#]*)?/);
    if (!match) return realFetch(input, init);
    const method = String(init?.method || "GET").toUpperCase();
    let body = null;
    try { body = init?.body ? JSON.parse(init.body) : null; } catch { body = null; }
    const [status, payload] = route(match[1].replace(/\/+$/, ""), new URLSearchParams(match[2] || ""), method, body);
    // Небольшая задержка — как у настоящего сервера, чтобы были видны экраны загрузки.
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
  };

  // Мост MAX вне MAX не нужен: даём приложению «пустой» мост.
  window.WebApp = window.WebApp || {
    initData: "demo",
    BackButton: { onClick() {}, show() {}, hide() {} },
    enableClosingConfirmation() {},
    disableClosingConfirmation() {}
  };

  // Плашка «Демо» и подсказка на экране входа.
  document.addEventListener("DOMContentLoaded", () => {
    const badge = document.createElement("div");
    badge.className = "demo-badge";
    badge.textContent = "ДЕМО-ВЕРСИЯ · данные вымышленные";
    document.body.appendChild(badge);
    const form = document.getElementById("loginForm");
    if (form) {
      const hint = document.createElement("p");
      hint.className = "demo-login-hint";
      hint.textContent = "Демонстрационный вход: логин test, пароль test";
      form.prepend(hint);
    }
    const style = document.createElement("style");
    style.textContent = `
      .demo-badge{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:9999;padding:6px 14px;border-radius:999px;
        background:rgba(214,164,70,.95);color:#15100a;font:700 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.08em;pointer-events:none;
        box-shadow:0 6px 18px rgba(0,0,0,.4)}
      .demo-login-hint{margin:0 0 12px;padding:10px 12px;border:1px solid rgba(214,164,70,.45);border-radius:8px;
        background:rgba(214,164,70,.1);color:#f3d9a4;font-size:13px}`;
    document.head.appendChild(style);
  });
})();
