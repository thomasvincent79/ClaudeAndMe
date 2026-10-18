// =====================================================================
// dbt clone simulator: prod relations (from --state) → target schema.
// Zero-copy clone where the warehouse supports it and prod object is a
// table, pointer view otherwise; existing relations skipped unless
// --full-refresh. Step 2 shows what an incremental build does afterwards.
// =====================================================================
(function () {
  const root = document.getElementById("clonesim");
  if (!root) return;
  const $$ = s => root.querySelector(s);

  const PROD = [
    { id: "country_codes", kind: "seed", obj: "table", rows: "250", modified: false },
    { id: "stg_orders", kind: "view", obj: "view", rows: "—", modified: false },
    { id: "orders_snapshot", kind: "snapshot", obj: "table", rows: "3.1M", modified: false },
    { id: "fct_orders", kind: "incremental", obj: "table", rows: "1.2B", modified: true },
    { id: "dim_customers", kind: "table", obj: "table", rows: "4M", modified: false },
    { id: "mart_revenue", kind: "table", obj: "table", rows: "12k", modified: false, child: true },
  ];
  const DEV_EXISTING = { dim_customers: "table (built last week)" };
  const ADAPTERS = {
    snowflake: { label: "Snowflake", zc: true, sql: (s, t) => `create or replace table ${t} clone ${s};` },
    bigquery: { label: "BigQuery", zc: true, sql: (s, t) => `create or replace table ${t} clone ${s};` },
    databricks: { label: "Databricks", zc: true, sql: (s, t) => `create or replace table ${t} shallow clone ${s};` },
    postgres: { label: "Postgres / Redshift", zc: false },
  };
  const SELECTS = {
    all: { label: "(everything)", ids: PROD.map(p => p.id) },
    modified: { label: "state:modified+", ids: ["fct_orders", "mart_revenue"] },
    fct: { label: "fct_orders", ids: ["fct_orders"] },
  };
  const st = { adapter: "snowflake", sel: "all", fr: false, step: 0, timer: null };

  function plan() {
    const a = ADAPTERS[st.adapter];
    const ids = SELECTS[st.sel].ids;
    return PROD.map(p => {
      if (!ids.includes(p.id)) return { ...p, action: "none" };
      const exists = DEV_EXISTING[p.id];
      if (exists && !st.fr) return { ...p, action: "skip", sql: `-- ${p.id} already exists in dbt_alice: left untouched (use --full-refresh to recreate)` };
      const src = `prod.analytics.${p.id}`, tgt = `dev.dbt_alice.${p.id}`;
      if (a.zc && p.obj === "table") return { ...p, action: "clone", sql: a.sql(src, tgt), recreate: !!exists };
      return { ...p, action: "view", sql: `create or replace view ${tgt} as select * from ${src};`, recreate: !!exists };
    });
  }

  const ACT = {
    clone: { txt: "zero-copy clone", col: "#1f9d6b", note: "metadata only: instant, no storage until one side changes" },
    view: { txt: "pointer view", col: "#3a6fd0", note: "select * from prod: always live, read-only in practice" },
    skip: { txt: "skipped (exists)", col: "#8d8d99", note: "pre-existing relation kept" },
    none: { txt: "not selected", col: "transparent", note: "" },
  };

  function draw(p) {
    const rowH = 46, H = 40 + p.length * rowH;
    const parts = [`<text x="20" y="22" class="d-txt" font-weight="700">prod.analytics  (from --state manifest)</text>
      <text x="520" y="22" class="d-txt" font-weight="700">dev.dbt_alice  (your target)</text>`];
    p.forEach((n, i) => {
      const y = 36 + i * rowH, a = ACT[n.action];
      const on = n.action !== "none";
      parts.push(`<g opacity="${on ? 1 : .35}">
        <rect x="20" y="${y}" width="220" height="34" rx="9" fill="var(--card)" stroke="var(--line)"/>
        <text x="32" y="${y + 15}" font-size="11.5" fill="var(--ink)" font-weight="600">${n.id}${n.modified ? "  ✎" : ""}</text>
        <text x="32" y="${y + 28}" font-size="9.5" fill="var(--muted)">${n.kind} · ${n.obj} · ${n.rows} rows</text></g>`);
      if (n.action === "clone" || n.action === "view") {
        const path = `M240 ${y + 17} C380 ${y + 17} 380 ${y + 17} 520 ${y + 17}`;
        parts.push(`<path id="cp${i}" d="${path}" fill="none" stroke="${a.col}" stroke-width="2" ${n.action === "view" ? 'stroke-dasharray="6 4"' : ""} opacity=".8"/>
          <circle r="5" fill="${a.col}"><animateMotion dur="1.6s" repeatCount="indefinite" begin="${i * .15}s"><mpath href="#cp${i}"/></animateMotion></circle>
          <text x="380" y="${y + 11}" text-anchor="middle" font-size="9.5" fill="${a.col}" font-weight="700">${a.txt}${n.recreate ? " (recreated)" : ""}</text>`);
      }
      const devTxt = n.action === "clone" ? `table (clone) · ${n.rows} rows · 0 B` : n.action === "view" ? `view → prod.${n.id}` : DEV_EXISTING[n.id] || "—";
      const devCol = n.action === "skip" ? "var(--upd)" : n.action === "clone" ? "var(--new)" : n.action === "view" ? "color-mix(in srgb, #3a6fd0 18%, var(--card))" : "var(--card)";
      parts.push(`<g opacity="${on || DEV_EXISTING[n.id] ? 1 : .35}">
        <rect x="520" y="${y}" width="240" height="34" rx="9" fill="${devCol}" stroke="var(--line)" ${n.action === "none" && !DEV_EXISTING[n.id] ? 'stroke-dasharray="4 3"' : ""}/>
        <text x="532" y="${y + 15}" font-size="11.5" fill="var(--ink)" font-weight="600">${n.id}</text>
        <text x="532" y="${y + 28}" font-size="9.5" fill="var(--muted)">${devTxt}</text></g>`);
    });
    $$("#clone-svg").innerHTML = `<svg viewBox="0 0 780 ${H}" style="min-width:620px">${parts.join("")}</svg>`;
  }

  function afterBuild(p) {
    const f = p.find(n => n.id === "fct_orders");
    const a = ADAPTERS[st.adapter];
    if (f.action === "clone") return `<div class="verdict ok">✓ <b>fct_orders</b> is a real <b>table</b> in dev, so <code>is_incremental()</code> is <b>true</b>.
      Your modified logic only processes new rows (merge), and CI tests the incremental branch without a 1.2B-row full refresh.
      Storage: only the micro-partitions the merge rewrites are new. Everything else is still shared with prod.</div>`;
    if (f.action === "view") return `<div class="verdict bad">✗ In dev, <b>fct_orders</b> is a <b>view</b> pointing to prod. An incremental model whose existing relation is a view is
      <b>rebuilt in full</b> (<code>is_incremental()</code> is false when the relation isn't a table). On ${a.label}, cloning doesn't save you the full refresh.
      Use <code>--defer</code> for upstream refs instead, and test the incremental branch with a unit test (<code>overrides: macros: is_incremental: true</code>).</div>`;
    if (f.action === "skip") return `<div class="verdict">fct_orders kept its existing dev relation.</div>`;
    return `<div class="verdict">fct_orders was not cloned: it doesn't exist in dev yet, so the next build is a full build (is_incremental() = false)${a.zc ? ". Select it in the clone to avoid that" : ""}.</div>`;
  }

  function render() {
    segmented($$("#clone-adapter"), Object.entries(ADAPTERS).map(([k, a]) => ({ value: k, label: a.label })), st.adapter, v => { st.adapter = v; render(); });
    segmented($$("#clone-sel"), Object.entries(SELECTS).map(([k, s]) => ({ value: k, label: s.label })), st.sel, v => { st.sel = v; render(); });
    segmented($$("#clone-fr"), [{ value: false, label: "off" }, { value: true, label: "--full-refresh" }], st.fr, v => { st.fr = v; render(); });
    const p = plan();
    draw(p);
    const cmd = `dbt clone${st.sel !== "all" ? ` -s ${SELECTS[st.sel].label}` : ""} --state prod-artifacts/${st.fr ? " --full-refresh" : ""} --threads 32`;
    $$("#clone-cmd").innerHTML = `<span class="p">$</span>${esc(cmd)}`;
    const sql = p.filter(n => n.sql).map(n => n.sql).join("\n");
    $$("#clone-sql").innerHTML = `<div class="file">what dbt runs on ${ADAPTERS[st.adapter].label}</div><pre class="code">${esc(sql || "-- nothing selected")}</pre>`;
    $$("#clone-after").innerHTML = `<div class="cmdline"><span class="p">$</span>dbt build -s state:modified+ --defer --state prod-artifacts/</div>` + afterBuild(p);
  }
  document.addEventListener("verchange", render);
  render();
})();
