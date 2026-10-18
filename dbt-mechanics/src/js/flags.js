// =====================================================================
// Flags page: (1) DAG playground — selection, indirect test selection,
// deferral, --full-refresh / --empty / --sample effects, fail-fast;
// (2) flag reference cards rendered from data.
// =====================================================================
(function () {
  // ------------------------------------------------------------------ DAG
  const N = (id, type, mat, x, y, parents = [], extra = {}) => ({ id, type, mat, x, y, parents, tags: [], ...extra });
  const NODES = [
    N("shop.orders", "source", "source", 20, 30, [], { eventTime: true }),
    N("shop.customers", "source", "source", 20, 140),
    N("country_codes", "seed", "seed", 20, 250),
    N("stg_orders", "model", "view", 215, 30, ["shop.orders"], { eventTime: true }),
    N("orders_snapshot", "snapshot", "snapshot", 215, 105, ["shop.orders"]),
    N("stg_customers", "model", "view", 215, 185, ["shop.customers"], { modified: true }),
    N("not_null_stg_customers_id", "test", "data test", 215, 262, ["stg_customers"]),
    N("fct_orders", "model", "incremental", 410, 30, ["stg_orders"], { tags: ["finance"] }),
    N("ut_fct_orders_amount", "unit_test", "unit test", 410, 105, ["fct_orders"]),
    N("dim_customers", "model", "table", 410, 185, ["stg_customers", "country_codes"]),
    N("unique_fct_orders_id", "test", "data test", 605, 30, ["fct_orders"]),
    N("rel_fct_orders_customer", "test", "data test", 605, 262, ["fct_orders", "dim_customers"]),
    N("mart_revenue", "model", "table", 605, 145, ["fct_orders", "dim_customers"], { tags: ["finance"] }),
  ];
  const BY = Object.fromEntries(NODES.map(n => [n.id, n]));
  const W = 150, H = 40;
  const TYPE_COLOR = { source: "#2fa36b", seed: "#14a3a3", model: "#3a6fd0", snapshot: "#8a5cf6", test: "#8d8d99", unit_test: "#e0a800" };
  const isTest = n => n.type === "test" || n.type === "unit_test";
  const children = id => NODES.filter(n => n.parents.includes(id) && !isTest(n)).map(n => n.id);
  function walk(id, next, depth) {
    const out = new Set(); let frontier = [id], d = 0;
    while (frontier.length && (depth === null || d < depth)) {
      const nf = [];
      frontier.forEach(f => next(f).forEach(c => { if (!out.has(c)) { out.add(c); nf.push(c); } }));
      frontier = nf; d++;
    }
    return out;
  }
  const ancestors = (id, depth = null) => walk(id, x => BY[x].parents, depth);
  const descendants = (id, depth = null) => walk(id, children, depth);

  function matchMethod(sel) {
    const m = sel.match(/^([a-z_]+):(.+)$/);
    if (!m) return NODES.filter(n => n.id === sel || n.id === sel.replace(/^source:/, "")).map(n => n.id);
    const [, meth, val] = m;
    if (meth === "tag") return NODES.filter(n => n.tags.includes(val)).map(n => n.id);
    if (meth === "state") return val === "modified" ? NODES.filter(n => n.modified).map(n => n.id) : [];
    if (meth === "resource_type") return NODES.filter(n => n.type === val).map(n => n.id);
    if (meth === "test_type") return NODES.filter(n => (val === "unit" ? n.type === "unit_test" : n.type === "test")).map(n => n.id);
    if (meth === "source") return NODES.filter(n => n.type === "source" && n.id.startsWith(val)).map(n => n.id);
    if (meth === "config.materialized") return NODES.filter(n => n.mat === val).map(n => n.id);
    return [];
  }
  function selectExpr(expr) {
    const out = new Set(); const errors = [];
    expr.trim().split(/\s+/).filter(Boolean).forEach(tok => {
      const m = tok.match(/^(@)?(?:(\d*)\+)?(.+?)(?:\+(\d*))?$/);
      if (!m) { errors.push(tok); return; }
      const [, at, up, body, down] = m;
      const hasUp = tok.replace(/^@/, "").match(/^\d*\+/), hasDown = /\+\d*$/.test(tok);
      const base = matchMethod(body);
      if (!base.length) errors.push(tok);
      base.forEach(id => {
        out.add(id);
        if (hasUp) ancestors(id, up ? +up : null).forEach(a => out.add(a));
        if (hasDown || at) descendants(id, down ? +down : null).forEach(d => out.add(d));
        if (at) descendants(id).forEach(d => ancestors(d).forEach(a => out.add(a)));
      });
    });
    return { ids: out, errors };
  }

  const CMD_TYPES = {
    build: ["model", "seed", "snapshot", "test", "unit_test"], run: ["model"], test: ["test", "unit_test"],
    seed: ["seed"], snapshot: ["snapshot"],
  };

  const st = {
    cmd: "build", select: "", exclude: "", fullRefresh: false, empty: false, defer: false, failFast: false,
    indirect: "eager", noUnit: false, sample: false, protect: false, fail: "none", simVer: "v112",
    statuses: {}, running: false,
  };
  const root = document.getElementById("dagsim");
  const $$ = s => root.querySelector(s);
  const ver = () => getVer() === "both" ? st.simVer : getVer();

  function compute() {
    const types = CMD_TYPES[st.cmd];
    let sel, errors = [];
    if (st.select.trim()) ({ ids: sel, errors } = selectExpr(st.select)); else sel = new Set(NODES.map(n => n.id));
    let exc = new Set();
    if (st.exclude.trim()) { const r = selectExpr(st.exclude); exc = r.ids; errors = errors.concat(r.errors.map(e => "exclude " + e)); }
    const direct = new Set([...sel].filter(id => !exc.has(id)));
    // indirect test selection (applies to build / test when a model is selected)
    const nonTests = new Set([...direct].filter(id => !isTest(BY[id])));
    const ancestorsOfSel = new Set(); nonTests.forEach(id => ancestors(id).forEach(a => ancestorsOfSel.add(a)));
    NODES.filter(isTest).forEach(t => {
      if (direct.has(t.id) || exc.has(t.id) || !st.select.trim()) return;
      const ps = t.parents;
      const ok = st.indirect === "eager" ? ps.some(p => nonTests.has(p))
        : st.indirect === "cautious" ? ps.every(p => nonTests.has(p))
        : st.indirect === "buildable" ? ps.every(p => nonTests.has(p) || ancestorsOfSel.has(p)) && ps.some(p => nonTests.has(p))
        : false;
      if (ok) direct.add(t.id);
    });
    let run = NODES.filter(n => direct.has(n.id) && types.includes(n.type));
    if (st.noUnit) run = run.filter(n => n.type !== "unit_test");
    const runIds = new Set(run.map(n => n.id));
    // execution order: unit tests before their model, tests after parents
    const order = [];
    const visit = (id, seen = new Set()) => {
      if (seen.has(id)) return; seen.add(id);
      BY[id].parents.forEach(p => visit(p, seen));
      const ut = NODES.find(u => u.type === "unit_test" && u.parents[0] === id);
      if (ut && runIds.has(ut.id) && !order.includes(ut.id)) order.push(ut.id);
      if (runIds.has(id) && !order.includes(id)) order.push(id);
    };
    const seen = new Set();
    NODES.filter(n => !isTest(n)).forEach(n => visit(n.id, seen));
    NODES.filter(n => n.type === "test" && runIds.has(n.id)).forEach(n => order.push(n.id));
    // deferral: parents of executed nodes that are not executed themselves
    const deferred = new Set();
    run.forEach(n => {
      const ps = n.type === "unit_test" ? [] : n.parents;
      ps.forEach(p => { if (!runIds.has(p) && BY[p].type !== "source") deferred.add(p); });
    });
    return { run, runIds, order, deferred, errors };
  }

  function effect(n) {
    const v = ver();
    const fr = st.fullRefresh, em = st.empty;
    const sample = st.sample && v === "v112" && n.parents.some(p => BY[p].eventTime);
    const sampleTxt = sample ? " Inputs with event_time are filtered to the last 3 days (--sample)." : "";
    if (n.type === "source") return "not executed (sources are only referenced)";
    if (n.type === "unit_test") return "runs on mocked inputs before fct_orders is built. --empty and --full-refresh don't apply.";
    if (n.type === "test") return em ? "runs against tables built empty, so it passes trivially (it proves the SQL compiles and runs)" : "runs the test query on the real data";
    if (n.type === "seed") {
      if (em) return v === "v112" ? "--empty: table created with the CSV's columns and 0 rows (seed supports --empty in 1.12)" : "--empty does not apply to seeds in 1.8.6: the CSV is loaded normally";
      return fr ? "--full-refresh: table DROPPED and recreated (needed when the CSV's columns change)" : "truncate + insert the CSV rows (the table structure is kept)";
    }
    if (n.type === "snapshot") {
      const base = fr ? "--full-refresh is IGNORED: snapshots are never rebuilt (history is precious). " : "";
      if (em) return base + (v === "v112" ? "--empty: the source reads as 0 rows, so nothing is captured (snapshots support --empty since 1.9)" : "--empty is not supported for snapshots before 1.9");
      return base + "compares the source with current rows and merges the changes";
    }
    // models
    const emptyTxt = em ? " --empty: every ref()/source() becomes a 0-row subquery (where false limit 0), so the relation is built with the right columns and no data." : "";
    if (n.mat === "incremental") {
      if (fr && st.protect) return "--full-refresh ignored because the model has full_refresh: false → normal incremental run (is_incremental() = true)." + emptyTxt + sampleTxt;
      if (fr) return "--full-refresh: table DROPPED and rebuilt from all history (is_incremental() = false)." + emptyTxt + sampleTxt;
      return "is_incremental() = true: only new rows are selected and merged." + emptyTxt + sampleTxt;
    }
    if (n.mat === "view") return "create or replace view." + (fr ? " --full-refresh changes nothing for a view." : "") + emptyTxt + sampleTxt;
    return "create or replace table as select." + (fr ? " It is always a full rebuild, so --full-refresh changes nothing." : "") + emptyTxt + sampleTxt;
  }

  function cmdLine(res) {
    const q = s => /[\s+@:]/.test(s) ? `"${s}"` : s;
    const parts = [`<span class="p">$</span>dbt ${st.cmd}`];
    const f = (flag, val) => parts.push(`<span class="fl">${flag}</span>${val !== undefined ? ` <span class="v">${esc(val)}</span>` : ""}`);
    if (st.select.trim()) f("-s", q(st.select.trim()));
    if (st.exclude.trim()) f("--exclude", q(st.exclude.trim()));
    if (st.fullRefresh) f("--full-refresh");
    if (st.empty) f("--empty");
    if (st.sample && ver() === "v112") f("--sample", '"3 days"');
    if (st.indirect !== "eager") f("--indirect-selection", st.indirect);
    if (st.noUnit) f("--exclude-resource-type", "unit_test");
    if (st.defer) f("--defer");
    if (st.defer || /state:/.test(st.select + st.exclude)) f("--state", "prod-artifacts/");
    if (st.failFast) f("--fail-fast");
    return parts.join(" ");
  }

  function draw(res) {
    const parts = [];
    // edges
    NODES.forEach(n => n.parents.forEach(p => {
      const a = BY[p], b = n;
      const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2;
      const hot = res.runIds.has(n.id) && (res.runIds.has(p) || res.deferred.has(p));
      const tst = isTest(n);
      const [sx, sy, ex, ey] = tst && b.x <= a.x + W ? [a.x + W / 2, a.y + H, b.x + W / 2, b.y] : [x1, y1, x2, y2];
      const d = tst && b.x <= a.x + W ? `M${sx} ${sy} L${ex} ${ey}` : `M${sx} ${sy} C${sx + 40} ${sy} ${ex - 40} ${ey} ${ex} ${ey}`;
      parts.push(`<path class="dag-edge ${hot ? "hot" : ""}" d="${d}" ${tst ? 'stroke-dasharray="3 3"' : ""}/>`);
    }));
    // nodes
    NODES.forEach(n => {
      const on = res.runIds.has(n.id), def = res.deferred.has(n.id) && st.defer;
      const devref = res.deferred.has(n.id) && !st.defer;
      const s = st.statuses[n.id];
      const col = TYPE_COLOR[n.type];
      const fill = s === "error" ? "var(--del)" : s === "skipped" ? "var(--gone)" : s === "success" ? "var(--new)" : on ? "color-mix(in srgb, " + col + " 16%, var(--card))" : "var(--card)";
      const stroke = def ? "var(--accent)" : on ? col : "var(--line)";
      parts.push(`<g class="dag-node ${on || def || devref ? "" : "dim"}" data-id="${n.id}">
        <rect class="body" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="9" fill="${fill}" stroke="${stroke}" stroke-width="${on || def ? 1.8 : 1}" ${def || devref ? 'stroke-dasharray="5 3"' : ""}/>
        <rect x="${n.x}" y="${n.y}" width="5" height="${H}" rx="2" fill="${col}"/>
        <text x="${n.x + 12}" y="${n.y + 17}" font-size="${Math.min(11, 225 / n.id.length).toFixed(1)}" fill="var(--ink)" font-weight="600">${n.id}</text>
        <text x="${n.x + 12}" y="${n.y + 31}" font-size="9.5" fill="var(--muted)">${n.mat}${n.tags.length ? " · #" + n.tags[0] : ""}${n.modified ? " · modified" : ""}</text>
        ${def ? `<text x="${n.x + W - 6}" y="${n.y + 31}" font-size="9.5" text-anchor="end" fill="var(--accent)" font-weight="700">↗ prod</text>` : ""}
        ${devref ? `<text x="${n.x + W - 6}" y="${n.y + 31}" font-size="9.5" text-anchor="end" fill="#e0a800" font-weight="700">dev?</text>` : ""}
        ${s ? `<g><rect x="${n.x + W - 50}" y="${n.y - 9}" width="50" height="16" rx="8" fill="${s === "error" ? "#e0442f" : s === "skipped" ? "#8d8d99" : "#1f9d6b"}"/>
          <text x="${n.x + W - 25}" y="${n.y + 2.5}" font-size="9" text-anchor="middle" font-weight="700" fill="#fff">${s === "success" ? "✓ OK" : s === "error" ? "✗ ERROR" : "SKIP"}</text></g>` : ""}
      </g>`);
    });
    $$("#dag-svg").innerHTML = `<svg viewBox="0 -12 770 327">${parts.join("")}</svg>`;
  }

  function render(keepStatus = false) {
    if (!keepStatus) st.statuses = {};
    const res = compute();
    $$("#dag-cmd").innerHTML = cmdLine(res);
    draw(res);
    // effect list
    const fx = res.order.map(id => `<div><b>${id}</b>: ${esc(effect(BY[id]))}</div>`);
    if (res.deferred.size) {
      fx.push(st.defer
        ? `<div style="border-color:var(--accent)"><b>--defer</b>: ${[...res.deferred].map(esc).join(", ")} aren't built, so their ref() resolves to the <b>production</b> relations from the manifest in --state.</div>`
        : `<div style="border-color:#e0a800"><b>no --defer</b>: ${[...res.deferred].map(esc).join(", ")} aren't selected, so ref() points to <b>your dev schema</b>. Those relations must already exist there, or the build fails. Add --defer --state to read them from prod.</div>`);
    }
    if (!res.order.length) fx.push(`<div>Nothing to execute: the selection is empty for <b>dbt ${st.cmd}</b>.</div>`);
    if (res.errors.length) fx.push(`<div style="border-color:#e0442f">Selector matched nothing: ${res.errors.map(esc).join(", ")}</div>`);
    $$("#dag-fx").innerHTML = `<div class="pane-title"><span>Execution plan · ${res.order.length} node${res.order.length > 1 ? "s" : ""} in this order</span></div>` + fx.join("");
    // controls state
    root.querySelectorAll(".toggle[data-k]").forEach(t => {
      const k = t.dataset.k; const inp = t.querySelector("input");
      const dis = (k === "sample" && ver() === "v18");
      inp.checked = !!st[k] && !dis; inp.disabled = dis;
      t.classList.toggle("on", inp.checked); t.classList.toggle("disabled", dis);
      t.title = dis ? "--sample arrives in dbt 1.10" : "";
    });
    $$("#dag-simver-wrap").style.display = getVer() === "both" ? "" : "none";
    return res;
  }

  async function play() {
    if (st.running) return;
    st.running = true; $$("#dag-run").disabled = true;
    const res = render();
    let stopped = false; const failed = new Set();
    for (const id of res.order) {
      const n = BY[id];
      const blocked = n.parents.some(p => failed.has(p) || st.statuses[p] === "skipped" && res.runIds.has(p));
      if (stopped || blocked) { st.statuses[id] = "skipped"; if (blocked) failed.add(id); render(true); continue; }
      const g = root.querySelector(`.dag-node[data-id="${CSS.escape(id)}"]`);
      if (g) g.classList.add("pulse");
      await new Promise(r => setTimeout(r, 420));
      st.statuses[id] = id === st.fail ? "error" : "success";
      if (id === st.fail) { failed.add(id); if (st.failFast) stopped = true; }
      render(true);
    }
    const errs = Object.values(st.statuses).filter(s => s === "error").length, sk = Object.values(st.statuses).filter(s => s === "skipped").length;
    $$("#dag-fx").insertAdjacentHTML("afterbegin", `<div class="verdict ${errs ? "bad" : "ok"}">${errs ? `✗ ${errs} error, ${sk} skipped. ${st.failFast ? "--fail-fast stopped everything that was still pending." : "Without --fail-fast, only the descendants of the failed node are skipped; independent branches keep going."} Next: <code>dbt retry</code> re-runs from the failure point.` : `✓ Completed: ${res.order.length} nodes`}</div>`);
    st.running = false; $$("#dag-run").disabled = false;
  }

  if (root) {
    segmented($$("#dag-cmdsel"), Object.keys(CMD_TYPES).map(c => ({ value: c, label: c })), st.cmd, v => { st.cmd = v; render(); });
    segmented($$("#dag-indirect"), ["eager", "cautious", "buildable", "empty"].map(v => ({ value: v, label: v })), st.indirect, v => { st.indirect = v; render(); });
    segmented($$("#dag-fail"), ["none", "stg_customers", "fct_orders"].map(v => ({ value: v, label: v })), st.fail, v => { st.fail = v; render(); });
    segmented($$("#dag-simver"), [{ value: "v18", label: "1.8.6" }, { value: "v112", label: "1.12" }], st.simVer, v => { st.simVer = v; render(); });
    const selIn = $$("#dag-select"), excIn = $$("#dag-exclude");
    selIn.addEventListener("input", () => { st.select = selIn.value; render(); });
    excIn.addEventListener("input", () => { st.exclude = excIn.value; render(); });
    root.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
      selIn.value = st.select = b.dataset.preset; render();
    }));
    root.querySelectorAll(".toggle[data-k] input").forEach(inp => inp.addEventListener("change", () => {
      st[inp.closest(".toggle").dataset.k] = inp.checked; render();
    }));
    $$("#dag-run").addEventListener("click", play);
    document.addEventListener("verchange", () => render());
    render();
  }

  // ------------------------------------------------------------ flag cards
  const V18 = '<span class="tag v18">1.8.6</span>', V112 = '<span class="tag v112">1.12</span>';
  const yes = t => `<span class="chip y">${t}</span>`, no = t => `<span class="chip n">${t}</span>`;
  const env = (a, b) => `<span class="only-v18"><code>${a}</code></span><span class="only-v112"> <code>${b}</code></span>`;
  const FLAGS = {
    build: [
      { name: "--full-refresh", alias: "-f", cmds: ["build", "run", "seed"],
        what: "Ignores the existing table. Incremental models are dropped and rebuilt from all history (<code>is_incremental()</code> returns false), and seeds are dropped and recreated. Views and tables don't change (they are always rebuilt). <strong>Snapshots are never full-refreshed.</strong>",
        how: `dbt run -s fct_orders --full-refresh
dbt seed --full-refresh -s country_codes   <span class="c"># CSV columns changed</span>`,
        when: "After changing an incremental model's logic or columns, after fixing bad historic data, or when a seed's columns change. Avoid it on huge or append-only tables whose source no longer holds all the history.",
        where: [yes("CLI"), yes("env " + env("DBT_FULL_REFRESH", "DBT_ENGINE_FULL_REFRESH")), yes("model config <code>full_refresh</code>"), no("flags:")],
        extra: `<pre class="code"><span class="c"># protect a model from accidental rebuilds: config beats the CLI flag</span>
models:
  my_project:
    events:
      <span class="h">+full_refresh: false</span></pre>` },
      { name: "--empty", alias: "", cmds: ["build", "run", "+snapshot 1.9", "+seed 1.12"],
        what: "Runs your real SQL but replaces every <code>ref()</code> and <code>source()</code> with a zero-row subquery (<code>where false limit 0</code>). Every relation gets created with the right columns and <strong>no data</strong>, so it's a cheap, schema-only dry run. In Jinja, <code>flags.EMPTY</code> tells you it's on.",
        how: `dbt build --empty                         <span class="c"># whole project, schema only</span>
dbt run -s state:modified+ --empty --defer --state prod/
<span class="c">-- opt one input out (e.g. a hook needs the real table):</span>
{{ source(<span class="s">'sys'</span>, <span class="s">'customers'</span>).render() }}`,
        when: "In CI to validate SQL, columns and contracts in seconds, to create the parent tables unit tests need, and for a first build in a new dev schema. Data tests pass trivially on empty tables, so don't read anything into them.",
        where: [yes("CLI"), yes("env " + env("DBT_EMPTY", "DBT_ENGINE_EMPTY")), no("flags:"), no("config")],
        vers: `${V18} run and build. Snapshots and seeds still read real data. ${V112} snapshots too (1.9), plus <code>dbt seed --empty</code> (1.12).` },
      { name: "--sample", alias: "", cmds: ["build", "run"], v112only: true,
        what: "Sample mode (1.10+): inputs that have an <code>event_time</code> config are filtered to a time window, so a dev build covers recent data only. Inputs without <code>event_time</code> are read in full.",
        how: `dbt build --sample=<span class="s">"3 days"</span>
dbt run --sample=<span class="s">"{'start': '2024-07-01', 'end': '2024-07-08'}"</span>`,
        when: "Development and CI on big fact tables, when you want real but small data (unlike --empty, which gives none). Configure <code>event_time</code> on your sources and staging models.",
        where: [yes("CLI"), yes("env <code>DBT_ENGINE_SAMPLE</code>"), no("flags:"), no("config")],
        vers: `${V18} not available. In 1.8.6, use a var + <code>{% if target.name == 'dev' %} where … {% endif %}</code> in the model.` },
      { name: "--event-time-start / --event-time-end", alias: "", cmds: ["build", "run"], v112only: true,
        what: "Microbatch backfill (1.9+): rebuilds only the batches between the two dates, one query per batch. Both flags are required together.",
        how: `dbt run -s fct_events --event-time-start <span class="s">"2024-09-01"</span> --event-time-end <span class="s">"2024-09-04"</span>`,
        when: "Late-arriving data beyond the <code>lookback</code>, or reprocessing a period after a bug fix, without a full refresh.",
        where: [yes("CLI"), yes("env <code>DBT_ENGINE_EVENT_TIME_START/END</code>"), no("flags:")],
        vers: `${V18} not available: filter on <code>var('from')</code> inside <code>is_incremental()</code> instead.` },
    ],
    select: [
      { name: "--select / --exclude", alias: "-s", cmds: ["build", "run", "test", "seed", "snapshot", "ls", "compile", "clone"],
        what: "Chooses the nodes. Space = union, comma = intersection. Graph operators: <code>+model</code> (parents), <code>model+</code> (children), <code>2+model</code> (2 levels), <code>@model</code> (children and all their parents). Methods: <code>tag:</code>, <code>path:</code>, <code>source:</code>, <code>state:modified</code>, <code>resource_type:</code>, <code>test_type:</code>, <code>config.materialized:</code>…",
        how: `dbt build -s <span class="s">"+fct_orders"</span> --exclude <span class="s">"tag:slow"</span>
dbt build -s <span class="s">"tag:finance,config.materialized:incremental"</span>   <span class="c"># intersection</span>`,
        when: "Always in dev (build only what you touch plus its children). In prod, split jobs by tag or folder.",
        where: [yes("CLI"), yes("selectors.yml → --selector"), no("env"), no("flags:")],
        vers: `${V18} <code>--models/-m</code> still works silently. ${V112} <code>--models/-m</code> warns since 1.10 (an error in v2), and there is a new <code>selector:name</code> method usable inside <code>-s</code> (1.12).` },
      { name: "--selector", alias: "", cmds: ["build", "run", "test", "ls", "…"],
        what: "Runs a named selection defined in <code>selectors.yml</code> (YAML union/intersection/exclude, with a possible default).",
        how: `<span class="c"># selectors.yml</span>
selectors:
  - name: nightly
    definition:
      union:
        - method: tag
          value: nightly
        - exclude: [{method: tag, value: slow}]
dbt build --selector nightly`,
        when: "Production jobs: the selection is versioned and reviewed instead of hidden in a scheduler command.",
        where: [yes("CLI"), yes("selectors.yml"), no("env")],
        vers: `${V112} combining <code>--selector</code> with <code>-s</code> now warns (--selector wins). Use <code>-s "selector:nightly"</code> to combine them.` },
      { name: "--resource-type / --exclude-resource-type", alias: "", cmds: ["build", "list", "clone", "+test 1.9"],
        what: "A final filter on node types after selection: <code>model</code>, <code>seed</code>, <code>snapshot</code>, <code>test</code>, <code>unit_test</code>, <code>source</code>…",
        how: `dbt build --exclude-resource-type unit_test     <span class="c"># prod: skip unit tests</span>
dbt test --resource-type unit_test               <span class="c"># 1.9+</span>`,
        when: "Production: unit tests test code, not data, so exclude them from prod runs.",
        where: [yes("CLI"), yes("env " + env("DBT_EXCLUDE_RESOURCE_TYPES", "DBT_ENGINE_EXCLUDE_RESOURCE_TYPES")), no("flags:")] },
      { name: "--indirect-selection", alias: "", cmds: ["build", "test"],
        what: "Which tests come along when you select models. <code>eager</code> (default): any test touching a selected model. <code>cautious</code>: only tests whose parents are <em>all</em> selected. <code>buildable</code>: parents selected or upstream of the selection. <code>empty</code>: none.",
        how: `dbt build -s fct_orders --indirect-selection cautious`,
        when: "Use <code>cautious</code> when relationship tests to unselected models fail on stale dev data, and <code>empty</code> for a pure run without tests.",
        where: [yes("CLI"), yes("env " + env("DBT_INDIRECT_SELECTION", "DBT_ENGINE_INDIRECT_SELECTION")), yes("flags:")] },
    ],
    state: [
      { name: "--state + state:modified", alias: "", cmds: ["build", "run", "test", "ls", "compile", "clone"],
        what: "Compares your project with a <code>manifest.json</code> from another run (usually prod) to select what changed: <code>state:modified</code>, <code>state:new</code>, <code>state:modified.body</code>…",
        how: `dbt build -s <span class="s">"state:modified+"</span> --state ./prod-artifacts`,
        when: "Slim CI: build and test only the modified models and their children.",
        where: [yes("CLI"), yes("env " + env("DBT_STATE", "DBT_ENGINE_STATE")), no("flags:")],
        vers: `${V112} the behaviour flag <code>state_modified_compare_more_unrendered_values</code> (on by default in 1.12) reduces false "modified" results caused by env-specific configs.` },
      { name: "--defer", alias: "+ --favor-state", cmds: ["build", "run", "test", "compile"],
        what: "For every <code>ref()</code> to a model you are <em>not</em> building, read it from the prod relation in the <code>--state</code> manifest instead of your dev schema. <code>--favor-state</code> reads prod even if a dev copy exists.",
        how: `dbt build -s <span class="s">"state:modified+"</span> --defer --state ./prod-artifacts`,
        when: "CI and dev: no need to rebuild the whole upstream graph. Pair it with <code>--empty</code> for very fast schema checks.",
        where: [yes("CLI"), yes("env " + env("DBT_DEFER", "DBT_ENGINE_DEFER")), no("flags:")] },
      { name: "dbt retry", alias: "command", cmds: ["retry"],
        what: "Re-runs the previous command from the point of failure (errored and skipped nodes only), reusing its flags, vars and <code>--full-refresh</code>. On microbatch models (1.9+) it retries only the failed batches.",
        how: `dbt build -s tag:nightly      <span class="c"># fails on dim_customers</span>
dbt retry                     <span class="c"># fix, then resume from there</span>`,
        when: "Any long production run that failed halfway.",
        where: [yes("CLI"), no("flags:")] },
    ],
    run: [
      { name: "--fail-fast", alias: "-x", cmds: ["build", "run", "test", "seed", "snapshot"],
        what: "Stops the whole invocation at the first failure. Without it, only the children of the failed node are skipped, and other branches continue.",
        how: `dbt build -x`,
        when: "CI (fail quickly and save warehouse time). In prod, usually leave it off so independent branches still deliver.",
        where: [yes("CLI"), yes("env " + env("DBT_FAIL_FAST", "DBT_ENGINE_FAIL_FAST")), yes("flags:")],
        vers: `${V112} a model config <code>on_error: continue</code> (1.12) lets children of a failed model run anyway.` },
      { name: "--target / --threads / --vars", alias: "-t", cmds: ["all"],
        what: "<code>--target</code> picks the connection output in <code>profiles.yml</code>. <code>--threads</code> sets how many nodes run in parallel. <code>--vars</code> overrides <code>var()</code> values (YAML/JSON string).",
        how: `dbt build -t prod --threads 16 --vars <span class="s">'{"start_date": "2024-01-01"}'</span>`,
        when: "Target: one per environment. Threads: raise until the warehouse queues. Vars: parameterised backfills and feature switches.",
        where: [yes("CLI"), yes("profiles.yml (target, threads)"), yes("dbt_project.yml vars:"), yes("env " + env("DBT_TARGET", "DBT_ENGINE_TARGET")), '<span class="chip y only-v112">vars.yml (1.12)</span>'] },
      { name: "--warn-error / --warn-error-options", alias: "", cmds: ["all"],
        what: "Turns warnings (all, or chosen ones) into errors, or silences them.",
        how: `dbt build --warn-error-options <span class="s">'{"error": ["NoNodesForSelectionCriteria"], "silence": ["Deprecations"]}'</span>`,
        when: "CI: fail on new deprecations or unused configs before they reach prod.",
        where: [yes("CLI"), yes("env"), yes("flags:")],
        vers: `${V18} keys <code>include</code> / <code>exclude</code>. ${V112} renamed <code>error</code> / <code>warn</code> (1.10, old names deprecated), plus <code>silence</code>.` },
      { name: "--store-failures", alias: "", cmds: ["test", "build"],
        what: "Saves the rows returned by failing tests into tables in <code>&lt;schema&gt;_dbt_test__audit</code>.",
        how: `dbt test -s fct_orders --store-failures`,
        when: "To debug failures, or to feed a data-quality dashboard. Set it per test with <code>config: store_failures: true</code> (or <code>store_failures_as: view</code>).",
        where: [yes("CLI"), yes("env"), yes("test config"), no("flags:")] },
    ],
    debug: [
      { name: "--debug / --log-level / --quiet", alias: "-d -q", cmds: ["all"],
        what: "Verbosity. <code>--debug</code> prints every SQL statement and timing. <code>--log-format json</code> gives machine-readable logs. <code>-q</code> shows only errors (plus <code>{{ print() }}</code> output).",
        how: `dbt --debug run -s fct_orders
dbt build --log-format json --log-level warn`,
        when: "Debug a macro or a strange DDL, or ship logs to an observability tool.",
        where: [yes("CLI"), yes("env"), yes("flags:")] },
      { name: "--no-partial-parse", alias: "", cmds: ["all"],
        what: "Forces a full re-parse of the project instead of reusing <code>target/partial_parse.msgpack</code>.",
        how: `dbt parse --no-partial-parse`,
        when: "Weird stale behaviour after changing env vars, packages or macros, or in CI from a clean checkout.",
        where: [yes("CLI"), yes("env"), yes("flags:")],
        vers: `${V112} <code>--use-v2-parser</code> (beta, 1.12) parses with the Rust engine, 5–10× faster on big projects.` },
    ],
  };

  function card(f) {
    return `<article class="flag">
      <div class="flag-head"><span class="flag-name">${f.name}</span>${f.alias ? `<span class="flag-alias">${f.alias}</span>` : ""}${f.v112only ? '<span class="tag v112">1.9+ / 1.10+</span>' : ""}</div>
      <div class="flag-cmds">${f.cmds.map(c => `<span>${c}</span>`).join("")}</div>
      <dl>
        <dt>What</dt><dd>${f.what}</dd>
        <dt>How</dt><dd><pre class="code">${f.how}</pre>${f.extra || ""}</dd>
        <dt>Best for</dt><dd>${f.when}</dd>
        <dt>Where</dt><dd><div class="chips">${f.where.join("")}</div></dd>
        ${f.vers ? `<dt>Versions</dt><dd>${f.vers}</dd>` : ""}
      </dl></article>`;
  }
  Object.entries(FLAGS).forEach(([grp, list]) => {
    const el = document.getElementById("flags-" + grp);
    if (el) el.innerHTML = list.map(card).join("");
  });
})();
