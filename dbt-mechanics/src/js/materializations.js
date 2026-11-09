// =====================================================================
// Materializations: (1) what each materialization runs, per platform/run
// (2) config precedence: clobber vs additive vs shallow merge
// =====================================================================
(function () {
  const ms = document.getElementById("matsim");
  if (ms) {
    const $$ = s => ms.querySelector(s);
    const st = { mat: "table", plat: "snowflake", run: "first", changed: false };
    const MATS = { view: "view", table: "table", incremental: "incremental", ephemeral: "ephemeral", materialized_view: "materialized_view", dynamic_table: "dynamic_table" };
    const Q = "select order_id, sum(amount) as amount from {{ ref('stg_payments') }} group by 1";
    function sql() {
      const p = st.plat, m = st.mat, first = st.run === "first", rel = { snowflake: "ANALYTICS.MARTS.FCT_ORDERS", postgres: "marts.fct_orders", bigquery: "`proj.marts.fct_orders`" }[p];
      if (m === "view") return p === "postgres"
        ? `create view marts.fct_orders__dbt_tmp as (…);\nalter view marts.fct_orders rename to fct_orders__dbt_backup;   <span class="c">-- if it exists</span>\nalter view marts.fct_orders__dbt_tmp rename to fct_orders;\ndrop view marts.fct_orders__dbt_backup cascade;`
        : `create or replace view ${rel} as (…);`;
      if (m === "table") return p === "snowflake" ? `create or replace transient table ${rel} as (…);   <span class="c">-- transient by default on Snowflake</span>`
        : p === "bigquery" ? `create or replace table ${rel} as (…);`
        : `create table marts.fct_orders__dbt_tmp as (…);\nalter table marts.fct_orders rename to fct_orders__dbt_backup;\nalter table marts.fct_orders__dbt_tmp rename to fct_orders;\ndrop table marts.fct_orders__dbt_backup cascade;   <span class="c">-- atomic swap in one transaction</span>`;
      if (m === "incremental") return first ? `<span class="c">-- first run: same as a table (is_incremental() = false)</span>\ncreate … table ${rel} as (…);`
        : `<span class="c">-- next runs: temp relation with the new rows, then the strategy</span>\ncreate temporary … fct_orders__dbt_tmp as (… where updated_at &gt; max(updated_at) …);\nmerge into ${rel} using fct_orders__dbt_tmp …;   <span class="c">-- see the Incremental page</span>`;
      if (m === "ephemeral") return `<span class="c">-- nothing is created in the warehouse.</span>\n<span class="c">-- the model is inlined as a CTE into every model that refs it:</span>\nwith __dbt__cte__fct_orders as (\n    ${Q.replace("{{ ref('stg_payments') }}", "marts.stg_payments")}\n)\nselect … from __dbt__cte__fct_orders   <span class="c">-- inside mart_revenue's compiled SQL</span>`;
      if (m === "materialized_view") {
        if (p === "snowflake") return `<span class="k">-- dbt-snowflake has no materialized_view materialization:</span>\n<span class="k">-- use dynamic_table (or a plain table + schedule)</span>`;
        if (first) return `create materialized view ${rel} as (…);`;
        if (!st.changed) return p === "bigquery" ? `<span class="c">-- no config change: refresh (BigQuery can also auto-refresh)</span>\ncall bq.refresh_materialized_view('proj.marts.fct_orders');` : `<span class="c">-- no config change: just refresh</span>\nrefresh materialized view ${rel};`;
        return `<span class="c">-- config changed → on_configuration_change decides:</span>\n<span class="c">--   apply (default): alter if possible, else drop + create</span>\n<span class="c">--   continue: keep it, log a warning · fail: stop with an error</span>\ndrop materialized view ${rel};\ncreate materialized view ${rel} as (…);`;
      }
      if (m === "dynamic_table") {
        if (p !== "snowflake") return `<span class="k">-- dynamic_table is a Snowflake materialization.</span>\n<span class="k">-- elsewhere: materialized_view (Postgres, BigQuery, Redshift, Databricks)</span>`;
        if (first) return `create dynamic table ${rel}\n  target_lag = '30 minutes'\n  warehouse = TRANSFORM_WH\nas (…);   <span class="c">-- Snowflake refreshes it on its own</span>`;
        if (!st.changed) return `<span class="c">-- no config change: trigger a refresh</span>\nalter dynamic table ${rel} refresh;`;
        return `<span class="c">-- config changed (e.g. target_lag): on_configuration_change = apply</span>\nalter dynamic table ${rel} set target_lag = '10 minutes';   <span class="c">-- or full replace if the SQL changed</span>`;
      }
    }
    const PROFILE = {
      view: { st: 0, bc: 0, qc: 3, fr: "always live", when: "light transformations, staging, rarely queried models" },
      table: { st: 3, bc: 3, qc: 1, fr: "as of last run", when: "marts queried by BI, heavy logic read often" },
      incremental: { st: 3, bc: 1, qc: 1, fr: "as of last run", when: "big tables where a full rebuild is too slow or costly" },
      ephemeral: { st: 0, bc: 0, qc: 2, fr: "inlined", when: "tiny reusable logic. Not queryable, not testable on its own, hard to debug" },
      materialized_view: { st: 2, bc: 1, qc: 1, fr: "maintained by the warehouse", when: "near-real-time aggregates the warehouse can maintain incrementally (limited SQL)" },
      dynamic_table: { st: 2, bc: 1, qc: 1, fr: "target_lag", when: "Snowflake pipelines with a freshness target, without an orchestrator" },
    };
    function bar(n) { return `<span class="mbar">${[0, 1, 2].map(i => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`; }
    function render() {
      const showChanged = (st.mat === "materialized_view" || st.mat === "dynamic_table") && st.run === "next";
      $$("#mat-changed-wrap").style.display = showChanged ? "" : "none";
      $$("#mat-sql").innerHTML = `<div class="file">what dbt runs · ${st.plat} · ${st.run} run</div><pre class="code">${sql()}</pre>`;
      const pr = PROFILE[st.mat];
      $$("#mat-prof").innerHTML = `<div class="mprof">
        <div><span>storage</span>${bar(pr.st)}</div><div><span>build cost</span>${bar(pr.bc)}</div>
        <div><span>query-time cost</span>${bar(pr.qc)}</div><div><span>freshness</span><b>${pr.fr}</b></div></div>
        <div class="narration"><b>Use for</b>: ${pr.when}.</div>`;
      $$("#mat-cfg").innerHTML = `<pre class="code">{{ config(materialized=<span class="s">'${st.mat}'</span>${st.mat === "materialized_view" ? `, on_configuration_change=<span class="s">'apply'</span>` : st.mat === "dynamic_table" ? `,\n          target_lag=<span class="s">'30 minutes'</span>, snowflake_warehouse=<span class="s">'TRANSFORM_WH'</span>` : st.mat === "incremental" ? `, unique_key=<span class="s">'order_id'</span>` : ""}) }}
${esc(Q)}</pre>`;
    }
    segmented($$("#mat-m"), Object.keys(MATS).map(k => ({ value: k, label: k })), st.mat, v => { st.mat = v; render(); });
    segmented($$("#mat-p"), [{ value: "snowflake", label: "Snowflake" }, { value: "postgres", label: "Postgres / Redshift" }, { value: "bigquery", label: "BigQuery" }], st.plat, v => { st.plat = v; render(); });
    segmented($$("#mat-r"), [{ value: "first", label: "first run" }, { value: "next", label: "next run" }], st.run, v => { st.run = v; render(); });
    segmented($$("#mat-changed"), [{ value: false, label: "no config change" }, { value: true, label: "config changed" }], st.changed, v => { st.changed = v; render(); });
    render();
  }

  // ------------------------------------------------ 2 · precedence
  const pc = document.getElementById("precsim");
  if (pc) {
    const $$ = s => pc.querySelector(s);
    const LAYERS = [
      { id: "proj", name: "dbt_project.yml · project", c: { materialized: "view", tags: ["nightly"], meta: { owner: "alice", sla: { tier: 2 } }, "post-hook": ["grant select on {{ this }} to role reporter"] } },
      { id: "folder", name: "dbt_project.yml · marts/", c: { materialized: "table", tags: ["finance"], meta: { sla: { pager: true } } } },
      { id: "yaml", name: "models/marts/_marts.yml", c: { materialized: "incremental", meta: { owner: "bob" } } },
      { id: "sql", name: "config() in fct_orders.sql", c: { tags: ["hourly"], "post-hook": ["{{ log_run(this) }}"] } },
    ];
    const on = new Set(LAYERS.map(l => l.id));
    const COLORS = { proj: "#8d8d99", folder: "#3a6fd0", yaml: "#8a5cf6", sql: "#ff5f3f" };
    function compute() {
      const eff = {}, src = {};
      LAYERS.filter(l => on.has(l.id)).forEach(l => {
        Object.entries(l.c).forEach(([k, v]) => {
          if (k === "tags" || k === "post-hook") { eff[k] = (eff[k] || []).concat(v); (src[k] = src[k] || []).push(...v.map(() => l.id)); }
          else if (k === "meta") { eff.meta = eff.meta || {}; src.meta = src.meta || {}; Object.entries(v).forEach(([mk, mv]) => { eff.meta[mk] = mv; src.meta[mk] = l.id; }); }
          else { eff[k] = v; src[k] = l.id; }
        });
      });
      return { eff, src };
    }
    const tag = (txt, id) => `<span class="ptag" style="border-color:${COLORS[id]};color:${COLORS[id]}">${esc(txt)}</span>`;
    function render() {
      $$("#pc-layers").innerHTML = LAYERS.map((l, i) => `<label class="player ${on.has(l.id) ? "on" : ""}" style="--c:${COLORS[l.id]}">
        <input type="checkbox" data-l="${l.id}" ${on.has(l.id) ? "checked" : ""}><span class="pnum">${i + 1}</span><span><b>${l.name}</b><br><code>${esc(JSON.stringify(l.c).replace(/"/g, "").replace(/,/g, ", "))}</code></span></label>`).join("");
      $$("#pc-layers").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { i.checked ? on.add(i.dataset.l) : on.delete(i.dataset.l); render(); }));
      const { eff, src } = compute();
      const rows = [];
      rows.push(`<tr><td><code>materialized</code></td><td>${eff.materialized ? tag(eff.materialized, src.materialized) : '<span class="muted">view (dbt default)</span>'}</td><td><b>clobber</b>: the most specific value wins</td></tr>`);
      rows.push(`<tr><td><code>tags</code></td><td>${(eff.tags || []).map((t, i) => tag(t, src.tags[i])).join(" ") || '<span class="muted">—</span>'}</td><td><b>additive</b>: every level adds its tags</td></tr>`);
      rows.push(`<tr><td><code>meta</code></td><td>${eff.meta ? Object.entries(eff.meta).map(([k, v]) => tag(`${k}: ${JSON.stringify(v).replace(/"/g, "")}`, src.meta[k])).join(" ") : '<span class="muted">—</span>'}</td><td><b>shallow merge</b>: top-level keys merge, a nested dict is replaced as a whole${on.has("proj") && on.has("folder") ? " (<code>sla.tier</code> is lost!)" : ""}</td></tr>`);
      rows.push(`<tr><td><code>post-hook</code></td><td>${(eff["post-hook"] || []).map((t, i) => tag(t, src["post-hook"][i])).join(" ") || '<span class="muted">—</span>'}</td><td><b>additive</b>: hooks from all levels run</td></tr>`);
      $$("#pc-out").innerHTML = `<table class="prose">${rows.join("")}</table>`;
    }
    render();
  }
})();
