// =====================================================================
// State page: (1) state:modified diff simulator (prod manifest vs branch)
// (2) result: selectors on a previous run_results.json
// =====================================================================
(function () {
  const N = (id, type, x, y, parents = [], o = {}) => ({ id, type, x, y, parents, ...o });
  const NODES = [
    N("shop.orders", "source", 10, 20), N("shop.customers", "source", 10, 110),
    N("country_codes", "seed", 10, 200),
    N("stg_orders", "model", 190, 20, ["shop.orders"]), N("stg_customers", "model", 190, 110, ["shop.customers"]),
    N("fct_orders", "model", 370, 20, ["stg_orders"], { marts: 1, macro: 1 }),
    N("dim_customers", "model", 370, 140, ["stg_customers", "country_codes"], { marts: 1 }),
    N("mart_revenue", "model", 550, 70, ["fct_orders", "dim_customers"], { marts: 1 }),
    N("rpt_churn", "model", 550, 200, ["dim_customers"], { isNew: 1 }),
    N("unique_fct_orders_id", "test", 550, 0, ["fct_orders"]),
    N("rel_mart_customer", "test", 730, 120, ["mart_revenue", "dim_customers"]),
  ];
  const BY = Object.fromEntries(NODES.map(n => [n.id, n]));
  const kids = id => NODES.filter(n => n.parents.includes(id) && n.type !== "test").map(n => n.id);
  const desc = id => { const s = new Set(), q = [id]; while (q.length) kids(q.shift()).forEach(c => { if (!s.has(c)) { s.add(c); q.push(c); } }); return s; };
  const COL = { source: "#2fa36b", seed: "#14a3a3", model: "#3a6fd0", test: "#8d8d99" };

  // ------------------------------------------------ 1 · diff simulator
  const sim = document.getElementById("statesim2");
  if (sim) {
    const $$ = s => sim.querySelector(s);
    const CH = {
      body: { l: "edit SQL of stg_orders", node: "stg_orders", kind: "body" },
      config: { l: "dim_customers: view → table", node: "dim_customers", kind: "configs" },
      macro: { l: "edit macro cents_to_dollars", node: "fct_orders", kind: "macros" },
      contract: { l: "fct_orders: amount int → varchar (contract)", node: "fct_orders", kind: "contract" },
      seed: { l: "edit a row of country_codes.csv", node: "country_codes", kind: "body" },
      fresh: { l: "add model rpt_churn", node: "rpt_churn", kind: "new" },
      tag: { l: "add a tag on mart_revenue", node: "mart_revenue", kind: "ignored" },
      env: { l: "env-aware config on marts/", node: null, kind: "env" },
    };
    const SEL = ["state:modified", "state:modified+", "state:modified.body", "state:modified.configs", "state:modified.macros",
      "state:modified.contract", "state:new", "state:old", "state:unmodified"];
    const st = { on: new Set(["body", "macro", "fresh", "env"]), sel: "state:modified+", defer: true };

    function reasons() {
      const r = {}; const add = (id, k) => { (r[id] = r[id] || new Set()).add(k); };
      st.on.forEach(c => {
        const ch = CH[c];
        if (ch.kind === "env") { if (getVer() === "v18") NODES.filter(n => n.marts).forEach(n => add(n.id, "configs*")); }
        else if (ch.kind !== "ignored") add(ch.node, ch.kind);
      });
      return r;
    }
    function select(r) {
      const has = (id, k) => r[id] && [...r[id]].some(x => x.replace("*", "") === k);
      const isNew = id => BY[id].isNew && st.on.has("fresh");
      const exists = id => !BY[id].isNew || false;
      const all = NODES.filter(n => n.type !== "source" && (!n.isNew || st.on.has("fresh"))).map(n => n.id);
      let base;
      const s = st.sel.replace("+", "");
      if (s === "state:modified") base = all.filter(id => r[id] || isNew(id));
      else if (s === "state:new") base = all.filter(isNew);
      else if (s === "state:old") base = all.filter(id => !isNew(id));
      else if (s === "state:unmodified") base = all.filter(id => !isNew(id) && !r[id] && BY[id].type !== "test");
      else base = all.filter(id => has(id, s.split(".")[1]));
      // tests on modified resources come along (state:modified includes them)
      const set = new Set(base);
      if (s.startsWith("state:modified")) NODES.filter(n => n.type === "test").forEach(t => { if (t.parents.some(p => set.has(p))) set.add(t.id); });
      if (st.sel.endsWith("+")) [...set].forEach(id => desc(id).forEach(d => { if (!BY[d].isNew || st.on.has("fresh")) set.add(d); }));
      if (st.sel.endsWith("+")) NODES.filter(n => n.type === "test").forEach(t => { if (t.parents.some(p => set.has(p))) set.add(t.id); });
      return set;
    }
    function render() {
      const r = reasons(), sel = select(r);
      const v18 = getVer() === "v18";
      const needs19 = (st.sel === "state:old" || st.sel === "state:unmodified") && v18;
      // controls
      $$("#sd-changes").innerHTML = Object.entries(CH).map(([k, c]) => `<label class="toggle ${st.on.has(k) ? "on" : ""}"><input type="checkbox" data-c="${k}" ${st.on.has(k) ? "checked" : ""}>${esc(c.l)}</label>`).join("");
      $$("#sd-changes").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { i.checked ? st.on.add(i.dataset.c) : st.on.delete(i.dataset.c); render(); }));
      segmented($$("#sd-sel"), SEL.map(s => ({ value: s, label: s + ((s === "state:old" || s === "state:unmodified") ? " (1.9+)" : "") })), st.sel, v => { st.sel = v; render(); });
      // DAG
      const W = 150, H = 36, parts = [];
      NODES.forEach(n => n.parents.forEach(p => {
        if (n.isNew && !st.on.has("fresh")) return;
        const a = BY[p], hot = sel.has(n.id) && (sel.has(p));
        const d = n.x <= a.x + W ? `M${a.x + W / 2} ${a.y + H} L${n.x + W / 2} ${n.y}` : `M${a.x + W} ${a.y + H / 2} C${a.x + W + 25} ${a.y + H / 2} ${n.x - 25} ${n.y + H / 2} ${n.x} ${n.y + H / 2}`;
        parts.push(`<path class="dag-edge ${hot ? "hot" : ""}" d="${d}" ${n.type === "test" ? 'stroke-dasharray="3 3"' : ""}/>`);
      }));
      NODES.forEach(n => {
        if (n.isNew && !st.on.has("fresh")) {
          parts.push(`<rect x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="8" fill="none" stroke="var(--line)" stroke-dasharray="4 4"/><text x="${n.x + W / 2}" y="${n.y + 22}" text-anchor="middle" font-size="10" fill="var(--muted)">(not in branch)</text>`);
          return;
        }
        const on = !needs19 && sel.has(n.id), rs = r[n.id] ? [...r[n.id]] : [];
        if (n.isNew) rs.push("new");
        const col = COL[n.type];
        const chips = rs.map(k => {
          const fp = k.endsWith("*"); const lab = { body: "body", configs: "config", "configs*": "config ⚠", macros: "macro", contract: "contract", new: "new" }[k] || k;
          return `<tspan fill="${fp ? "#e0442f" : k === "contract" ? "#e0442f" : "var(--accent)"}" font-weight="700">${lab}</tspan>`;
        }).join(" · ");
        parts.push(`<g class="dag-node ${on ? "" : "dim"} ${on ? "pulse" : ""}">
          <rect class="body" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="8" fill="${on ? `color-mix(in srgb, ${col} 20%, var(--card))` : "var(--card)"}" stroke="${on ? col : "var(--line)"}" stroke-width="${on ? 1.8 : 1}"/>
          <rect x="${n.x}" y="${n.y}" width="5" height="${H}" rx="2" fill="${col}"/>
          <text x="${n.x + 11}" y="${n.y + 15}" font-size="${Math.min(10.5, 220 / n.id.length).toFixed(1)}" font-weight="600" fill="var(--ink)">${n.id}</text>
          <text x="${n.x + 11}" y="${n.y + 29}" font-size="9">${chips || `<tspan fill="var(--muted)">${n.type}</tspan>`}</text></g>`);
        if (!on && st.defer && n.type !== "test" && n.type !== "source" && NODES.some(c => sel.has(c.id) && c.parents.includes(n.id)) && !needs19)
          parts.push(`<text x="${n.x + W - 6}" y="${n.y - 4}" text-anchor="end" font-size="9.5" font-weight="700" fill="var(--accent)">↗ read from prod</text>`);
      });
      $$("#sd-dag").innerHTML = `<svg viewBox="0 -12 890 262" style="min-width:740px">${parts.join("")}</svg>`;
      // command + verdict
      $$("#sd-cmd").innerHTML = `<span class="p">$</span>dbt build <span class="fl">-s</span> <span class="v">"${st.sel}"</span> <span class="fl">--state</span> <span class="v">prod-artifacts/</span>${st.defer ? ' <span class="fl">--defer</span>' : ""}`;
      const notes = [];
      if (needs19) notes.push(`<div class="verdict bad">✗ <code>${st.sel}</code> doesn't exist in 1.8.6 (added in 1.9). In 1.8.6, use <code>--exclude state:modified</code>.</div>`);
      else {
        const models = [...sel].filter(id => BY[id].type !== "test");
        notes.push(`<div class="verdict ok">${models.length} node${models.length !== 1 ? "s" : ""} built + ${sel.size - models.length} test${sel.size - models.length !== 1 ? "s" : ""}, out of ${NODES.filter(n => n.type !== "source").length - (st.on.has("fresh") ? 0 : 1)} nodes and tests in the project.</div>`);
      }
      if (st.on.has("contract") && st.sel.startsWith("state:modified") && !needs19) notes.push(`<div class="verdict bad">✗ <b>Breaking change</b>: the contracted column <code>amount</code> changes type. dbt raises an error during the state comparison. Revert it, or create a new model <b>version</b> (see the Versioning page).</div>`);
      if (st.on.has("env")) notes.push(v18
        ? `<div class="verdict bad">⚠ <b>False positive (1.8.6)</b>: <code>+materialized: "{{ 'table' if target.name == 'prod' else 'view' }}"</code> renders differently in CI and in prod, so every marts model looks modified (config ⚠).</div>`
        : `<div class="verdict ok">✓ <b>1.12</b> compares the <em>unrendered</em> config (flag <code>state_modified_compare_more_unrendered_values</code>, introduced in 1.9 and on by default in 1.12), so the env-aware config isn't a change. Build the state with 1.9+ for this to work.</div>`);
      if (st.on.has("tag")) notes.push(`<div class="verdict">ℹ Changing <code>tags</code> / <code>meta</code> (or a description without persist_docs) doesn't make a node modified.</div>`);
      $$("#sd-notes").innerHTML = notes.join("");
    }
    $$("#sd-defer").addEventListener("change", e => { st.defer = e.target.checked; e.target.closest(".toggle").classList.toggle("on", st.defer); render(); });
    document.addEventListener("verchange", render);
    render();
  }

  // ------------------------------------------------ 2 · result: selectors
  const rs = document.getElementById("resultsim");
  if (rs) {
    const $$ = s => rs.querySelector(s);
    const LAST = { country_codes: "success", stg_orders: "success", stg_customers: "success", fct_orders: "error", dim_customers: "success",
      mart_revenue: "skipped", rpt_churn: "success", unique_fct_orders_id: "skipped", rel_mart_customer: "skipped" };
    const SELS = {
      "result:error": "nodes that errored",
      "result:error+": "errored nodes and everything downstream",
      "result:skipped+": "nodes skipped because a parent failed, plus their children",
      "result:error+ result:skipped+": "everything that didn't complete",
      "dbt retry": "re-runs the errored + skipped nodes of the last command, with the same flags",
    };
    let cur = "result:error+";
    function pick() {
      if (cur === "dbt retry") return new Set(Object.keys(LAST).filter(k => LAST[k] === "error" || LAST[k] === "skipped"));
      const out = new Set();
      cur.split(" ").forEach(t => {
        const plus = t.endsWith("+"), status = t.replace("+", "").split(":")[1];
        Object.keys(LAST).filter(k => LAST[k] === status).forEach(k => { out.add(k); if (plus) desc(k).forEach(d => { if (LAST[d]) out.add(d); }); });
      });
      NODES.filter(n => n.type === "test").forEach(t => { if (t.parents.some(p => out.has(p)) && (cur !== "result:error")) out.add(t.id); });
      return out;
    }
    function render() {
      const sel = pick(), W = 150, H = 36, parts = [];
      NODES.forEach(n => n.parents.forEach(p => {
        const a = BY[p];
        const d = n.x <= a.x + W ? `M${a.x + W / 2} ${a.y + H} L${n.x + W / 2} ${n.y}` : `M${a.x + W} ${a.y + H / 2} C${a.x + W + 25} ${a.y + H / 2} ${n.x - 25} ${n.y + H / 2} ${n.x} ${n.y + H / 2}`;
        parts.push(`<path class="dag-edge ${sel.has(n.id) && sel.has(p) ? "hot" : ""}" d="${d}"/>`);
      }));
      NODES.forEach(n => {
        const s = LAST[n.id], on = sel.has(n.id);
        const badge = s ? { success: ["✓ success", "#1f9d6b"], error: ["✗ error", "#e0442f"], skipped: ["skipped", "#8d8d99"] }[s] : null;
        parts.push(`<g class="dag-node ${on ? "pulse" : ""}">
          <rect class="body" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="8" fill="${on ? "color-mix(in srgb, var(--accent) 18%, var(--card))" : "var(--card)"}" stroke="${on ? "var(--accent)" : "var(--line)"}" stroke-width="${on ? 2 : 1}" opacity="${n.type === "source" ? .5 : 1}"/>
          <text x="${n.x + 10}" y="${n.y + 15}" font-size="${Math.min(10.5, 220 / n.id.length).toFixed(1)}" font-weight="600" fill="var(--ink)">${n.id}</text>
          ${badge ? `<text x="${n.x + 10}" y="${n.y + 29}" font-size="9" font-weight="700" fill="${badge[1]}">last run: ${badge[0]}</text>` : `<text x="${n.x + 10}" y="${n.y + 29}" font-size="9" fill="var(--muted)">${n.type}</text>`}</g>`);
      });
      $$("#rs-dag").innerHTML = `<svg viewBox="0 -4 890 254" style="min-width:740px">${parts.join("")}</svg>`;
      $$("#rs-cmd").innerHTML = cur === "dbt retry" ? `<span class="p">$</span>dbt retry` : `<span class="p">$</span>dbt build <span class="fl">-s</span> <span class="v">"${cur}"</span> <span class="fl">--state</span> <span class="v">target_last_run/</span>`;
      $$("#rs-out").innerHTML = `<b>${sel.size}</b> nodes: ${[...sel].join(", ")}. <span class="muted">${esc(SELS[cur])}.</span>`;
    }
    segmented($$("#rs-sel"), Object.keys(SELS).map(s => ({ value: s, label: s })), cur, v => { cur = v; render(); });
    render();
  }
})();
