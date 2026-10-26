// =====================================================================
// Selectors page
//  (1) a selection engine + stage-by-stage animation on a "tickets" DAG
//  (2) a 3-level orchestration demo: job → subjobs (layer) → leaves (tag)
// =====================================================================
(function () {
  // ------------------------------------------------------------ project
  const P = "my_project";
  const N = (id, type, x, y, o = {}) => ({ id, type, x, y, parents: [], tags: [], path: "", mat: type === "model" ? "view" : type, ...o });
  const NODES = [
    N("zendesk.tickets", "source", 10, 20, { path: "models/tickets/staging/_zendesk__sources.yml", src: "zendesk" }),
    N("zendesk.users", "source", 10, 90, { path: "models/tickets/staging/_zendesk__sources.yml", src: "zendesk" }),
    N("jira.issues", "source", 10, 160, { path: "models/tickets/staging/_jira__sources.yml", src: "jira" }),
    N("billing.invoices", "source", 10, 330, { path: "models/billing/staging/_billing__sources.yml", src: "billing" }),
    N("stg_zendesk__tickets", "model", 190, 20, { parents: ["zendesk.tickets"], path: "models/tickets/staging/stg_zendesk__tickets.sql", tags: ["tickets", "staging", "zendesk", "hourly"] }),
    N("stg_zendesk__users", "model", 190, 90, { parents: ["zendesk.users"], path: "models/tickets/staging/stg_zendesk__users.sql", tags: ["tickets", "staging", "zendesk", "daily"] }),
    N("stg_jira__issues", "model", 190, 160, { parents: ["jira.issues"], path: "models/tickets/staging/stg_jira__issues.sql", tags: ["tickets", "staging", "jira", "hourly"] }),
    N("stg_billing__invoices", "model", 190, 330, { parents: ["billing.invoices"], path: "models/billing/staging/stg_billing__invoices.sql", tags: ["billing", "staging", "daily"] }),
    N("int_tickets_unioned", "model", 370, 55, { parents: ["stg_zendesk__tickets", "stg_jira__issues"], path: "models/tickets/intermediate/int_tickets_unioned.sql", tags: ["tickets", "intermediate", "hourly"] }),
    N("int_ticket_sla", "model", 370, 150, { parents: ["int_tickets_unioned"], mat: "table", path: "models/tickets/intermediate/int_ticket_sla.sql", tags: ["tickets", "intermediate", "hourly", "sla"] }),
    N("fct_tickets", "model", 550, 20, { parents: ["int_tickets_unioned", "stg_zendesk__users"], mat: "incremental", modified: true, path: "models/tickets/marts/fct_tickets.sql", tags: ["tickets", "marts", "hourly"] }),
    N("fct_ticket_sla", "model", 550, 110, { parents: ["int_ticket_sla"], mat: "table", path: "models/tickets/marts/fct_ticket_sla.sql", tags: ["tickets", "marts", "hourly", "sla"] }),
    N("dim_agents", "model", 550, 200, { parents: ["stg_zendesk__users"], mat: "table", path: "models/tickets/marts/dim_agents.sql", tags: ["tickets", "marts", "daily"] }),
    N("fct_invoices", "model", 550, 330, { parents: ["stg_billing__invoices"], mat: "table", path: "models/billing/marts/fct_invoices.sql", tags: ["billing", "marts", "daily"] }),
    N("rpt_backlog_weekly", "model", 730, 20, { parents: ["fct_tickets"], mat: "table", path: "models/tickets/marts/rpt_backlog_weekly.sql", tags: ["tickets", "marts", "weekly"] }),
    N("unique_fct_tickets_id", "test", 730, 100, { parents: ["fct_tickets"], mat: "data test", path: "models/tickets/marts/_marts.yml" }),
    N("rel_fct_tickets_agent", "test", 730, 200, { parents: ["fct_tickets", "dim_agents"], mat: "data test", path: "models/tickets/marts/_marts.yml" }),
  ];
  NODES.forEach(n => { n.fqn = n.type === "source" ? `${P}.${n.id}` : `${P}.${n.path.replace(/^models\//, "").replace(/\.(sql|yml)$/, "").split("/").join(".")}`; });
  const BY = Object.fromEntries(NODES.map(n => [n.id, n]));
  const isTest = n => n.type === "test";
  const children = id => NODES.filter(n => !isTest(n) && n.parents.includes(id)).map(n => n.id);
  function walk(id, next, depth) {
    const out = new Set(); let fr = [id], d = 0;
    while (fr.length && (depth === null || d < depth)) {
      const nf = []; fr.forEach(f => next(f).forEach(c => { if (!out.has(c)) { out.add(c); nf.push(c); } })); fr = nf; d++;
    }
    return out;
  }
  const ancestors = (id, d = null) => walk(id, x => BY[x].parents, d);
  const descendants = (id, d = null) => walk(id, children, d);
  const glob = (pat, s) => new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$").test(s);

  // ------------------------------------------------- named YAML selectors
  const TREE = [
    { name: "staging", tags: ["hourly", "daily"] },
    { name: "intermediate", tags: ["hourly"] },
    { name: "marts", tags: ["hourly", "daily", "weekly"] },
  ];
  const SELECTORS = { tickets: () => new Set(NODES.filter(n => n.path.startsWith("models/tickets") && !isTest(n) && n.type !== "source").map(n => n.id)) };
  TREE.forEach(s => {
    SELECTORS["tickets__" + s.name] = () => new Set([...SELECTORS.tickets()].filter(id => BY[id].path.startsWith("models/tickets/" + s.name)));
    s.tags.forEach(t => {
      SELECTORS[`tickets__${s.name}__${t}`] = () => new Set([...SELECTORS["tickets__" + s.name]()].filter(id => BY[id].tags.includes(t)));
    });
  });

  // ------------------------------------------------------------ engine
  function matchMethod(body) {
    const m = body.match(/^([a-z_.]+):(.+)$/);
    const all = NODES;
    if (!m) {
      if (body.includes("/")) return { ids: all.filter(n => n.path.startsWith(body.replace(/\/$/, ""))).map(n => n.id), how: `path ${body}` };
      return { ids: all.filter(n => glob(body, n.id) || glob(body, n.fqn.split(".").pop())).map(n => n.id), how: `name matches ${body}` };
    }
    const [, meth, val] = m;
    const pick = (f, how) => ({ ids: all.filter(f).map(n => n.id), how });
    switch (meth) {
      case "tag": return pick(n => n.tags.some(t => glob(val, t)), `models tagged '${val}'`);
      case "path": return pick(n => n.path.startsWith(val.replace(/\/$/, "")), `files under ${val}`);
      case "fqn": return pick(n => glob(val, n.fqn) || glob(val, n.fqn.replace(P + ".", "")), `fqn matches ${val}`);
      case "source": return pick(n => n.type === "source" && (n.src === val || n.id === val || glob(val, n.id)), `source ${val}`);
      case "resource_type": return pick(n => n.type === val, `resource type ${val}`);
      case "config.materialized": return pick(n => n.mat === val, `materialized = ${val}`);
      case "state": return val === "modified" ? pick(n => n.modified, "modified vs --state manifest") : { ids: [], how: "" };
      case "test_type": return pick(n => isTest(n) && val === "data", `${val} tests`);
      case "selector": {
        if (getVer() === "v18") return { ids: [], how: "", err: "selector: method needs dbt 1.12 (use --selector in 1.8.6)" };
        const f = SELECTORS[val]; return f ? { ids: [...f()], how: `YAML selector ${val}` } : { ids: [], how: "", err: `unknown selector ${val}` };
      }
    }
    return { ids: [], how: "", err: `unknown method ${meth}` };
  }

  function parseAtom(a) {
    const m = a.match(/^(@)?(?:(\d*)\+)?(.+?)(?:\+(\d*))?$/);
    const hasUp = /^@?\d*\+/.test(a), hasDown = /\+\d*$/.test(a);
    return { raw: a, at: !!m[1], up: hasUp ? (m[2] ? +m[2] : null) : undefined, body: m[3], down: hasDown ? (m[4] ? +m[4] : null) : undefined };
  }
  const parseExpr = expr => expr.trim().split(/\s+/).filter(Boolean).map(t => t.split(",").filter(Boolean).map(parseAtom));

  // Returns a list of animation stages.
  function stages(cmd, selExpr, excExpr, indirect) {
    const S = []; const errors = [];
    const push = (title, text, cur, opt = {}) => S.push({ title, text, cur: new Set(cur), flash: new Set(opt.flash || []), cut: new Set(opt.cut || []), cand: new Set(opt.cand || []), order: opt.order });
    const terms = selExpr.trim() ? parseExpr(selExpr) : null;
    push("Parse", terms
      ? "Space = <b>union</b>, comma = <b>intersection</b>. " + terms.map(t => t.length > 1 ? `(${t.map(a => `<code>${esc(a.raw)}</code>`).join(" ∩ ")})` : `<code>${esc(t[0].raw)}</code>`).join(" ∪ ")
      : `No <code>-s</code>: start from <b>every node</b> in the project${getVer() !== "v18" ? " (or the selector marked <code>default: true</code>)" : ""}.`, []);
    let selected;
    function evalTerms(ts, label, shown) {
      let acc = new Set();
      const view = () => shown ? [...shown] : [...acc];
      ts.forEach((term, ti) => {
        let inter = null;
        term.forEach(atom => {
          const r = matchMethod(atom.body);
          if (r.err) errors.push(r.err);
          const base = new Set(r.ids);
          push(`${label} · <code>${esc(atom.raw)}</code>`, r.err ? `<span style="color:#e0442f">${esc(r.err)}</span>` : `Method: ${esc(r.how)} → ${base.size} node${base.size !== 1 ? "s" : ""}.`, view(), { cand: base, flash: base });
          let exp = new Set(base);
          if (atom.up !== undefined || atom.down !== undefined || atom.at) {
            base.forEach(id => {
              if (atom.up !== undefined) ancestors(id, atom.up).forEach(a => exp.add(a));
              if (atom.down !== undefined || atom.at) descendants(id, atom.down ?? null).forEach(d => exp.add(d));
              if (atom.at) descendants(id).forEach(d => ancestors(d).forEach(a => exp.add(a)));
            });
            const added = [...exp].filter(x => !base.has(x));
            const ops = [atom.at ? "@ (children + all their parents)" : "", atom.up !== undefined ? `${atom.up ?? ""}+ before (parents${atom.up ? `, ${atom.up} level${atom.up > 1 ? "s" : ""}` : ", all levels"})` : "", atom.down !== undefined ? `+${atom.down ?? ""} after (children${atom.down ? `, ${atom.down} level${atom.down > 1 ? "s" : ""}` : ", all levels"})` : ""].filter(Boolean).join(" and ");
            push(`Graph operator on <code>${esc(atom.raw)}</code>`, `${ops}: +${added.length} node${added.length !== 1 ? "s" : ""}.`, view(), { cand: exp, flash: added });
          }
          if (inter === null) inter = exp; else {
            const before = inter; inter = new Set([...inter].filter(x => exp.has(x)));
            push(`Intersection (comma)`, `Keep only nodes matched by <b>every</b> part: ${before.size} ∩ ${exp.size} → ${inter.size}.`, view(), { cand: inter, cut: [...before].filter(x => !inter.has(x)) });
          }
        });
        const before = acc.size; inter.forEach(x => acc.add(x));
        if (ts.length > 1) push(`Union (space) · term ${ti + 1}`, `Add this term's ${inter.size} nodes to the selection (+${acc.size - before} new).`, view(), { cand: shown ? acc : [], flash: inter });
      });
      return acc;
    }
    selected = terms ? evalTerms(terms, "Select") : new Set(NODES.map(n => n.id));
    if (!terms) push("All nodes", `${selected.size} nodes selected.`, [...selected], { flash: selected });
    if (excExpr.trim()) {
      const ex = evalTerms(parseExpr(excExpr), "Exclude", selected);
      const cut = [...selected].filter(x => ex.has(x));
      selected = new Set([...selected].filter(x => !ex.has(x)));
      push("--exclude", `Set difference, always applied <b>last</b>: −${cut.length} node${cut.length !== 1 ? "s" : ""}.`, [...selected], { cut });
    }
    // indirect selection of tests
    if (terms) {
      const direct = new Set([...selected].filter(id => !isTest(BY[id])));
      const anc = new Set(); direct.forEach(id => ancestors(id).forEach(a => anc.add(a)));
      const add = NODES.filter(isTest).filter(t => !selected.has(t.id)).filter(t => {
        const ps = t.parents;
        if (indirect === "eager") return ps.some(p => direct.has(p));
        if (indirect === "cautious") return ps.every(p => direct.has(p));
        if (indirect === "buildable") return ps.some(p => direct.has(p)) && ps.every(p => direct.has(p) || anc.has(p));
        return false;
      }).map(t => t.id);
      add.forEach(a => selected.add(a));
      const skipped = NODES.filter(isTest).filter(t => !selected.has(t.id) && t.parents.some(p => direct.has(p))).map(t => t.id);
      push(`Indirect test selection (${indirect})`, add.length || skipped.length
        ? `${add.length ? `Tests attached to selected models are added: ${add.map(esc).join(", ")}.` : ""} ${skipped.length ? `Left out: ${skipped.map(esc).join(", ")}${indirect === "eager" ? "" : " (another parent isn't selected)"}.` : ""}`
        : "No tests touch the selected models.", [...selected], { flash: add });
    }
    // command filter + execution order
    const TYPES = { build: ["model", "test", "seed", "snapshot"], run: ["model"], test: ["test"], ls: ["model", "test", "source", "seed", "snapshot"] }[cmd];
    const removed = [...selected].filter(id => !TYPES.includes(BY[id].type));
    const final = [...selected].filter(id => TYPES.includes(BY[id].type));
    const order = new Map(); let k = 1;
    if (cmd !== "ls") {
      const done = new Set(); let guard = 0;
      while (done.size < final.length && guard++ < 50) {
        final.filter(id => !done.has(id) && BY[id].parents.every(p => !final.includes(p) || done.has(p)))
          .forEach(id => { order.set(id, k); }); final.forEach(id => { if (order.has(id)) done.add(id); }); k++;
      }
    }
    push(`dbt ${cmd}: final set`, `${removed.length ? `${cmd === "ls" ? "" : `<code>dbt ${cmd}</code> only executes ${TYPES.join("/")}s, so ${removed.length} node${removed.length > 1 ? "s are" : " is"} dropped (sources are never executed). `}` : ""}<b>${final.length}</b> node${final.length !== 1 ? "s" : ""}${cmd === "ls" ? " listed" : ". The numbers are the execution waves: same number = can run in parallel (threads)"}.`, final, { cut: removed, order });
    return { S, errors };
  }

  // ------------------------------------------------------------ drawing
  const W = 150, H = 34;
  const COL = { source: "#2fa36b", model: "#3a6fd0", test: "#8d8d99" };
  function drawDag(el, st, opts = {}) {
    const parts = [];
    NODES.forEach(n => n.parents.forEach(p => {
      const a = BY[p], b = n;
      const hot = st && st.cur.has(n.id) && (st.cur.has(p));
      let d;
      if (b.x <= a.x + W) d = `M${a.x + W / 2} ${a.y + H} L${b.x + W / 2} ${b.y}`;
      else d = `M${a.x + W} ${a.y + H / 2} C${a.x + W + 30} ${a.y + H / 2} ${b.x - 30} ${b.y + H / 2} ${b.x} ${b.y + H / 2}`;
      parts.push(`<path class="dag-edge ${hot ? "hot" : ""}" d="${d}" ${isTest(n) ? 'stroke-dasharray="3 3"' : ""}/>`);
    }));
    // folder bands
    parts.unshift(`<rect x="180" y="6" width="530" height="232" rx="14" fill="none" stroke="var(--accent)" stroke-opacity=".25" stroke-dasharray="6 5"/>
      <text x="700" y="232" text-anchor="end" font-size="10" fill="var(--accent)" opacity=".7">models/tickets/</text>
      <rect x="180" y="320" width="530" height="54" rx="14" fill="none" stroke="var(--muted)" stroke-opacity=".3" stroke-dasharray="6 5"/>
      <text x="700" y="368" text-anchor="end" font-size="10" fill="var(--muted)" opacity=".8">models/billing/</text>`);
    NODES.forEach(n => {
      const inCur = st && st.cur.has(n.id), cand = st && st.cand.has(n.id), cut = st && st.cut.has(n.id), fl = st && st.flash.has(n.id);
      const dim = st && !inCur && !cand && !cut;
      const col = COL[n.type];
      const fill = cut ? "var(--del)" : inCur ? `color-mix(in srgb, ${col} 22%, var(--card))` : cand ? "color-mix(in srgb, #ff9f43 22%, var(--card))" : "var(--card)";
      const stroke = cut ? "#e0442f" : cand && !inCur ? "#ff9f43" : inCur ? col : "var(--line)";
      const ord = st && st.order && st.order.get(n.id);
      const label = n.id.length > 21 ? n.id.slice(0, 20) + "…" : n.id;
      parts.push(`<g class="dag-node ${dim ? "dim" : ""} ${fl ? "pulse" : ""}">
        <rect class="body" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${inCur || cand || cut ? 1.8 : 1}" ${cand && !inCur ? 'stroke-dasharray="5 3"' : ""}/>
        <rect x="${n.x}" y="${n.y}" width="5" height="${H}" rx="2" fill="${col}"/>
        <text x="${n.x + 11}" y="${n.y + 14}" font-size="${Math.min(10.5, 215 / label.length).toFixed(1)}" font-weight="600" fill="var(--ink)">${label}</text>
        <text x="${n.x + 11}" y="${n.y + 27}" font-size="8.6" fill="var(--muted)">${n.type === "model" ? n.tags.filter(t => !["tickets", "billing", "staging", "intermediate", "marts"].includes(t)).map(t => "#" + t).join(" ") + (n.modified ? " ✎" : "") : n.mat}</text>
        ${cut ? `<text x="${n.x + W - 8}" y="${n.y + 21}" text-anchor="end" font-size="14" fill="#e0442f" font-weight="800">✕</text>` : ""}
        ${ord ? `<circle cx="${n.x + W - 2}" cy="${n.y + 2}" r="9" fill="var(--accent)"/><text x="${n.x + W - 2}" y="${n.y + 5.5}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">${ord}</text>` : ""}
      </g>`);
    });
    el.innerHTML = `<svg viewBox="0 -6 890 386" style="min-width:760px">${parts.join("")}</svg>`;
  }

  // ------------------------------------------------------- 1 · animation
  const sim = document.getElementById("selsim");
  if (sim) {
    const $$ = s => sim.querySelector(s);
    const st = { cmd: "build", sel: "tag:hourly,path:models/tickets/marts", exc: "", indirect: "eager", stage: 0, timer: null, S: [] };
    function compute() {
      const r = stages(st.cmd, st.sel, st.exc, st.indirect); st.S = r.S;
      if (st.stage >= st.S.length) st.stage = st.S.length - 1;
    }
    function show() {
      const s = st.S[st.stage];
      drawDag($$("#sel-dag"), s);
      $$("#sel-steps").innerHTML = st.S.map((x, i) => `<button class="step ${i === st.stage ? "on" : i < st.stage ? "done" : ""}" data-i="${i}">${i + 1}. ${x.title.replace(/<[^>]+>/g, "")}</button>`).join("");
      $$("#sel-steps").querySelectorAll(".step").forEach(b => b.addEventListener("click", () => { stop(); st.stage = +b.dataset.i; show(); }));
      $$("#sel-narr").innerHTML = `<b>${s.title}</b>: ${s.text}`;
      const q = v => /[\s,+@:*]/.test(v) ? `"${v}"` : v;
      $$("#sel-cmd").innerHTML = `<span class="p">$</span>dbt ${st.cmd}${st.sel.trim() ? ` <span class="fl">-s</span> <span class="v">${esc(q(st.sel.trim()))}</span>` : ""}${st.exc.trim() ? ` <span class="fl">--exclude</span> <span class="v">${esc(q(st.exc.trim()))}</span>` : ""}${st.indirect !== "eager" ? ` <span class="fl">--indirect-selection</span> <span class="v">${st.indirect}</span>` : ""}`;
    }
    function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; $$("#sel-play").textContent = "▶ Animate"; } }
    function play() {
      stop(); st.stage = 0; show(); $$("#sel-play").textContent = "■ Stop";
      st.timer = setInterval(() => { if (st.stage >= st.S.length - 1) { stop(); return; } st.stage++; show(); }, 1500);
    }
    function update(animate = true) { compute(); st.stage = st.S.length - 1; show(); if (animate) play(); }
    segmented($$("#sel-cmdsel"), ["build", "run", "test", "ls"].map(c => ({ value: c, label: c })), st.cmd, v => { st.cmd = v; update(false); });
    segmented($$("#sel-indirect"), ["eager", "cautious", "buildable", "empty"].map(c => ({ value: c, label: c })), st.indirect, v => { st.indirect = v; update(false); });
    const si = $$("#sel-input"), ei = $$("#sel-exclude");
    si.value = st.sel;
    let deb;
    si.addEventListener("input", () => { st.sel = si.value; clearTimeout(deb); stop(); deb = setTimeout(() => update(false), 150); });
    ei.addEventListener("input", () => { st.exc = ei.value; clearTimeout(deb); stop(); deb = setTimeout(() => update(false), 150); });
    document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
      si.value = st.sel = b.dataset.preset; ei.value = st.exc = b.dataset.exclude || ""; update(true);
      if (!sim.contains(b)) sim.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    $$("#sel-play").addEventListener("click", () => { if (st.timer) stop(); else play(); });
    document.addEventListener("verchange", () => update(false));
    compute(); st.stage = 0; show();
  }

  // ------------------------------------------- 2 · 3-level orchestration
  const orch = document.getElementById("orchsim");
  if (orch) {
    const $$ = s => orch.querySelector(s);
    const st = { node: "tickets", mode: "leaf", indirect: "cautious", t: null, timer: null };
    const tests = NODES.filter(isTest);

    function treeHtml() {
      const item = (key, label, lvl, count) => `<button class="tree-item lvl${lvl} ${st.node === key ? "on" : ""}" data-k="${key}">
        <span class="tree-lvl">L${lvl}</span><span class="tree-name">${label}</span><span class="tree-n">${count}</span></button>`;
      let h = item("tickets", "tickets (job)", 1, SELECTORS.tickets().size);
      TREE.forEach(s => {
        h += item("tickets__" + s.name, s.name, 2, SELECTORS["tickets__" + s.name]().size);
        s.tags.forEach(t => { h += item(`tickets__${s.name}__${t}`, "tag:" + t, 3, SELECTORS[`tickets__${s.name}__${t}`]().size); });
      });
      return h;
    }
    function yamlFor(key) {
      const parts = key.split("__");
      const ver = getVer();
      let y = "";
      if (parts.length === 1) y = `  - name: tickets
    description: "L1 · the whole tickets domain"
    definition:
      method: path
      value: models/tickets`;
      else if (parts.length === 2) y = `  - name: ${key}
    description: "L2 · tickets / ${parts[1]}"
    definition:
      intersection:
        - method: selector          <span class="c"># reuse L1</span>
          value: tickets
        - method: path
          value: models/tickets/${parts[1]}`;
      else y = `  - name: ${key}
    description: "L3 · tickets / ${parts[1]} / tag:${parts[2]}"
    definition:
      intersection:
        - method: selector          <span class="c"># reuse L2</span>
          value: tickets__${parts[1]}
        - method: tag
          value: ${parts[2]}`;
      const ind = parts.length === 3 && st.mode === "leaf" && st.indirect !== "eager" ? ` --indirect-selection ${st.indirect}` : "";
      const cmd18 = `dbt build --selector ${key}${ind}`;
      const cmd112 = `dbt build -s "selector:${key}"${ind}`;
      return `<div class="file">selectors.yml (excerpt)</div><pre class="code">selectors:
${y}</pre>
      <div class="cmdline" style="margin-top:8px"><span class="p">$</span>${ver === "v112" ? cmd112 : cmd18}</div>
      ${ver === "both" ? `<div class="cmdline"><span class="p">$</span>${cmd112} <span style="color:#7d8196">&nbsp;# 1.12: also combinable, e.g. -s "selector:${key} state:modified"</span></div>` : ""}`;
    }
    function highlight() {
      const ids = SELECTORS[st.node]();
      const sel = new Set(ids);
      // tests that would come along
      tests.forEach(t => {
        const ok = st.indirect === "eager" ? t.parents.some(p => sel.has(p)) : t.parents.every(p => sel.has(p));
        if (ok) sel.add(t.id);
      });
      drawDag($$("#orch-dag"), { cur: sel, flash: sel, cut: new Set(), cand: new Set() });
    }

    // --------- schedule: invocations → bars
    function plan() {
      const UNIT = { model: 1, test: .5 }, BOOT = 1; // parse/startup per invocation
      const inv = []; // {name, lane, start, items:[{id,s,e}]}
      const indirectFor = (ids, mode) => tests.filter(t => mode === "eager" ? t.parents.some(p => ids.has(p)) : t.parents.every(p => ids.has(p))).map(t => t.id);
      function schedule(name, ids, start, lane) {
        const set = new Set(ids); const items = []; const end = {};
        const order = [...set].sort((a, b) => NODES.indexOf(BY[a]) - NODES.indexOf(BY[b]));
        let t0 = start + BOOT;
        order.forEach(id => {
          const deps = BY[id].parents.filter(p => set.has(p));
          const s = Math.max(t0, ...deps.map(d => end[d]));
          end[id] = s + UNIT[BY[id].type]; items.push({ id, s, e: end[id] });
        });
        const fin = Math.max(t0, ...Object.values(end));
        inv.push({ name, lane, start, end: fin, items });
        return fin;
      }
      const warn = [], notes = [];
      if (st.mode === "one") {
        const ids = SELECTORS.tickets(); schedule("dbt build --selector tickets", [...ids, ...indirectFor(ids, "eager")], 0, 0);
      } else if (st.mode === "sub") {
        let t = 0;
        TREE.forEach((s, i) => { const ids = SELECTORS["tickets__" + s.name](); t = schedule(`--selector tickets__${s.name}`, [...ids, ...indirectFor(ids, "eager")], t, i); });
      } else {
        let t = 0, lane = 0; const ran = {};
        TREE.forEach(s => {
          const startSub = t; let endSub = t;
          s.tags.forEach(tag => {
            const ids = SELECTORS[`tickets__${s.name}__${tag}`]();
            const tt = indirectFor(ids, st.indirect);
            tt.forEach(x => { ran[x] = (ran[x] || []).concat(`${s.name}/${tag}`); });
            endSub = Math.max(endSub, schedule(`--selector tickets__${s.name}__${tag}`, [...ids, ...tt], startSub, lane++));
          });
          t = endSub;
        });
        Object.entries(ran).forEach(([x, leaves]) => {
          if (leaves.length > 1) warn.push(`<code>${x}</code> runs ${leaves.length}× (${leaves.join(", ")}), in parallel leaves, so it can run before one of its parents is rebuilt.`);
        });
        const missed = tests.filter(x => !ran[x.id]).map(x => x.id);
        if (missed.length) {
          schedule(`dbt test --selector tickets  (cross-leaf tests)`, missed, t, lane++);
          notes.push(`With <b>cautious</b>, <code>${missed.join(", ")}</code> belongs to no single leaf (its parents are in different leaves). A final step runs it once everything is built.`);
        }
      }
      return { inv, warn, notes };
    }
    function drawGantt(t) {
      const { inv, warn, notes } = plan();
      const total = Math.max(...inv.map(i => i.end));
      const lanes = Math.max(...inv.map(i => i.lane)) + 1;
      const L = 250, Wd = 600, rowH = 30, x = v => L + v / total * Wd;
      const parts = [];
      inv.forEach(i => {
        const y = 10 + i.lane * rowH;
        parts.push(`<text x="8" y="${y + 17}" font-size="10" fill="var(--ink)">${esc(i.name.replace("dbt build ", ""))}</text>
          <rect x="${x(i.start)}" y="${y + 4}" width="${x(i.start + 1) - x(i.start)}" height="20" rx="4" fill="var(--soft)" stroke="var(--line)"/>
          <text x="${x(i.start) + 3}" y="${y + 17}" font-size="8" fill="var(--muted)">parse</text>`);
        i.items.forEach(it => {
          const done = t === null || t >= it.e, running = t !== null && t >= it.s && t < it.e;
          const col = BY[it.id].type === "test" ? "#8d8d99" : "#3a6fd0";
          parts.push(`<rect x="${x(it.s) + 1}" y="${y + 4}" width="${Math.max(2, x(it.e) - x(it.s) - 2)}" height="20" rx="4" fill="${col}" opacity="${done ? .9 : running ? .55 : .12}"><title>${it.id}</title></rect>`);
          if (x(it.e) - x(it.s) > 40) parts.push(`<text x="${x(it.s) + 4}" y="${y + 17}" font-size="8" fill="#fff" opacity="${done || running ? 1 : .3}">${it.id.replace(/^(stg_|int_|fct_|dim_|rpt_)/, "").slice(0, 13)}</text>`);
        });
      });
      if (t !== null) parts.push(`<line x1="${x(Math.min(t, total))}" x2="${x(Math.min(t, total))}" y1="4" y2="${10 + lanes * rowH}" stroke="var(--accent)" stroke-width="2"/>`);
      $$("#orch-gantt").innerHTML = `<svg viewBox="0 0 870 ${16 + lanes * rowH}" style="min-width:720px">${parts.join("")}</svg>`;
      $$("#orch-stats").innerHTML = `<b>${inv.length}</b> dbt invocation${inv.length > 1 ? "s" : ""} · total ≈ <b>${total.toFixed(1)}</b> time units (1 model = 1, 1 test = 0.5, each invocation parses the project = 1)` +
        (warn.length ? `<div class="verdict bad" style="margin-top:8px">${warn.map(w => "⚠ " + w).join("<br>")}</div>` : `<div class="verdict ok" style="margin-top:8px">✓ Every test runs once, after all of its parents.${notes.length ? "<br>" + notes.join("<br>") : ""}</div>`);
    }
    function render() {
      $$("#orch-tree").innerHTML = treeHtml();
      $$("#orch-tree").querySelectorAll(".tree-item").forEach(b => b.addEventListener("click", () => { st.node = b.dataset.k; render(); }));
      $$("#orch-yaml").innerHTML = yamlFor(st.node);
      highlight();
      drawGantt(st.t);
    }
    segmented($$("#orch-mode"), [
      { value: "one", label: "A · 1 invocation (L1)" }, { value: "sub", label: "B · per subjob (L2)" }, { value: "leaf", label: "C · per leaf (L3)" },
    ], st.mode, v => { st.mode = v; render(); });
    segmented($$("#orch-ind"), [{ value: "eager", label: "eager" }, { value: "cautious", label: "cautious" }], st.indirect, v => { st.indirect = v; render(); });
    $$("#orch-run").addEventListener("click", () => {
      clearInterval(st.timer); const total = Math.max(...plan().inv.map(i => i.end)); st.t = 0; render();
      st.timer = setInterval(() => { st.t += total / 40; drawGantt(st.t); if (st.t >= total) { clearInterval(st.timer); st.t = null; drawGantt(null); } }, 80);
    });
    document.addEventListener("verchange", render);
    render();
  }
})();
