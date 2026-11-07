// =====================================================================
// Grants simulator: (1) inheritance merge project → model → effective
// (2) reconciliation with what the warehouse currently has → SQL per platform
// =====================================================================
(function () {
  const root = document.getElementById("grantsim");
  if (!root) return;
  const $$ = s => root.querySelector(s);

  const PLAT = {
    snowflake: { label: "Snowflake", priv: "select", A: "REPORTER", B: "BI_ROLE", C: "DATA_SCIENCE", X: "ANALYST_TMP",
      obj: "ANALYTICS.MARTS.FCT_ORDERS",
      grant: (p, g, o) => `grant ${p} on table ${o} to role ${g};`, revoke: (p, g, o) => `revoke ${p} on table ${o} from role ${g};`,
      show: o => `show grants on table ${o};`, copy: true },
    bigquery: { label: "BigQuery", priv: "roles/bigquery.dataViewer", A: "group:reporting@acme.com", B: "serviceAccount:looker@acme.iam.gserviceaccount.com", C: "user:ana@acme.com", X: "user:intern@acme.com",
      obj: "`acme-prod.marts.fct_orders`",
      grant: (p, g, o) => `grant \`${p}\` on table ${o} to "${g}";`, revoke: (p, g, o) => `revoke \`${p}\` on table ${o} from "${g}";`,
      show: () => `select privilege_type, grantee from marts.INFORMATION_SCHEMA.OBJECT_PRIVILEGES where object_name = 'fct_orders';` },
    databricks: { label: "Databricks (Unity Catalog)", priv: "select", A: "reporting", B: "bi_service", C: "data_science", X: "temp_analyst",
      obj: "prod.marts.fct_orders",
      grant: (p, g, o) => `grant ${p} on table ${o} to \`${g}\`;`, revoke: (p, g, o) => `revoke ${p} on table ${o} from \`${g}\`;`,
      show: o => `show grants on table ${o};` },
    redshift: { label: "Redshift", priv: "select", A: "group:reporting", B: "role:bi", C: "user:ana", X: "user:intern",
      obj: "marts.fct_orders",
      grant: (p, g, o) => `grant ${p} on ${o} to ${g.replace(/^user:/, "").replace(/^(group|role):/, "$1 ")};`,
      revoke: (p, g, o) => `revoke ${p} on ${o} from ${g.replace(/^user:/, "").replace(/^(group|role):/, "$1 ")};`,
      show: () => `-- dbt reads the catalog (svv_relation_privileges / pg_* tables)` },
    postgres: { label: "Postgres", priv: "select", A: "reporting", B: "bi", C: "data_science", X: "intern",
      obj: "marts.fct_orders",
      grant: (p, g, o) => `grant ${p} on ${o} to ${g};`, revoke: (p, g, o) => `revoke ${p} on ${o} from ${g};`,
      show: () => `select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'marts' and table_name = 'fct_orders';` },
  };
  const MODEL = {
    none: { label: "no model config", desc: "inherits the folder's grants" },
    override: { label: "select: [C]", desc: "replaces the inherited list (merge & clobber)" },
    add: { label: "+select: [C]", desc: "the + inside grants ADDS to the inherited list" },
    empty: { label: "select: []", desc: "explicitly revokes everyone" },
  };
  const STATE = {
    new: { label: "first build (new object)", existing: [], diff: false },
    replace: { label: "table rebuilt (create or replace)", existing: [], diff: false },
    incr: { label: "existing object kept (incremental)", existing: ["A", "X"], diff: true },
    copy: { label: "Snowflake copy_grants: true", existing: ["A", "X"], diff: true, sfOnly: true },
  };
  const st = { plat: "snowflake", model: "add", state: "incr", line: 99, timer: null };

  const chip = (k, p, cls = "") => `<span class="gchip ${cls}">${esc(p[k])}</span>`;
  function effective() {
    const proj = ["A", "B"];
    if (st.model === "none") return proj;
    if (st.model === "override") return ["C"];
    if (st.model === "add") return [...proj, "C"];
    return [];
  }
  function render() {
    const p = PLAT[st.plat];
    if (STATE[st.state].sfOnly && st.plat !== "snowflake") st.state = "incr";
    segmented($$("#g-plat"), Object.entries(PLAT).map(([k, v]) => ({ value: k, label: v.label })), st.plat, v => { st.plat = v; st.line = 0; render(); play(); });
    segmented($$("#g-model"), Object.entries(MODEL).map(([k, v]) => ({ value: k, label: v.label.replace("select", p.priv.includes("/") ? "dataViewer" : p.priv).replace("C", p.C.length > 14 ? "ana" : p.C) })), st.model, v => { st.model = v; st.line = 0; render(); play(); });
    segmented($$("#g-state"), Object.entries(STATE).filter(([, v]) => !v.sfOnly || st.plat === "snowflake").map(([k, v]) => ({ value: k, label: v.label })), st.state, v => { st.state = v; st.line = 0; render(); play(); });

    const priv = p.priv, eff = effective();
    // config panel
    const plusKey = st.model === "add" ? `'+${priv}'` : `'${priv}'`;
    const modelCfg = st.model === "none" ? `<span class="c">-- no grants in the model: inherits the folder</span>`
      : `{{ config(grants = {${plusKey}: [${st.model === "empty" ? "" : `'${p.C}'`}]}) }}`;
    $$("#g-cfg").innerHTML = `<div class="file">dbt_project.yml</div><pre class="code">models:
  my_project:
    marts:
      <span class="h">+grants:</span>
        ${priv.includes("/") ? `'${priv}'` : priv}: ['${p.A}', '${p.B}']</pre>
      <div class="file">models/marts/fct_orders.sql</div><pre class="code">${modelCfg}
select …</pre>`;
    // merge visual
    $$("#g-merge").innerHTML = `<div class="gmerge">
      <div><div class="pane-title"><span>folder (dbt_project.yml)</span></div>${["A", "B"].map(k => chip(k, p, st.model === "override" || st.model === "empty" ? "struck" : "")).join("")}</div>
      <div class="gop">${st.model === "none" ? "=" : st.model === "add" ? "+" : "→"}</div>
      <div><div class="pane-title"><span>model config</span></div>${st.model === "none" ? '<span class="muted">—</span>' : st.model === "empty" ? '<span class="gchip empty">[ ] empty</span>' : chip("C", p, "new")}</div>
      <div class="gop">⇒</div>
      <div><div class="pane-title"><span>effective ${esc(priv)}</span></div>${eff.length ? eff.map(k => chip(k, p, "eff")).join("") : '<span class="gchip empty">nobody</span>'}</div>
    </div><div class="muted" style="font-size:.85rem;margin-top:4px">${MODEL[st.model].desc}</div>`;

    // reconciliation
    const S = STATE[st.state];
    const existing = S.existing;
    const stmts = [];
    if (S.diff) {
      stmts.push({ k: "show", sql: p.show(p.obj), why: "read what the object has today" });
      existing.filter(k => !eff.includes(k)).forEach(k => stmts.push({ k: "revoke", g: k, sql: p.revoke(priv, p[k], p.obj), why: k === "X" ? "granted by hand, not in config → revoked" : "no longer in config" }));
      eff.filter(k => !existing.includes(k)).forEach(k => stmts.push({ k: "grant", g: k, sql: p.grant(priv, p[k], p.obj), why: "missing → granted" }));
      existing.filter(k => eff.includes(k)).forEach(k => stmts.push({ k: "keep", g: k, sql: `-- ${p[k]}: already granted, nothing to do`, why: "unchanged" }));
    } else {
      eff.forEach(k => stmts.push({ k: "grant", g: k, sql: p.grant(priv, p[k], p.obj), why: st.state === "new" ? "new object → grant everything configured" : "the replaced object starts without grants → grant again" }));
    }
    if (!stmts.length) stmts.push({ k: "keep", sql: "-- nothing to grant: the object is private", why: "" });
    const before = S.diff ? existing : [];
    $$("#g-before").innerHTML = `<div class="pane-title"><span>${esc(p.obj)} · before</span></div>${before.length ? before.map(k => chip(k, p, k === "X" ? "manual" : "")).join("") : '<span class="muted">no grants</span>'}
      ${S.diff ? '<div class="muted" style="font-size:.8rem;margin-top:4px">' + esc(p.X) + " was granted by hand in the console</div>" : ""}`;
    const shown = stmts.slice(0, st.line);
    $$("#g-sql").innerHTML = `<div class="file">what dbt runs after building the object (${p.label})</div><pre class="code">${shown.map(s => `<span class="gl ${s.k}">${esc(s.sql)}</span>`).join("\n") || " "}</pre>
      <div class="effects">${shown.filter(s => s.why).map(s => `<div class="gwhy ${s.k}"><b>${s.k.toUpperCase()}</b> ${s.g ? esc(p[s.g]) + ": " : ""}${esc(s.why)}</div>`).join("")}</div>`;
    const after = st.line >= stmts.length ? eff : null;
    $$("#g-after").innerHTML = `<div class="pane-title"><span>after</span></div>${after === null ? '<span class="muted">…</span>' : after.length ? after.map(k => chip(k, p, "eff")).join("") : '<span class="muted">no grants (private)</span>'}`;
    const notes = [];
    if (st.plat === "snowflake" && st.state === "replace") notes.push("With <code>copy_grants: false</code> (the default), CREATE OR REPLACE doesn't keep the old privileges (dbt-snowflake 1.13+ adds IGNORE GRANTS explicitly; older adapters may keep some, see the docs). dbt grants the configured roles again.");
    if (st.plat === "snowflake" && st.state === "copy") notes.push("<code>copy_grants: true</code> keeps the old privileges through the replace, so dbt must diff and revoke. Useful to avoid a short gap where readers lose access.");
    if (st.plat === "bigquery") notes.push("The privilege is an IAM <b>role</b> (<code>roles/bigquery.dataViewer</code>) and grantees need a prefix (<code>user:</code>, <code>group:</code>, <code>serviceAccount:</code>, <code>domain:</code>).");
    if (st.plat === "databricks") notes.push("Readers also need <code>USE CATALOG</code> / <code>USE SCHEMA</code>, which dbt's grants config doesn't manage. Use a post-hook or on-run-end. On interactive clusters, table access control must be enabled.");
    if (st.plat === "redshift") notes.push("Unprefixed names are users. Use <code>group:</code> or <code>role:</code> for groups and roles.");
    if (S.diff && existing.includes("X") && !eff.includes("X")) notes.push(`⚠ dbt <b>owns</b> this privilege on the object: the manual grant to <code>${esc(p.X)}</code> is revoked on every run. Put it in the config instead.`);
    $$("#g-notes").innerHTML = notes.map(n => `<div class="callout ${n.startsWith("⚠") ? "warn" : ""}" style="margin:8px 0"><p>${n}</p></div>`).join("");
    st._n = stmts.length;
  }
  function play() {
    clearInterval(st.timer); st.line = 0; render();
    st.timer = setInterval(() => { st.line++; render(); if (st.line >= st._n) clearInterval(st.timer); }, 650);
  }
  $$("#g-play").addEventListener("click", play);
  render(); st.line = 99; render();
})();
