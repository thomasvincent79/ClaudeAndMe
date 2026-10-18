"""World map of government political orientation (fill colour) and regime type
(hatch pattern), drawn in the Equal Earth projection.

Usage:  python make_map.py
Edit countries_politics.csv to change any classification, then re-run.
"""
import io
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import Patch
from shapely.geometry import LineString, Polygon

HERE = Path(__file__).parent
DATA_DIR = HERE / "data"
NE_URL = "https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip"
NE_FILE = DATA_DIR / "ne_50m_admin_0_countries.zip"
CSV_FILE = HERE / "countries_politics.csv"
OUT_FILE = HERE / "world_politics_equal_earth.png"
CRS = "+proj=eqearth +lon_0=0 +datum=WGS84 +units=m"

ORIENTATION = {  # code: (label, colour)
    "FL": ("Far-left", "#a3172c"),
    "L":  ("Left", "#d64045"),
    "CL": ("Centre-left", "#f0957d"),
    "C":  ("Centre", "#b9b4a8"),
    "CR": ("Centre-right", "#8dbbea"),
    "R":  ("Right", "#3a78d0"),
    "FR": ("Far-right", "#2a4fb0"),
    "":   ("Unknown / no clear orientation", "#ffffff"),
}
REGIME = {  # code: (label, hatch)
    "D":  ("Democracy (republic)", ""),
    "CM": ("Democracy with ceremonial monarch", "...."),
    "H":  ("Hybrid regime", "///"),
    "M":  ("Ruling monarchy", "|||"),
    "A":  ("Dictatorship / authoritarian", "xxx"),
}
HATCH_COLOR = "#1a1a1a"
BORDER_COLOR = "#555555"
OCEAN_COLOR = "#eef3f7"


def load_countries() -> gpd.GeoDataFrame:
    if not NE_FILE.exists():
        DATA_DIR.mkdir(exist_ok=True)
        import urllib.request
        print("Downloading Natural Earth countries...")
        req = urllib.request.Request(NE_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as r, open(NE_FILE, "wb") as f:
            f.write(r.read())
    world = gpd.read_file(NE_FILE)
    return world[world["ADM0_A3"] != "ATA"]  # drop Antarctica


def read_politics_csv(path=CSV_FILE) -> pd.DataFrame:
    """Read the countries CSV, whether saved as UTF-8 or by Excel (ANSI, ';' separator)."""
    raw = Path(path).read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    header = next(ln for ln in text.splitlines() if ln.strip() and not ln.lstrip().startswith("#"))
    sep = ";" if header.count(";") > header.count(",") else ","
    df = pd.read_csv(io.StringIO(text), sep=sep, comment="#", dtype=str, keep_default_na=False)
    df.columns = [c.strip().lower() for c in df.columns]
    df["iso3"] = df["iso3"].str.strip().str.upper()
    for col in ("orientation", "regime"):
        df[col] = df[col].str.strip().str.upper()
    return df[df["iso3"] != ""]


def load_politics() -> pd.DataFrame:
    return read_politics_csv().set_index("iso3")


def attach_politics(world, pol):
    # Dependencies (Puerto Rico, Falklands, New Caledonia...) inherit their sovereign's values.
    sovereign_code = (
        world[world["ADMIN"] == world["SOVEREIGNT"]].set_index("SOVEREIGNT")["ADM0_A3"].to_dict()
    )

    def lookup(row):
        for code in (row["ADM0_A3"], sovereign_code.get(row["SOVEREIGNT"])):
            if code in pol.index:
                return pol.loc[code, "orientation"], pol.loc[code, "regime"]
        return "", ""

    world = world.copy()
    world[["orientation", "regime"]] = world.apply(lookup, axis=1, result_type="expand")
    missing = world.loc[world["regime"] == "", "ADMIN"].tolist()
    if missing:
        print("No data (left white, no pattern):", ", ".join(sorted(missing)))
    return world


def globe_outline(n=400):
    """Outline of the whole Earth (the projection's oval) and a graticule, projected."""
    lats = np.linspace(-90, 90, n)
    ring = [(-180, la) for la in lats] + [(180, la) for la in lats[::-1]]
    outline = gpd.GeoSeries([Polygon(ring)], crs="EPSG:4326").to_crs(CRS)
    lines = [LineString([(lo, la) for la in lats]) for lo in range(-150, 180, 30)]
    lines += [LineString([(lo, la) for lo in np.linspace(-180, 180, n)]) for la in range(-60, 90, 30)]
    graticule = gpd.GeoSeries(lines, crs="EPSG:4326").to_crs(CRS)
    return outline, graticule


def main():
    plt.rcParams["hatch.linewidth"] = 0.45
    plt.rcParams["font.family"] = "DejaVu Sans"

    world = attach_politics(load_countries(), load_politics()).to_crs(CRS)
    outline, graticule = globe_outline()

    fig, ax = plt.subplots(figsize=(20, 11.5), dpi=200)
    outline.plot(ax=ax, color=OCEAN_COLOR, edgecolor="none")
    graticule.plot(ax=ax, color="#cfd9e2", linewidth=0.4)

    # 1) fill colour = political orientation
    for code, (_, colour) in ORIENTATION.items():
        sub = world[world["orientation"] == code]
        if not sub.empty:
            sub.plot(ax=ax, facecolor=colour, edgecolor="none")

    # 2) hatch pattern = regime type (transparent fill, only the pattern is drawn)
    for code, (_, hatch) in REGIME.items():
        sub = world[world["regime"] == code]
        if hatch and not sub.empty:
            sub.plot(ax=ax, facecolor="none", edgecolor=HATCH_COLOR, hatch=hatch, linewidth=0)

    # 3) borders and globe edge on top
    world.boundary.plot(ax=ax, color=BORDER_COLOR, linewidth=0.3)
    outline.boundary.plot(ax=ax, color="#8a9aa8", linewidth=0.8)

    ax.set_axis_off()
    ax.set_aspect("equal")

    orient_handles = [
        Patch(facecolor=c, edgecolor="#555", linewidth=0.6, label=lbl)
        for lbl, c in ORIENTATION.values()
    ]
    regime_handles = [
        Patch(facecolor="white", edgecolor=HATCH_COLOR, hatch=h * 2 if h else "", linewidth=0.6, label=lbl)
        for lbl, h in REGIME.values()
    ]
    legend_style = dict(fontsize=12, title_fontsize=13, frameon=False, handleheight=1.8,
                        handlelength=3.0, alignment="left", ncol=2, columnspacing=2.5)
    leg1 = ax.legend(handles=orient_handles, title="Colour: governing orientation",
                     loc="upper right", bbox_to_anchor=(0.47, 0.0), **legend_style)
    ax.add_artist(leg1)
    ax.legend(handles=regime_handles, title="Pattern: type of regime",
              loc="upper left", bbox_to_anchor=(0.53, 0.0), **legend_style)

    ax.set_title("Who governs the world? Political orientation and regime type, October 2026",
                 fontsize=22, fontweight="bold", pad=14)
    ax.annotate("Equal Earth projection  ·  Colour = left/right position of the ruling leader or party; "
                "white = unknown, divided country or no clear ideology.\n"
                "Regime type is a simplified judgement inspired by democracy indices (EIU, V-Dem, Freedom House). "
                "Borders: Natural Earth. Dependencies take their sovereign's values.",
                xy=(0.5, -0.25), xycoords="axes fraction", ha="center", va="top",
                fontsize=10.5, color="#444")

    fig.savefig(OUT_FILE, bbox_inches="tight", facecolor="white")
    print("Saved", OUT_FILE.name)


if __name__ == "__main__":
    main()
