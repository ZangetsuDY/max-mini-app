import {
  isRuntimeStoreConfigured,
  redisCommand
} from "./runtime-store.js";

const CONFIG_KEY =
  "lenenergo:max-mini-app:executive:regional-map-config-v1";

/*
  Geometry ids correspond to the simplified municipal map embedded in app.js.
  The shapes are intentionally simplified for an operations dashboard, while
  preserving the real geographic arrangement of Saint Petersburg and the
  municipal districts of Leningrad Oblast.
*/
const DEFAULT_ZONES = Object.freeze([
  {
    id: "spb",
    name: "Санкт-Петербург",
    shortName: "СПб",
    enabled: true,
    outageDivisionIds: [],
    unitIds: [
      "ks-east", "ks-west", "ks-nevsky", "ks-island", "ks-right-bank",
      "ks-north", "ks-central", "ks-southwest", "ks-south",
      "os-east", "os-central", "os-south", "os-north",
      "yues-kolpino", "yues-krasnoselsky", "yues-petrodvorets", "yues-pushkin",
      "ses-kurortny", "ses-pesochinsky"
    ]
  },
  {
    id: "vyborg",
    name: "Выборгский район",
    shortName: "Выборг",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["ves-vyborg", "ves-roshchino"]
  },
  {
    id: "priozersk",
    name: "Приозерский район",
    shortName: "Приозерск",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["ves-priozersk", "ves-sosnovo"]
  },
  {
    id: "vsevolozhsk",
    name: "Всеволожский район",
    shortName: "Всеволожск",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["ses-vsevolozhsk", "ses-sertolovo"]
  },
  {
    id: "kirovsk",
    name: "Кировский район",
    shortName: "Кировск",
    enabled: true,
    outageDivisionIds: [],
    unitIds: []
  },
  {
    id: "volkhov",
    name: "Волховский район",
    shortName: "Волхов",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["nles-volkhov"]
  },
  {
    id: "lodeynoye",
    name: "Лодейнопольский район",
    shortName: "Лодейное Поле",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["nles-lodeynoye"]
  },
  {
    id: "podporozhye",
    name: "Подпорожский район",
    shortName: "Подпорожье",
    enabled: true,
    outageDivisionIds: [],
    unitIds: []
  },
  {
    id: "tikhvin",
    name: "Тихвинский район",
    shortName: "Тихвин",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["thes-tikhvin"]
  },
  {
    id: "boksitogorsk",
    name: "Бокситогорский район",
    shortName: "Бокситогорск",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["thes-boksitogorsk"]
  },
  {
    id: "kirishi",
    name: "Киришский район",
    shortName: "Кириши",
    enabled: true,
    outageDivisionIds: [],
    unitIds: []
  },
  {
    id: "tosno",
    name: "Тосненский район",
    shortName: "Тосно",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["gtes-tosno"]
  },
  {
    id: "gatchina",
    name: "Гатчинский район",
    shortName: "Гатчина",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["gtes-gatchina"]
  },
  {
    id: "lomonosov",
    name: "Ломоносовский район",
    shortName: "Ломоносов",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["gtes-lomonosov"]
  },
  {
    id: "sosnovy-bor",
    name: "Сосновоборский городской округ",
    shortName: "Сосновый Бор",
    enabled: true,
    outageDivisionIds: [],
    unitIds: []
  },
  {
    id: "kingisepp",
    name: "Кингисеппский район",
    shortName: "Кингисепп",
    enabled: true,
    outageDivisionIds: [],
    unitIds: ["knes-kingisepp"]
  },
  {
    id: "slantsy",
    name: "Сланцевский район",
    shortName: "Сланцы",
    enabled: true,
    outageDivisionIds: [],
    unitIds: []
  },
  {
    id: "volosovo",
    name: "Волосовский район",
    shortName: "Волосово",
    enabled: true,
    outageDivisionIds: [],
    unitIds: []
  },
  {
    id: "luga",
    name: "Лужский район",
    shortName: "Луга",
    enabled: true,
    outageDivisionIds: [],
    unitIds: []
  }
]);

function safeParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 160)
    )
  ];
}

function cleanText(value, max = 100) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function normalizeZone(zone, fallback = null) {
  const id = cleanText(zone?.id || fallback?.id, 64).toLowerCase();
  if (!id) return null;

  return {
    id,
    name: cleanText(zone?.name || fallback?.name || id, 100),
    shortName: cleanText(zone?.shortName || fallback?.shortName || zone?.name || fallback?.name || id, 60),
    enabled: zone?.enabled === undefined
      ? Boolean(fallback?.enabled ?? true)
      : Boolean(zone.enabled),
    outageDivisionIds: normalizeIds(zone?.outageDivisionIds ?? fallback?.outageDivisionIds),
    unitIds: normalizeIds(zone?.unitIds ?? fallback?.unitIds),
    updatedAt: zone?.updatedAt || fallback?.updatedAt || null,
    updatedBy: zone?.updatedBy || fallback?.updatedBy || null
  };
}

function cloneDefaults() {
  return DEFAULT_ZONES.map((zone) => normalizeZone(zone));
}

async function readZones() {
  const defaults = cloneDefaults();
  if (!isRuntimeStoreConfigured()) return defaults;

  try {
    const raw = await redisCommand("GET", CONFIG_KEY);
    const parsed = safeParse(raw, null);
    const saved = Array.isArray(parsed?.zones) ? parsed.zones : [];
    const savedMap = new Map(
      saved
        .map((zone) => normalizeZone(zone))
        .filter(Boolean)
        .map((zone) => [zone.id, zone])
    );

    return defaults.map((base) =>
      normalizeZone(savedMap.get(base.id) || base, base)
    );
  } catch (error) {
    console.error("Не удалось загрузить настройку оперативной карты:", error);
    return defaults;
  }
}

async function writeZones(zones) {
  if (!isRuntimeStoreConfigured()) {
    throw new Error("Хранилище состояния не подключено");
  }

  await redisCommand(
    "SET",
    CONFIG_KEY,
    JSON.stringify({
      version: 1,
      zones: zones.map((zone) => normalizeZone(zone)).filter(Boolean),
      updatedAt: new Date().toISOString()
    })
  );
}

export async function getExecutiveMapZones() {
  return readZones();
}

export async function updateExecutiveMapZone({
  zoneId,
  enabled,
  outageDivisionIds,
  unitIds,
  actor
}) {
  const id = cleanText(zoneId, 64).toLowerCase();
  const zones = await readZones();
  const index = zones.findIndex((zone) => zone.id === id);

  if (index < 0) {
    throw new Error("Регион карты не найден");
  }

  zones[index] = normalizeZone({
    ...zones[index],
    enabled,
    outageDivisionIds,
    unitIds,
    updatedAt: new Date().toISOString(),
    updatedBy: {
      username: String(actor?.username || ""),
      fullName: String(actor?.fullName || "")
    }
  }, zones[index]);

  await writeZones(zones);
  return zones[index];
}
