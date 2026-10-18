"""Build an interactive world map of strategic resources (oil, gas, rare earths): reserves, exports,
imports and the main trade flows routed through sea lanes, chokepoints and pipelines.
Single HTML file, same Eckert IV projection as the politics dashboard.

Usage:  python make_resources_map.py      -> writes resources_map.html, open it in any browser
Data:   resources.csv (reserves & trade per country), flows.csv (country-to-country flows),
        network_nodes.csv + network_routes.csv (ports, sea lanes, chokepoints, pipelines).
"""
import heapq
import io
import json
import math
import sys
from datetime import datetime
from pathlib import Path

# projection helpers and Natural Earth borders are shared with the politics sub-project
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "world-map-political-orientation"))

import numpy as np
import pandas as pd
from pyproj import Transformer
from shapely.geometry import MultiPolygon

from make_dashboard import (CONTINENT_BOUNDS, CONTINENT_FIX, CONTINENT_NAMES, CRS, SIMPLIFY_M,
                            Projector, sphere_and_graticule)
from make_map import load_countries

HERE = Path(__file__).parent
CSV_FILE = HERE / "resources.csv"
FLOWS_FILE = HERE / "flows.csv"
NODES_FILE = HERE / "network_nodes.csv"
ROUTES_FILE = HERE / "network_routes.csv"
TEMPLATE = HERE / "resources_template.html"
OUT_FILE = HERE / "resources_map.html"
CORNER_DEG = 1.4  # how much a route's corners are rounded, in degrees


def read_csv(path) -> pd.DataFrame:
    """Read a data CSV, whether saved as UTF-8 or by Excel (ANSI, ';' separator)."""
    raw = Path(path).read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    header = next(ln for ln in text.splitlines() if ln.strip() and not ln.lstrip().startswith("#"))
    sep = ";" if header.count(";") > header.count(",") else ","
    df = pd.read_csv(io.StringIO(text), sep=sep, comment="#", dtype=str, keep_default_na=False)
    df.columns = [c.strip().lower() for c in df.columns]
    return df.apply(lambda col: col.str.strip())


def to_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.str.replace(" ", "").str.replace(",", "."), errors="coerce")


def read_resources() -> pd.DataFrame:
    df = read_csv(CSV_FILE)
    df["iso3"] = df["iso3"].str.upper()
    for col in df.columns.drop(["iso3", "country"]):
        df[col] = to_num(df[col])
    return df[df["iso3"] != ""].set_index("iso3")


def anchor(geom):
    """Point inside the country's largest polygon, where its bubbles are drawn."""
    if isinstance(geom, MultiPolygon):
        geom = max(geom.geoms, key=lambda g: g.area)
    return geom.representative_point()


# ---------- transport network ----------

def haversine(a, b):
    lon1, lat1, lon2, lat2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


class Network:
    def __init__(self):
        nodes = read_csv(NODES_FILE)
        self.nodes = {r.id: r for r in nodes.itertuples()}
        self.xy = {r.id: (float(r.lon), float(r.lat)) for r in nodes.itertuples()}
        self.routes = read_csv(ROUTES_FILE)
        self.adj = {}  # node -> list of (neighbour, km, type, pipeline name)
        for r in self.routes.itertuples():
            ids = r.path.split()
            for a, b in zip(ids, ids[1:]):
                for n in (a, b):
                    if n not in self.xy:
                        raise SystemExit(f"network_routes.csv: unknown node '{n}' in {r.name or r.type} route")
                km = haversine(self.xy[a], self.xy[b])
                self.adj.setdefault(a, []).append((b, km, r.type, r.name))
                self.adj.setdefault(b, []).append((a, km, r.type, r.name))
        self.pipeline_names = set(self.routes.loc[self.routes["type"] == "pipeline", "name"])

    def shortest(self, src, dst, ok):
        dist, prev, heap = {src: 0}, {}, [(0, src)]
        while heap:
            d, n = heapq.heappop(heap)
            if n == dst:
                break
            if d > dist[n]:
                continue
            for m, km, typ, name in self.adj.get(n, []):
                if not ok(typ, name):
                    continue
                if d + km < dist.get(m, math.inf):
                    dist[m] = d + km
                    prev[m] = (n, typ, name)
                    heapq.heappush(heap, (d + km, m))
        if dst not in dist:
            return None
        path, steps, n = [dst], [], dst
        while n != src:
            n, typ, name = prev[n]
            path.append(n)
            steps.append(name if typ == "pipeline" else "")
        return path[::-1], steps[::-1]

    def route(self, flow):
        """Nodes from origin to destination, plus the pipelines used along the way."""
        via = [v.strip() for v in flow["via"].split(";") if v.strip()]
        pipes = {v for v in via if v in self.pipeline_names}
        stops = [v for v in via if v not in pipes]
        unknown = [v for v in stops if v not in self.xy]
        if unknown:
            raise SystemExit(f"flows.csv: '{'; '.join(unknown)}' is neither a pipeline nor a node ({flow['from']}->{flow['to']})")
        pipeline_only = flow["mode"] == "pipeline"

        def ok(typ, name):
            if typ == "pipeline":
                return name in pipes
            return not pipeline_only

        points = [flow["from_node"] or f"p_{flow['from']}", *stops, flow["to_node"] or f"p_{flow['to']}"]
        for p in points:
            if p not in self.xy:
                raise SystemExit(f"flows.csv: node '{p}' not found in network_nodes.csv ({flow['from']}->{flow['to']})")
        nodes, used = [points[0]], []
        for a, b in zip(points, points[1:]):
            leg = self.shortest(a, b, ok)
            if not leg:
                raise SystemExit(f"flows.csv: no route from {a} to {b} for {flow['resource']} {flow['from']}->{flow['to']}")
            nodes += leg[0][1:]
            for s in leg[1]:
                if s and s not in used:
                    used.append(s)
        return nodes, used


# ---------- geometry ----------

def round_corners(pts):
    """Cut each corner of a lon/lat polyline into a short curve so routes read as smooth lanes."""
    if len(pts) < 3:
        return pts
    out = [pts[0]]
    for p0, p1, p2 in zip(pts, pts[1:], pts[2:]):
        a, b = np.subtract(p0, p1), np.subtract(p2, p1)
        la, lb = np.hypot(*a), np.hypot(*b)
        if la == 0 or lb == 0:
            continue
        ca = np.add(p1, a / la * min(CORNER_DEG, la * 0.4))
        cb = np.add(p1, b / lb * min(CORNER_DEG, lb * 0.4))
        for t in np.linspace(0, 1, 6):  # quadratic Bézier from ca through the corner to cb
            out.append(tuple((1 - t) ** 2 * ca + 2 * (1 - t) * t * np.array(p1) + t ** 2 * cb))
    out.append(pts[-1])
    return out


def densify(pts, step=1.0):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step))
        for i in range(1, n + 1):
            out.append((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n))
    return out


class LineDrawer:
    def __init__(self, proj):
        self.proj = proj
        self.tr = Transformer.from_crs("EPSG:4326", CRS, always_xy=True)

    def d(self, lonlat):
        # unwrap so a route crossing the date line stays continuous, then split it at ±180°
        pts = [lonlat[0]]
        for lon, lat in lonlat[1:]:
            prev = pts[-1][0]
            while lon - prev > 180:
                lon -= 360
            while lon - prev < -180:
                lon += 360
            pts.append((lon, lat))
        pts = densify(round_corners(pts))
        sheet = lambda lon: math.floor((lon + 180) / 360)
        wrap = lambda lon: (lon + 180) % 360 - 180
        parts, cur = [], [(wrap(pts[0][0]), pts[0][1])]
        for (lon0, lat0), (lon1, lat1) in zip(pts, pts[1:]):
            k0, k1 = sheet(lon0), sheet(lon1)
            if k0 != k1:  # crossing the antimeridian: end this part at the edge, start the next on the other side
                boundary = -180 + 360 * max(k0, k1)
                lat = lat0 + (lat1 - lat0) * (boundary - lon0) / (lon1 - lon0)
                edge = 180 if k1 > k0 else -180
                cur.append((edge, lat))
                parts.append(cur)
                cur = [(-edge, lat)]
            cur.append((wrap(lon1), lat1))
        parts.append(cur)
        out = ""
        for part in parts:
            if len(part) < 2:
                continue
            xs, ys = self.tr.transform(*zip(*part))
            out += self.proj.ring(zip(xs, ys), close=False)
        return out

    def pt(self, lon, lat):
        return self.proj.pt(*self.tr.transform(lon, lat))


def main():
    res = read_resources()
    world = load_countries()
    world["cont"] = [
        CONTINENT_FIX.get(a3, CONTINENT_NAMES.get(c, c)) for a3, c in zip(world["ADM0_A3"], world["CONTINENT"])
    ]
    continent_of = world.set_index("ADM0_A3")["cont"].to_dict()
    iso2 = {a3: (a2 if a2 and a2 != "-99" else b2).lower()
            for a3, a2, b2 in zip(world["ADM0_A3"], world["ISO_A2_EH"], world["ISO_A2"])}
    iso2 = {k: v for k, v in iso2.items() if len(v) == 2}

    world = world.to_crs(CRS)
    world["geometry"] = world.geometry.simplify(SIMPLIFY_M, preserve_topology=True)
    outline, graticule = sphere_and_graticule()
    proj = Projector(outline.total_bounds)
    lines = LineDrawer(proj)

    features, anchors = [], {}
    for _, row in world.iterrows():
        code = row["ADM0_A3"]
        d = proj.geom(row.geometry)
        if not d:
            continue
        features.append({"d": d, "code": code if code in res.index else None, "name": row["ADMIN"],
                         "cont": row["cont"], "a2": iso2.get(code)})
        if code in res.index:
            p = anchor(row.geometry)
            anchors[code] = proj.pt(p.x, p.y)

    missing = sorted(set(res.index) - set(anchors))
    if missing:
        print("Warning: no map shape for", ", ".join(missing))

    value_cols = list(res.columns.drop("country"))
    countries = []
    for iso, r in res.iterrows():
        rec = {"iso3": iso, "country": r["country"], "continent": continent_of.get(iso, ""),
               "a2": iso2.get(iso), "at": anchors.get(iso)}
        for col in value_cols:
            rec[col] = None if pd.isna(r[col]) else float(r[col])
        countries.append(rec)

    # ---- network: chokepoints, pipelines, routed flows ----
    net = Network()
    chokepoints = [{"id": n.id, "label": n.label, "note": n.note, "at": lines.pt(*net.xy[n.id])}
                   for n in net.nodes.values() if n.kind == "chokepoint"]
    damage = [{"label": n.label, "note": n.note, "at": lines.pt(*net.xy[n.id])}
              for n in net.nodes.values() if n.kind == "damage"]
    pipelines = []
    for r in net.routes[net.routes["type"] == "pipeline"].itertuples():
        pipelines.append({"name": r.name, "res": r.resource.split(), "status": r.status or "active",
                          "cap": r.capacity, "note": r.note, "d": lines.d([net.xy[n] for n in r.path.split()])})

    flows_df = read_csv(FLOWS_FILE)
    flows_df["volume"] = to_num(flows_df["volume"])
    flows = []
    for f in flows_df.to_dict("records"):
        f["from"], f["to"] = f["from"].upper(), f["to"].upper()
        for iso in (f["from"], f["to"]):
            if iso not in res.index:
                raise SystemExit(f"flows.csv: country {iso} is missing from resources.csv")
        nodes, pipes = net.route(f)
        flows.append({
            "res": f["resource"], "from": f["from"], "to": f["to"], "v": float(f["volume"]),
            "mode": f["mode"], "status": f["status"] or "active", "note": f["note"],
            "chk": [n for n in nodes if net.nodes[n].kind == "chokepoint"],
            "pipes": pipes,
            "d": lines.d([net.xy[n] for n in nodes]),
        })

    to_proj = Transformer.from_crs("EPSG:4326", CRS, always_xy=True)
    views = {}
    for name, (lon0, lat0, lon1, lat1) in CONTINENT_BOUNDS.items():
        lons = np.r_[np.linspace(lon0, lon1, 40), np.full(40, lon1), np.linspace(lon1, lon0, 40), np.full(40, lon0)]
        lats = np.r_[np.full(40, lat0), np.linspace(lat0, lat1, 40), np.full(40, lat1), np.linspace(lat1, lat0, 40)]
        pts = [proj.pt(x, y) for x, y in zip(*to_proj.transform(lons, lats))]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        views[name] = [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]

    payload = {
        "builtAt": datetime.now().isoformat(timespec="seconds"),
        "viewBox": [0, 0, 1000, proj.height],
        "sphere": proj.geom(outline.iloc[0]),
        "graticule": "".join(proj.geom(g) for g in graticule),
        "features": features,
        "countries": countries,
        "continentViews": views,
        "flows": flows,
        "chokepoints": chokepoints,
        "pipelines": pipelines,
        "damage": damage,
    }
    html = TEMPLATE.read_text(encoding="utf-8").replace(
        "/*__DATA__*/null", json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    )
    OUT_FILE.write_text(html, encoding="utf-8")
    print(f"Saved {OUT_FILE.name} ({OUT_FILE.stat().st_size / 1e6:.1f} MB, {len(countries)} countries, "
          f"{len(flows)} flows, {len(pipelines)} pipelines, {len(chokepoints)} chokepoints)")


if __name__ == "__main__":
    main()
