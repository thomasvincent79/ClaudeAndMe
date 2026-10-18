"""Build an interactive world-politics dashboard (single HTML file) in the Eckert IV projection.

Usage:  python make_dashboard.py      -> writes dashboard.html, open it in any browser
Edit countries_politics.csv to change any data, then re-run.
"""
import json
from datetime import date, datetime
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from pyproj import Transformer
from shapely.geometry import LineString, MultiPolygon, Polygon

from make_map import load_countries, read_politics_csv  # Natural Earth borders, tolerant CSV reader

HERE = Path(__file__).parent
CSV_FILE = HERE / "countries_politics.csv"
TEMPLATE = HERE / "dashboard_template.html"
OUT_FILE = HERE / "dashboard.html"
CRS = "+proj=eck4 +lon_0=0 +datum=WGS84 +units=m"
VIEW_W = 1000  # SVG user units across the whole map
SIMPLIFY_M = 6000  # geometry simplification tolerance in metres

# Natural Earth continent names -> dashboard names, plus fixes for "Seven seas" island states
CONTINENT_NAMES = {"North America": "North & Central America"}
CONTINENT_FIX = {"MDV": "Asia", "MUS": "Africa", "SYC": "Africa", "ATF": "Africa", "IOT": "Asia",
                 "CYP": "Europe", "CYN": "Europe"}
# lon/lat window the map zooms to when one continent is selected
CONTINENT_BOUNDS = {
    "Africa": (-26, -37, 60, 38),
    "Asia": (25, -12, 150, 56),
    "Europe": (-25, 34, 45, 71),
    "North & Central America": (-170, 6, -50, 74),
    "South America": (-90, -56, -32, 14),
    "Oceania": (110, -48, 180, 4),
}


def load_politics() -> pd.DataFrame:
    return read_politics_csv(CSV_FILE).set_index("iso3")


def sphere_and_graticule(n=360):
    lats = np.linspace(-90, 90, n)
    ring = [(-180, la) for la in lats] + [(180, la) for la in lats[::-1]]
    outline = gpd.GeoSeries([Polygon(ring)], crs="EPSG:4326").to_crs(CRS)
    lines = [LineString([(lo, la) for la in lats]) for lo in range(-150, 180, 30)]
    lines += [LineString([(lo, la) for lo in np.linspace(-180, 180, n)]) for la in range(-60, 90, 30)]
    return outline, gpd.GeoSeries(lines, crs="EPSG:4326").to_crs(CRS)


class Projector:
    """Maps projected metres onto SVG user units (y flipped)."""

    def __init__(self, bounds):
        minx, miny, maxx, maxy = bounds
        self.minx, self.maxy = minx, maxy
        self.k = VIEW_W / (maxx - minx)
        self.height = round((maxy - miny) * self.k, 1)

    def pt(self, x, y):
        return round((x - self.minx) * self.k, 1), round((self.maxy - y) * self.k, 1)

    def ring(self, coords, close=True):
        out, last = [], None
        for x, y in coords:
            p = self.pt(x, y)
            if p != last:
                out.append(p)
                last = p
        if len(out) < (3 if close else 2):
            return ""
        d = "M" + "L".join(f"{x:g},{y:g}" for x, y in out)
        return d + ("Z" if close else "")

    def geom(self, g):
        if g is None or g.is_empty:
            return ""
        if isinstance(g, Polygon):
            g = [g]
        elif isinstance(g, MultiPolygon):
            g = list(g.geoms)
        elif isinstance(g, LineString):
            return self.ring(g.coords, close=False)
        parts = []
        for poly in g:
            parts.append(self.ring(poly.exterior.coords))
            parts.extend(self.ring(r.coords) for r in poly.interiors)
        return "".join(parts)


def main():
    pol = load_politics()
    world = load_countries()
    sovereign_code = (
        world[world["ADMIN"] == world["SOVEREIGNT"]].set_index("SOVEREIGNT")["ADM0_A3"].to_dict()
    )

    world["cont"] = [
        CONTINENT_FIX.get(a3, CONTINENT_NAMES.get(c, c)) for a3, c in zip(world["ADM0_A3"], world["CONTINENT"])
    ]
    continent_of = world.set_index("ADM0_A3")["cont"].to_dict()

    world = world.to_crs(CRS)
    world["geometry"] = world.geometry.simplify(SIMPLIFY_M, preserve_topology=True)
    outline, graticule = sphere_and_graticule()
    proj = Projector(outline.total_bounds)

    features = []
    for _, row in world.iterrows():
        code, territory_of = row["ADM0_A3"], None
        if code not in pol.index:
            sov = sovereign_code.get(row["SOVEREIGNT"])
            if sov in pol.index:
                code, territory_of = sov, row["SOVEREIGNT"]
            else:
                code = None
        d = proj.geom(row.geometry)
        if not d:
            continue
        feat = {"d": d, "code": code, "name": row["ADMIN"], "cont": row["cont"]}
        if territory_of:
            feat["terr"] = territory_of
        # tiny countries get a dot so they can be hovered
        area_px = row.geometry.area * proj.k ** 2
        if area_px < 8 and not territory_of:
            p = row.geometry.representative_point()
            feat["dot"] = proj.pt(p.x, p.y)
        features.append(feat)

    countries = []
    for iso, r in pol.iterrows():
        rec = {k: r[k] for k in pol.columns}
        rec["iso3"] = iso
        rec["gdp_musd"] = float(r["gdp_musd"]) if r["gdp_musd"] else None
        rec["term_years"] = float(r["term_years"]) if r["term_years"] else None
        rec["continent"] = continent_of.get(iso, "")
        countries.append(rec)

    to_proj = Transformer.from_crs("EPSG:4326", CRS, always_xy=True)
    views = {}
    for name, (lon0, lat0, lon1, lat1) in CONTINENT_BOUNDS.items():
        lons = np.r_[np.linspace(lon0, lon1, 40), np.full(40, lon1), np.linspace(lon1, lon0, 40), np.full(40, lon0)]
        lats = np.r_[np.full(40, lat0), np.linspace(lat0, lat1, 40), np.full(40, lat1), np.linspace(lat1, lat0, 40)]
        pts = [proj.pt(x, y) for x, y in zip(*to_proj.transform(lons, lats))]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        views[name] = [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]

    payload = {
        "snapshot": date.today().isoformat(),
        "builtAt": datetime.now().isoformat(timespec="seconds"),
        "continentOf": continent_of,
        "viewBox": [0, 0, VIEW_W, proj.height],
        "sphere": proj.geom(outline.iloc[0]),
        "graticule": "".join(proj.geom(g) for g in graticule),
        "features": features,
        "countries": countries,
        "continentViews": views,
    }
    html = TEMPLATE.read_text(encoding="utf-8").replace(
        "/*__DATA__*/null", json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    )
    OUT_FILE.write_text(html, encoding="utf-8")
    print(f"Saved {OUT_FILE.name} ({OUT_FILE.stat().st_size / 1e6:.1f} MB, "
          f"{len(features)} shapes, {len(countries)} countries)")


if __name__ == "__main__":
    main()
