// =====================================================================
// Artifacts: (1) which command writes what into target/ (animated)
// (2) explorer: a trimmed JSON sample per artifact, with key-by-key notes,
//     producers, consumers and handy jq one-liners
// =====================================================================
(function () {
  const FILES = ["manifest.json", "run_results.json", "sources.json", "catalog.json", "semantic_manifest.json", "partial_parse.msgpack", "graph_summary.json", "compiled/", "run/", "index.html"];
  const CMDS = {
    "dbt parse": { w: ["manifest.json", "semantic_manifest.json", "partial_parse.msgpack"], r: [] },
    "dbt compile": { w: ["manifest.json", "semantic_manifest.json", "partial_parse.msgpack", "run_results.json", "graph_summary.json", "compiled/"], r: [] },
    "dbt run / build / test / seed / snapshot": { w: ["manifest.json", "semantic_manifest.json", "partial_parse.msgpack", "run_results.json", "graph_summary.json", "compiled/", "run/"], r: [] },
    "dbt source freshness": { w: ["manifest.json", "partial_parse.msgpack", "sources.json"], r: [] },
    "dbt docs generate": { w: ["manifest.json", "partial_parse.msgpack", "catalog.json", "index.html", "compiled/"], r: [] },
    "dbt build -s state:modified+ --state prod/": { w: ["manifest.json", "run_results.json", "compiled/", "run/"], r: ["prod/manifest.json"] },
    "dbt build -s source_status:fresher+ --state prod/": { w: ["manifest.json", "run_results.json", "run/"], r: ["prod/sources.json", "target/sources.json"] },
    "dbt retry": { w: ["manifest.json", "run_results.json", "run/"], r: ["target/run_results.json"] },
    "dbt clone --state prod/": { w: ["manifest.json", "run_results.json"], r: ["prod/manifest.json"] },
    "dbt docs serve": { w: [], r: ["target/index.html", "target/manifest.json", "target/catalog.json"] },
  };

  const tg = document.getElementById("artsim");
  if (tg) {
    const $$ = s => tg.querySelector(s);
    let cmd = "dbt run / build / test / seed / snapshot", timer = null, shown = 99;
    function renderCmd() {
      const c = CMDS[cmd];
      $$("#art-cmd").innerHTML = `<span class="p">$</span>${esc(cmd)}`;
      const reads = c.r.length ? `<div class="art-reads">${c.r.map(f => `<span class="art-file read">📖 reads ${esc(f)}</span>`).join("")}</div>` : `<div class="art-reads muted" style="font-size:.85rem">reads no previous artifact</div>`;
      const tree = FILES.map(f => {
        const i = c.w.indexOf(f), on = i >= 0 && i < shown;
        return `<div class="art-row ${on ? "on" : ""}"><span class="art-ico">${f.endsWith("/") ? "📁" : f.endsWith(".html") ? "🌐" : f.endsWith(".msgpack") ? "📦" : "📄"}</span>
          <span class="art-name">target/${f}</span>${on ? '<span class="art-w">written</span>' : ""}</div>`;
      }).join("");
      $$("#art-tree").innerHTML = reads + `<div class="art-tree">${tree}</div>`;
      $$("#art-note").innerHTML = `Writes <b>${c.w.length}</b> artifact${c.w.length !== 1 ? "s" : ""}. ` +
        (cmd === "dbt docs serve" ? "Only serves what <code>docs generate</code> produced." :
         c.r.length ? "Uses a previous run's artifacts as its input: that's state." : "Add <code>--no-write-json</code> to skip writing manifest / run_results.");
    }
    function play() {
      clearInterval(timer); shown = 0; renderCmd();
      timer = setInterval(() => { shown++; renderCmd(); if (shown >= CMDS[cmd].w.length) clearInterval(timer); }, 280);
    }
    segmented($$("#art-cmds"), Object.keys(CMDS).map(k => ({ value: k, label: k.replace(/^dbt /, "") })), cmd, v => { cmd = v; play(); });
    renderCmd();
  }

  // ------------------------------------------------ explorer
  const ex = document.getElementById("artexp");
  if (!ex) return;
  const $$ = s => ex.querySelector(s);
  const k = (key, note) => `<span class="jk" data-note="${esc(note)}">"${key}"</span>`;
  const A = {
    manifest: {
      file: "manifest.json", who: "every command that parses: parse, compile, run, build, test, seed, snapshot, ls, docs generate, source freshness, clone…",
      size: "MBs to 100s of MB: the whole project, compiled",
      json: `{
  ${k("metadata", "dbt_schema_version (JSON schema URL), dbt_version, generated_at, invocation_id, project_name, adapter_type, env (DBT_ENV_CUSTOM_ENV_* vars)")}: { "dbt_version": "1.8.6", "adapter_type": "snowflake", … },
  ${k("nodes", "every model, test, seed, snapshot, analysis, keyed by unique_id. The heart of the file.")}: {
    "model.shop.fct_orders": {
      ${k("raw_code", "the SQL/Jinja as written in the file")}: "select … from {{ ref('stg_orders') }}",
      ${k("compiled_code", "only after compile/run: Jinja rendered, refs resolved")}: "select … from analytics.dbt_alice.stg_orders",
      ${k("config", "the final config after merging dbt_project.yml + YAML + config(): materialized, tags, grants, contract…")}: { "materialized": "incremental", "unique_key": "order_id", … },
      ${k("depends_on", "nodes and macros this node uses → the DAG edges")}: { "nodes": ["model.shop.stg_orders"], "macros": ["macro.shop.cents_to_dollars"] },
      ${k("checksum", "hash of the file: the basis of state:modified.body")}: { "name": "sha256", "checksum": "9f2c…" },
      ${k("relation_name", "the fully qualified object in the warehouse")}: "analytics.marts.fct_orders",
      ${k("columns", "documented columns from YAML (description, data_type, constraints, tests)")}: { "order_id": { "data_type": "int", … } },
      ${k("unrendered_config", "configs before Jinja rendering: what 1.9+ compares to avoid env-aware false positives")}: { … }
    }
  },
  ${k("sources", "every source table with its freshness config and loaded_at_field")}: { "source.shop.zendesk.tickets": { … } },
  ${k("macros", "every macro (yours + packages + dbt's), with its source code")}: { … },
  ${k("exposures", "dashboards / apps declared downstream")}: { … },  ${k("metrics", "Semantic Layer definitions")}: { … },  ${k("semantic_models", "Semantic Layer models")}: { … },
  ${k("unit_tests", "1.8+: unit tests, with their given/expect fixtures")}: { … },
  ${k("groups", "governance groups and owners")}: { … },  ${k("selectors", "your selectors.yml, parsed")}: { … },
  ${k("disabled", "nodes disabled by config (enabled: false)")}: { … },
  ${k("parent_map", "for each node: its parents. Handy for lineage tools without rebuilding the graph")}: { "model.shop.fct_orders": ["model.shop.stg_orders"] },
  ${k("child_map", "for each node: its children")}: { … }
}`,
      uses: ["<code>--state</code> → <code>state:modified</code>, <code>--defer</code>, <code>dbt clone</code>", "<code>dbt docs serve</code> (with catalog.json)", "orchestrators that build one task per model (Dagster, Astronomer Cosmos, Airflow parsers)",
        "lineage & catalogs (dbt Catalog, DataHub, OpenMetadata, Atlan)", "linters & CI checks (dbt-checkpoint, dbt-project-evaluator)", "your own scripts: lineage, ownership, docs coverage"],
      jq: `<span class="c"># models without a description</span>
jq -r '.nodes[] | select(.resource_type=="model" and .description=="") | .unique_id' target/manifest.json
<span class="c"># children of a model</span>
jq '.child_map["model.shop.fct_orders"]' target/manifest.json
<span class="c"># every incremental model and its unique_key</span>
jq -r '.nodes[] | select(.config.materialized=="incremental") | "\\(.name)\\t\\(.config.unique_key)"' target/manifest.json`,
    },
    run_results: {
      file: "run_results.json", who: "build, run, test, seed, snapshot, compile, retry, clone (and run-operation in recent versions)",
      size: "small: one entry per executed node",
      json: `{
  ${k("metadata", "dbt_version, generated_at, invocation_id")}: { … },
  ${k("elapsed_time", "total wall time of the command, in seconds")}: 412.7,
  ${k("args", "the command and flags used: what dbt retry replays (select, full_refresh, vars, target…)")}: { "which": "build", "select": ["tag:nightly"], "full_refresh": false, … },
  ${k("results", "one entry per executed node, in execution order")}: [
    {
      ${k("unique_id", "which node")}: "model.shop.fct_orders",
      ${k("status", "success | error | skipped for models; pass | fail | warn | error for tests → the result: selector")}: "error",
      ${k("execution_time", "seconds spent on this node: find the slow models")}: 38.2,
      ${k("timing", "compile and execute phases with start/end timestamps")}: [ { "name": "compile", … }, { "name": "execute", … } ],
      ${k("message", "the error or summary (e.g. SUCCESS 1204)")}: "Database Error: column \\"amount\\" does not exist",
      ${k("failures", "tests: number of failing rows")}: null,
      ${k("adapter_response", "warehouse info: rows_affected, query_id (Snowflake/BigQuery), bytes_processed (BigQuery)")}: { "rows_affected": 0, "query_id": "01b2…" },
      ${k("thread_id", "which thread ran it")}: "Thread-3",
      ${k("batch_results", "1.9+: microbatch models, successful and failed batches (used by dbt retry)")}: null
    }
  ]
}`,
      uses: ["<code>dbt retry</code> (reads <code>target/run_results.json</code>)", "<code>result:error+</code>, <code>1+result:fail</code> with <code>--state</code>", "alerting: post failures to Slack / Teams", "monitoring packages: dbt_artifacts, elementary (load results into tables)", "performance: slowest models, trends over time"],
      jq: `<span class="c"># what failed, and why</span>
jq -r '.results[] | select(.status=="error" or .status=="fail") | "\\(.unique_id)\\t\\(.message)"' target/run_results.json
<span class="c"># the 5 slowest nodes</span>
jq -r '.results | sort_by(-.execution_time)[:5][] | "\\(.execution_time|floor)s\\t\\(.unique_id)"' target/run_results.json`,
    },
    sources: {
      file: "sources.json", who: "dbt source freshness only",
      size: "tiny: one entry per source table with a freshness config",
      json: `{
  ${k("metadata", "dbt_version, generated_at, invocation_id")}: { … },
  ${k("elapsed_time", "duration of the freshness run")}: 6.1,
  ${k("results", "one entry per checked source table")}: [
    {
      ${k("unique_id", "the source table")}: "source.shop.zendesk.tickets",
      ${k("max_loaded_at", "max(loaded_at_field), or metadata last-altered: compared between runs by source_status:fresher")}: "2026-11-09T05:58:12Z",
      ${k("snapshotted_at", "the 'now' used for the check")}: "2026-11-09T07:00:03Z",
      ${k("max_loaded_at_time_ago_in_s", "the age compared with warn_after / error_after")}: 3711.0,
      ${k("status", "pass | warn | error | runtime error")}: "pass",
      ${k("criteria", "the thresholds that applied")}: { "warn_after": { "count": 6, "period": "hour" }, "error_after": { … } }
    }
  ]
}`,
      uses: ["<code>source_status:fresher+</code> (compares target/sources.json with the one in --state)", "freshness dashboards (dbt platform, elementary)", "alerting on late sources"],
      jq: `<span class="c"># stale sources</span>
jq -r '.results[] | select(.status!="pass") | "\\(.status)\\t\\(.unique_id)\\t\\(.max_loaded_at)"' target/sources.json`,
    },
    catalog: {
      file: "catalog.json", who: "dbt docs generate only (it queries the warehouse's information schema)",
      size: "medium: one entry per relation with all its columns",
      json: `{
  ${k("metadata", "dbt_version, generated_at")}: { … },
  ${k("nodes", "what the warehouse says about each model/seed/snapshot relation (not the YAML!)")}: {
    "model.shop.fct_orders": {
      ${k("metadata", "type (BASE TABLE / VIEW), schema, name, owner, comment")}: { "type": "BASE TABLE", "owner": "TRANSFORMER", … },
      ${k("columns", "real column names, types and order from the warehouse")}: { "ORDER_ID": { "type": "NUMBER", "index": 1 }, … },
      ${k("stats", "row count, bytes, last modified (platform dependent)")}: { "row_count": { "value": 1204331 }, "bytes": { … } }
    }
  },
  ${k("sources", "the same for source tables")}: { … },
  ${k("errors", "relations dbt couldn't introspect")}: null
}`,
      uses: ["the docs site (<code>dbt docs serve</code>): column types and stats", "documentation coverage: compare YAML columns (manifest) vs real columns (catalog)", "catalog tools that ingest dbt (DataHub, OpenMetadata…)"],
      jq: `<span class="c"># biggest tables</span>
jq -r '.nodes[] | "\\(.stats.row_count.value // 0)\\t\\(.metadata.name)"' target/catalog.json | sort -rn | head
<span class="c"># dbt docs generate --select … limits the (slow) catalog queries (1.7+); --empty-catalog skips them</span>`,
    },
    semantic: {
      file: "semantic_manifest.json", who: "every command that parses (when you have semantic models / metrics)",
      size: "small",
      json: `{
  ${k("semantic_models", "entities, dimensions, measures resolved for MetricFlow")}: [ … ],
  ${k("metrics", "metric definitions")}: [ … ],
  ${k("project_configuration", "time spines and other MetricFlow settings")}: { … }
}`,
      uses: ["MetricFlow / <code>mf query</code> locally", "the dbt platform Semantic Layer"],
      jq: `jq -r '.metrics[].name' target/semantic_manifest.json`,
    },
  };
  let cur = "manifest";
  function renderEx() {
    const a = A[cur];
    $$("#ax-json").innerHTML = `<div class="file">target/${a.file}  ·  trimmed sample, hover or tap a key</div><pre class="code ax-pre">${a.json}</pre>`;
    $$("#ax-side").innerHTML = `<div class="ax-note" id="ax-note"><span class="muted">Hover or tap a <b>"key"</b> to see what it holds.</span></div>
      <div class="pane-title" style="margin-top:12px"><span>written by</span></div><p style="margin:0 0 6px">${a.who}</p>
      <div class="pane-title"><span>size</span></div><p style="margin:0 0 6px">${a.size}</p>
      <div class="pane-title"><span>used by</span></div><ul style="margin:0 0 8px;padding-left:18px">${a.uses.map(u => `<li>${u}</li>`).join("")}</ul>
      <div class="pane-title"><span>handy one-liners</span></div><pre class="code">${a.jq}</pre>`;
    ex.querySelectorAll(".jk").forEach(el => {
      const show = () => { ex.querySelectorAll(".jk.on").forEach(x => x.classList.remove("on")); el.classList.add("on");
        $$("#ax-note").innerHTML = `<b>${esc(el.textContent)}</b>: ${esc(el.dataset.note)}`; };
      el.addEventListener("mouseenter", show); el.addEventListener("click", show);
    });
  }
  segmented($$("#ax-tabs"), Object.entries(A).map(([key, v]) => ({ value: key, label: v.file })), cur, v => { cur = v; renderEx(); });
  renderEx();
})();
