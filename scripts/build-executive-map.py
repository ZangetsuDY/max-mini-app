"""Генератор геометрии карты Ленобласти для executive-панели.

Запуск (нужны shapely, scipy, numpy, распакованные npm-пакеты
@amcharts/amcharts5-geodata и sane-topojson):
  python3 scripts/build-executive-map.py \
    <amcharts5-geodata/json> <sane-topojson/dist/europe_50m.json> map.json
Результат (zones/context/water) переносится в EXECUTIVE_MAP_* в app.js.

Источники: внешние контуры — @amcharts/amcharts5-geodata (russiaHigh,
finlandHigh, estoniaHigh; лицензия: third_party/amcharts-geodata/LICENSE);
Ладожское озеро — Natural Earth 1:50m (public domain) из sane-topojson. Районы — разбиение области (без Ладоги и СПб) по опорным
населённым пунктам каждого района: Voronoi по точкам, объединённый по районам.
"""
import json, math, sys
import numpy as np
from scipy.spatial import Voronoi
from shapely.geometry import shape, Polygon, MultiPolygon, box, Point
from shapely.ops import unary_union, polylabel

GEO = sys.argv[1]
LAKES = sys.argv[2]
OUT = sys.argv[3]

LON0, LON1, LAT0, LAT1 = 27.55, 35.85, 58.36, 61.42
KX = math.cos(math.radians(59.9))
W = 970
S = W / ((LON1 - LON0) * KX)
H = (LAT1 - LAT0) * S


def proj(lon, lat):
    return ((lon - LON0) * KX * S, (LAT1 - lat) * S)


def fix(g):
    from shapely.validation import make_valid
    return make_valid(g).buffer(0)


def load(name):
    return json.load(open(f"{GEO}/{name}"))["features"]


ru = {f["properties"]["id"]: fix(shape(f["geometry"])) for f in load("russiaHigh.json")}
fin = unary_union([fix(shape(f["geometry"])) for f in load("finlandHigh.json")])
est = unary_union([fix(shape(f["geometry"])) for f in load("estoniaHigh.json")])

bbox = box(LON0 - .5, LAT0 - .5, LON1 + .5, LAT1 + .5)
len_raw = ru["RU-LEN"].buffer(0)
spb = ru["RU-SPE"].buffer(0)

def topo_polygons(path, obj):
    """Минимальный декодер TopoJSON (только Polygon/MultiPolygon)."""
    t = json.load(open(path))
    tr = t.get("transform")
    arcs = []
    for arc in t["arcs"]:
        x = y = 0
        pts = []
        for p in arc:
            if tr:
                x += p[0]
                y += p[1]
                pts.append((x * tr["scale"][0] + tr["translate"][0],
                            y * tr["scale"][1] + tr["translate"][1]))
            else:
                pts.append(tuple(p))
        arcs.append(pts)

    def ring(idx):
        out = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(a if not out else a[1:])
        return out

    for g in t["objects"][obj]["geometries"]:
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"] if g["type"] == "MultiPolygon" else []
        for p in polys:
            yield Polygon(ring(p[0]), [ring(h) for h in p[1:]]).buffer(0)


# Ладожское озеро — реальный контур из Natural Earth.
ladoga = next(p for p in topo_polygons(LAKES, "lakes") if p.contains(Point(31.5, 60.8)))

land_len = len_raw.difference(ladoga)
oblast = land_len.difference(spb)

# Опорные точки районов (lon, lat): административные центры и крупные
# населённые пункты каждого района.
SEEDS = {
    "vyborg": [(28.75, 60.71), (28.61, 60.37), (29.13, 60.95), (28.88, 61.11),
               (28.72, 60.53), (28.25, 60.60), (29.30, 60.75), (29.45, 60.52),
               (29.60, 60.25), (29.37, 60.32), (29.05, 60.30)],
    "priozersk": [(30.13, 61.03), (29.87, 61.12), (30.00, 60.68), (30.24, 60.55),
                  (30.45, 60.70), (29.95, 60.90), (30.20, 60.85)],
    "vsevolozhsk": [(30.64, 60.02), (30.52, 60.15), (30.21, 60.15), (30.29, 60.25),
                    (30.35, 60.38), (30.75, 60.30), (30.90, 60.15), (30.90, 59.88),
                    (30.70, 60.45)],
    "kirovsk": [(30.99, 59.88), (31.07, 59.75), (31.40, 59.88), (31.55, 59.80),
                (31.85, 59.92), (31.60, 59.70), (30.85, 59.77)],
    "volkhov": [(32.34, 59.92), (32.30, 60.05), (32.60, 60.10), (32.90, 60.25),
                (33.30, 60.35), (32.70, 59.90), (32.55, 59.78), (33.00, 60.05),
                (32.10, 59.98), (32.45, 59.66)],
    "lodeynoye": [(33.55, 60.73), (33.70, 60.80), (33.90, 60.45), (33.20, 60.60),
                  (33.60, 60.55), (33.20, 60.75), (33.75, 60.30), (33.45, 60.42)],
    "podporozhye": [(34.17, 60.91), (34.00, 61.05), (35.00, 60.80), (35.50, 61.00),
                    (34.75, 60.62), (34.50, 60.85), (35.30, 60.55)],
    "tikhvin": [(33.54, 59.64), (34.10, 59.95), (33.40, 60.05), (34.00, 60.25),
                (33.30, 59.80), (34.60, 59.95), (34.30, 60.10)],
    "boksitogorsk": [(33.85, 59.42), (34.17, 59.52), (34.60, 59.50), (35.20, 59.50),
                     (34.30, 59.15), (35.30, 59.75), (33.80, 59.20), (34.90, 59.20)],
    "kirishi": [(32.02, 59.45), (32.47, 59.29), (32.15, 59.55), (31.80, 59.35),
                (32.80, 59.45)],
    "tosno": [(30.88, 59.54), (31.25, 59.35), (30.79, 59.70), (31.20, 59.60),
              (30.90, 59.20), (31.50, 59.45), (30.65, 59.40)],
    "gatchina": [(30.10, 59.57), (30.39, 59.62), (30.07, 59.35), (30.33, 59.41),
                 (30.12, 59.20), (29.80, 59.40), (30.05, 59.68), (30.45, 59.25)],
    "lomonosov": [(29.86, 59.73), (29.42, 59.92), (29.63, 59.76), (29.38, 59.75),
                  (30.12, 59.76), (29.57, 59.88), (29.28, 59.80), (29.55, 59.66)],
    "kingisepp": [(28.60, 59.37), (28.21, 59.37), (28.40, 59.65), (28.75, 59.58),
                  (28.95, 59.75), (28.90, 59.40), (28.30, 59.50)],
    "slantsy": [(28.07, 59.12), (28.35, 58.95), (28.60, 59.10), (28.20, 58.85)],
    "volosovo": [(29.48, 59.44), (29.20, 59.55), (29.10, 59.30), (29.55, 59.25),
                 (29.70, 59.52)],
    "luga": [(29.85, 58.74), (29.90, 58.88), (30.40, 58.80), (29.20, 58.95),
             (29.50, 58.60), (30.10, 59.02), (28.90, 58.85), (30.30, 58.55),
             (29.00, 58.65), (30.60, 59.00)],
}

# Сосновый Бор — маленький городской округ: задаём явно (круг у берега).
sb_center = (29.11, 59.885)
sosnovy = Polygon([
    (sb_center[0] + .13 * math.cos(a) / KX * .55, sb_center[1] + .07 * math.sin(a))
    for a in np.linspace(0, 2 * math.pi, 40, endpoint=False)
]).intersection(oblast)
rest = oblast.difference(sosnovy)

# Voronoi в «изотропных» координатах.
pts, owners = [], []
for zid, seeds in SEEDS.items():
    for lon, lat in seeds:
        pts.append((lon * KX, lat))
        owners.append(zid)
# дальние точки, чтобы все ячейки были конечными
far = [(-100, -100), (100, -100), (100, 200), (-100, 200)]
vor = Voronoi(np.array(pts + far))

cells = {}
for i, zid in enumerate(owners):
    region = vor.regions[vor.point_region[i]]
    if -1 in region or not region:
        raise SystemExit(f"open cell for {zid}")
    poly = Polygon([(x / KX, y) for x, y in vor.vertices[region]])
    cells.setdefault(zid, []).append(poly)

zones = {}
for zid, polys in cells.items():
    zones[zid] = unary_union(polys).intersection(rest)
zones["sosnovy-bor"] = sosnovy
zones["spb"] = spb


def clean(g, min_area=0.0015):
    """Убираем мелкие островки-осколки, оставляем основные части."""
    parts = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    parts = [p for p in parts if p.area >= min_area] or [max(parts, key=lambda p: p.area)]
    return MultiPolygon(parts) if len(parts) > 1 else parts[0]


def to_path(g, tol=0.012):
    g = g.simplify(tol, preserve_topology=True)
    parts = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    d = []
    for p in parts:
        for ring in [p.exterior, *p.interiors]:
            xy = [proj(*c) for c in list(ring.coords)[:-1]]
            if len(xy) < 3:
                continue
            d.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in xy) + "Z")
    return "".join(d)


result = {"width": W, "height": round(H), "zones": [], "context": [], "water": {}}

for zid, g in zones.items():
    g = clean(g)
    main = max(g.geoms, key=lambda p: p.area) if isinstance(g, MultiPolygon) else g
    lp = polylabel(main, 0.002)
    x, y = proj(lp.x, lp.y)
    result["zones"].append({"id": zid, "d": to_path(g, 0.006 if zid in ("spb", "sosnovy-bor") else 0.012),
                            "x": round(x), "y": round(y),
                            "area": round(g.area * KX, 4)})

# Фон: соседние регионы РФ, Финляндия, Эстония (приглушённо).
neighbors = unary_union([g for k, g in ru.items() if k not in ("RU-LEN", "RU-SPE")] + [fin, est])
ctx = neighbors.intersection(bbox).difference(ladoga)
result["context"] = to_path(clean(ctx, 0.002), 0.015)
result["water"]["ladoga"] = to_path(ladoga, 0.004)

json.dump(result, open(OUT, "w"), ensure_ascii=False, indent=1)
for z in sorted(result["zones"], key=lambda z: z["area"]):
    print(z["id"], z["area"], z["x"], z["y"], len(z["d"]))
print("H", H)
