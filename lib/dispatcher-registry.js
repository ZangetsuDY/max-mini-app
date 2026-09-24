export const DISPATCHER_GROUP_REGISTRY = Object.freeze([
  { id: "ves", name: "ВЭС", description: "Выборгские электрические сети" },
  { id: "gtes", name: "ГтЭС", description: "Гатчинские электрические сети" },
  { id: "knes", name: "КнЭС", description: "Кингисеппские электрические сети" },
  { id: "ks", name: "КС", description: "Кабельная сеть Санкт-Петербурга" },
  { id: "nles", name: "НлЭС", description: "Новоладожские электрические сети" },
  { id: "ses", name: "СЭС", description: "Северные электрические сети" },
  { id: "thes", name: "ТхЭС", description: "Тихвинские электрические сети" },
  { id: "yues", name: "ЮЭС", description: "Южные электрические сети" },
  { id: "os", name: "ОС", description: "Оперативная служба" }
]);

export const DISPATCHER_UNIT_REGISTRY = Object.freeze([
  { id: "ves-vyborg", groupId: "ves", name: "Выборгский", defaultSources: ["Выборгский РЭС"] },
  { id: "ves-priozersk", groupId: "ves", name: "Приозерский", defaultSources: ["Приозерский РЭС"] },
  { id: "ves-roshchino", groupId: "ves", name: "Рощинский", defaultSources: ["Рощинский РЭС"] },
  { id: "ves-sosnovo", groupId: "ves", name: "Сосновский", defaultSources: ["Сосновский РЭС"] },

  { id: "gtes-gatchina", groupId: "gtes", name: "Гатчинский", defaultSources: ["Гатчинский РЭС"] },
  { id: "gtes-lomonosov", groupId: "gtes", name: "Ломоносовский", defaultSources: ["Ломоносовский РЭС"] },
  { id: "gtes-tosno", groupId: "gtes", name: "Тосненский", defaultSources: ["Тосненский РЭС"] },

  { id: "knes-kingisepp", groupId: "knes", name: "Кингисеппский", defaultSources: ["Кингисеппский РЭС", "Лужский РЭС"] },

  { id: "ks-east", groupId: "ks", name: "Восточный", defaultSources: ["Восточный район"] },
  { id: "ks-west", groupId: "ks", name: "Западный район", defaultSources: ["Западный район"] },
  { id: "ks-nevsky", groupId: "ks", name: "Невский район", defaultSources: ["Невский район"] },
  { id: "ks-island", groupId: "ks", name: "Островной район", defaultSources: ["Островной район"] },
  { id: "ks-right-bank", groupId: "ks", name: "Правобережный район", defaultSources: ["Правобережный район"] },
  { id: "ks-north", groupId: "ks", name: "Северный район", defaultSources: ["Северный район"] },
  { id: "ks-central", groupId: "ks", name: "Центральный район", defaultSources: ["Центральный район"] },
  { id: "ks-southwest", groupId: "ks", name: "Юго-западный район", defaultSources: ["Юго-Западный район"] },
  { id: "ks-south", groupId: "ks", name: "Южный район", defaultSources: ["Южный район"] },

  { id: "nles-volkhov", groupId: "nles", name: "Волховский РЭС", defaultSources: ["Волховский РЭС"] },
  { id: "nles-lodeynoye", groupId: "nles", name: "Лодейнопольский РЭС", defaultSources: ["Лодейнопольский РЭС"] },

  { id: "ses-vsevolozhsk", groupId: "ses", name: "Всеволожский", defaultSources: ["СЭС Всеволожский РЭС"] },
  { id: "ses-kurortny", groupId: "ses", name: "Курортный", defaultSources: ["СЭС Курортный РЭС"] },
  { id: "ses-pesochinsky", groupId: "ses", name: "Песочинский", defaultSources: ["СЭС Песочинский РЭС"] },
  { id: "ses-sertolovo", groupId: "ses", name: "Сертоловский", defaultSources: ["СЭС Сертоловский РЭС"] },

  { id: "thes-boksitogorsk", groupId: "thes", name: "Бокситогорский", defaultSources: ["Бокситогорский РЭС"] },
  { id: "thes-tikhvin", groupId: "thes", name: "Тихвинский", defaultSources: ["Тихвинский РЭС"] },

  { id: "yues-kolpino", groupId: "yues", name: "Колпинский", defaultSources: ["Колпинский РЭС"] },
  { id: "yues-krasnoselsky", groupId: "yues", name: "Красносельский", defaultSources: ["Красносельский РЭС"] },
  { id: "yues-petrodvorets", groupId: "yues", name: "Петродворцовый", defaultSources: ["Петродворцовый РЭС"] },
  { id: "yues-pushkin", groupId: "yues", name: "Пушкинский", defaultSources: ["Пушкинский РЭС"] },

  { id: "os-east", groupId: "os", name: "Восточный", defaultSources: ["Восточный ВВР"] },
  { id: "os-central", groupId: "os", name: "Центральный", defaultSources: ["Центральный ВВР"] },
  { id: "os-south", groupId: "os", name: "Южный", defaultSources: ["Южный ВВР"] },
  { id: "os-north", groupId: "os", name: "Северный", defaultSources: ["Северный ВВР"] },
  { id: "os-knes", groupId: "os", name: "ОС КнЭС", defaultSources: ["Диспетчерская служба КнЭС"] },
  { id: "os-thes", groupId: "os", name: "ОС ТхЭС", defaultSources: ["Диспетчерская служба ТхЭС"] },
  { id: "os-nles", groupId: "os", name: "ОС НлЭС", defaultSources: ["ДП ДС НлЭС"] }
]);

export function getDispatcherGroup(groupId) {
  return DISPATCHER_GROUP_REGISTRY.find((group) => group.id === groupId) || null;
}

export function getDispatcherUnit(unitId) {
  return DISPATCHER_UNIT_REGISTRY.find((unit) => unit.id === unitId) || null;
}

export function getDispatcherUnitsForGroup(groupId) {
  return DISPATCHER_UNIT_REGISTRY.filter((unit) => unit.groupId === groupId);
}
