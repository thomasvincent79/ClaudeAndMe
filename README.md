# ClaudeAndMe

Projects built in conversations with Claude, one folder per sub-project.

**Open the dashboards in a browser (no download):** https://thomasvincent79.github.io/ClaudeAndMe/

| Sub-project | Dashboard | Rebuild |
|---|---|---|
| [World map with political orientation](world-map-political-orientation/) | [dashboard.html](https://thomasvincent79.github.io/ClaudeAndMe/world-map-political-orientation/dashboard.html) | `python make_dashboard.py` (dashboard) / `python make_map.py` (PNG) |
| [World map precious resources](world-map-precious-resources/) | [resources_map.html](https://thomasvincent79.github.io/ClaudeAndMe/world-map-precious-resources/resources_map.html) | `python make_resources_map.py` |
| [dbt mechanics](dbt-mechanics/) | [index.html](https://thomasvincent79.github.io/ClaudeAndMe/dbt-mechanics/index.html) | `python build.py` (add `--serve` to preview on :8800) |

Each dashboard is a single self-contained HTML file: edit the CSVs, re-run the script, commit and push.
The resources map reuses the projection code of the politics sub-project, so keep both folders side by side.

Python packages: `geopandas pandas numpy pyproj shapely matplotlib`.
