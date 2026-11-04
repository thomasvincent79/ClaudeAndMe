// =====================================================================
// Model versions lifecycle simulator: dim_customers goes from unversioned
// → breaking change → v2 prerelease → v2 latest → v1 deprecated → v1 removed.
// Shows YAML, warehouse relations and how each consumer resolves.
// =====================================================================
(function () {
  const root = document.getElementById("versim");
  if (!root) return;
  const $$ = s => root.querySelector(s);

  // step: versions present, latest, flags
  const STEPS = [
    { t: "1 · Unversioned", vs: [], latest: null, legacyPin: null,
      txt: "<code>dim_customers</code> is a public, contracted model. Two dbt models and a BI dashboard depend on it." },
    { t: "2 · Breaking change, no version", vs: [], latest: null, broken: true, legacyPin: null,
      txt: "You drop <code>country_name</code> and rename <code>full_name → customer_name</code> directly. Every consumer breaks the same day. This is what versions prevent." },
    { t: "3 · v2 as prerelease", vs: [1, 2], latest: 1, legacyPin: 1,
      txt: "You add <code>v2</code> with the new shape but keep <code>latest_version: 1</code>. Unpinned refs still get v1, and their builds log that a prerelease v2 is available. Early adopters pin <code>v=2</code>." },
    { t: "4 · Promote v2 to latest", vs: [1, 2], latest: 2, legacyPin: 1,
      txt: "<code>latest_version: 2</code>. Every unpinned <code>ref('dim_customers')</code> now resolves to v2 at the next build. Consumers that pinned <code>v=1</code> keep v1." },
    { t: "5 · Deprecate v1", vs: [1, 2], latest: 2, legacyPin: 1, deprecated: true,
      txt: "v1 gets a <code>deprecation_date</code>. Consumers still pinned to v1 get a warning on every parse (UpcomingReferenceDeprecation, then DeprecatedReference after the date)." },
    { t: "6 · Remove v1", vs: [2], latest: 2, legacyPin: 2,
      txt: "After the window (and after <code>mart_legacy</code> migrated to <code>v=2</code>), you delete <code>dim_customers_v1.sql</code> and its YAML entry. dbt doesn't drop the old table: drop it yourself." },
  ];
  const st = { step: 0, strat: "alias", timer: null };
  const STRATS = {
    none: { label: "nothing", note: "each version writes <code>dim_customers_v&lt;n&gt;</code>" },
    alias: { label: "alias on latest (1.8+)", note: "the latest version sets <code>alias: dim_customers</code>" },
    pointer: { label: "latest_version_pointer (1.12)", note: "a view <code>dim_customers</code> points to the latest" },
  };

  function relations(s) {
    // returns [{name, kind, from, stale}]
    if (!s.vs.length) return [{ name: "dim_customers", kind: "table", from: "dim_customers", broken: s.broken }];
    const rels = [];
    s.vs.forEach(v => {
      const isLatest = v === s.latest;
      const name = st.strat === "alias" && isLatest ? "dim_customers" : `dim_customers_v${v}`;
      rels.push({ name, kind: "table", from: `v${v}` });
    });
    if (st.strat === "pointer") rels.push({ name: "dim_customers", kind: "view → v" + s.latest, from: "pointer" });
    if (st.strat === "none") rels.push({ name: "dim_customers", kind: "table (stale!)", from: "leftover", stale: true });
    if (s.vs.length === 1 && s.vs[0] === 2) rels.push({ name: "dim_customers_v1", kind: "table (orphan, drop it)", from: "leftover", stale: true });
    return rels;
  }

  function consumers(s) {
    const rels = relations(s);
    const base = rels.find(r => r.name === "dim_customers");
    const out = [];
    // fct_orders: unpinned ref
    if (!s.vs.length) out.push({ id: "fct_orders", code: "ref('dim_customers')", to: "dim_customers", ok: !s.broken, msg: s.broken ? "✗ column country_name no longer exists" : "✓" });
    else out.push({ id: "fct_orders", code: "ref('dim_customers')", to: `v${s.latest}`, ok: true,
      msg: s.latest === 1 && s.vs.includes(2) ? "ℹ resolves to v1 · 'A prerelease version 2 is available'" : `✓ resolves to latest (v${s.latest})` });
    // mart_legacy: pinned
    if (!s.vs.length) out.push({ id: "mart_legacy", code: "ref('dim_customers')", to: "dim_customers", ok: !s.broken, msg: s.broken ? "✗ column full_name no longer exists" : "✓" });
    else out.push({ id: "mart_legacy", code: `ref('dim_customers', v=${s.legacyPin})`, to: `v${s.legacyPin}`, ok: true,
      msg: s.deprecated && s.legacyPin === 1 ? "⚠ v1 is deprecated (deprecation_date 2026-12-31): migrate" : `✓ pinned to v${s.legacyPin}` });
    // BI tool: reads the table name directly (outside dbt)
    if (!s.vs.length) out.push({ id: "BI dashboard", code: "select … from analytics.dim_customers", to: "dim_customers", ok: !s.broken, msg: s.broken ? "✗ dashboard broken" : "✓" });
    else if (!base) out.push({ id: "BI dashboard", code: "select … from analytics.dim_customers", to: null, ok: false, msg: "✗ relation doesn't exist" });
    else if (base.stale) out.push({ id: "BI dashboard", code: "select … from analytics.dim_customers", to: "dim_customers", ok: false, msg: "✗ reads the OLD table: nobody rebuilds it anymore (silently stale)" });
    else out.push({ id: "BI dashboard", code: "select … from analytics.dim_customers", to: "dim_customers", ok: true, msg: `✓ gets v${s.latest} (${st.strat === "pointer" ? "pointer view" : "alias"})` });
    return out;
  }

  function yaml(s) {
    const v18 = getVer() === "v18";
    if (!s.vs.length) return `models:
  - name: dim_customers
    config:
      access: public
      <span class="h">contract: {enforced: true}</span>
    columns:
      - name: customer_id
        data_type: int
      - name: full_name${s.broken ? `   <span class="k"># ✗ renamed in place</span>` : ""}
        data_type: varchar
      - name: country_name${s.broken ? `   <span class="k"># ✗ dropped in place</span>` : ""}
        data_type: varchar`;
    const verEntry = v => {
      let e = `      - v: ${v}`;
      if (v === 2) e += `
        columns:
          - include: all
            exclude: [country_name, full_name]
          - name: customer_name
            data_type: varchar`;
      if (v === 1 && s.deprecated) e += `
        <span class="h">deprecation_date: 2026-12-31</span>`;
      if (st.strat === "alias" && v === s.latest) e += `
        config:
          <span class="h">alias: dim_customers</span>   <span class="c"># latest owns the base name</span>`;
      return e;
    };
    const pointer = st.strat === "pointer" ? `
      <span class="c"># 1.12 (or project-wide: flags: latest_version_pointer_enabled_by_default)</span>
      latest_version_pointer:
        <span class="h">enabled: true</span>` : "";
    return `models:
  - name: dim_customers
    <span class="h">latest_version: ${s.latest}</span>
    config:
      access: public
      contract: {enforced: true}${pointer}
    columns:
      - name: customer_id
        data_type: int
      - name: full_name
        data_type: varchar
      - name: country_name
        data_type: varchar
    versions:
${s.vs.map(verEntry).join("\n")}`;
  }

  function draw(s) {
    const rels = relations(s), cons = consumers(s);
    const files = s.vs.length ? s.vs.map(v => ({ id: `v${v}`, file: `dim_customers_v${v}.sql`, tag: v === s.latest ? "latest" : v > (s.latest || 0) ? "prerelease" : "old", dep: s.deprecated && v === 1 })) : [{ id: "dim_customers", file: "dim_customers.sql", tag: "" }];
    if (st.strat === "pointer" && s.vs.length) files.push({ id: "pointer", file: "(generated by dbt)", tag: "pointer" });
    const W = 860, colC = 10, colF = 330, colR = 610, bw = 230, bh = 44, gap = 58;
    const yC = i => 20 + i * gap, yF = i => 20 + i * gap, yR = i => 20 + i * gap;
    const H = 20 + Math.max(cons.length, files.length, rels.length) * gap;
    const parts = [`<text x="${colC}" y="12" font-size="10" fill="var(--muted)" font-weight="700">CONSUMERS</text>
      <text x="${colF}" y="12" font-size="10" fill="var(--muted)" font-weight="700">MODEL VERSIONS (files)</text>
      <text x="${colR}" y="12" font-size="10" fill="var(--muted)" font-weight="700">WAREHOUSE (analytics.*)</text>`];
    // edges consumer → version (or relation for BI)
    cons.forEach((c, i) => {
      const y1 = yC(i) + bh / 2;
      let target, tx, ty;
      if (c.id === "BI dashboard") { const ri = rels.findIndex(r => r.name === "dim_customers"); if (ri >= 0) { tx = colR; ty = yR(ri) + bh / 2; target = true; } }
      else { const fi = files.findIndex(f => f.id === c.to || (c.to === "dim_customers" && f.id === "dim_customers")); if (fi >= 0) { tx = colF; ty = yF(fi) + bh / 2; target = true; } }
      if (target) {
        const col = c.ok ? (c.msg.startsWith("⚠") ? "#d99a00" : c.msg.startsWith("ℹ") ? "#3a6fd0" : "#1f9d6b") : "#e0442f";
        parts.push(`<path id="ve${i}" d="M${colC + bw} ${y1} C${colC + bw + 50} ${y1} ${tx - 50} ${ty} ${tx} ${ty}" stroke="${col}" stroke-width="2" fill="none" opacity=".85" ${c.id === "BI dashboard" ? 'stroke-dasharray="6 4"' : ""}/>
          <circle r="4" fill="${col}"><animateMotion dur="1.8s" repeatCount="indefinite"><mpath href="#ve${i}"/></animateMotion></circle>`);
      }
    });
    // edges version → relation
    files.forEach((f, i) => {
      rels.forEach((r, j) => {
        const link = (r.from === f.id) || (f.id === "dim_customers" && r.name === "dim_customers") || (f.id === "pointer" && r.from === "pointer");
        if (link) parts.push(`<path d="M${colF + bw} ${yF(i) + bh / 2} C${colF + bw + 30} ${yF(i) + bh / 2} ${colR - 30} ${yR(j) + bh / 2} ${colR} ${yR(j) + bh / 2}" stroke="var(--muted)" stroke-width="1.4" fill="none" opacity=".5"/>`);
      });
      if (f.id === "pointer") {
        const li = files.findIndex(x => x.id === `v${s.latest}`);
        parts.push(`<path d="M${colF + bw / 2} ${yF(i)} L${colF + bw / 2} ${yF(li) + bh}" stroke="#8a5cf6" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/>`);
      }
    });
    cons.forEach((c, i) => {
      const y = yC(i);
      parts.push(`<rect x="${colC}" y="${y}" width="${bw}" height="${bh}" rx="9" fill="${c.ok ? "var(--card)" : "var(--del)"}" stroke="${c.ok ? "var(--line)" : "#e0442f"}"/>
        <text x="${colC + 10}" y="${y + 17}" font-size="11" font-weight="700" fill="var(--ink)">${c.id}</text>
        <text x="${colC + 10}" y="${y + 33}" font-size="9" fill="var(--muted)">${esc(c.code)}</text>`);
    });
    files.forEach((f, i) => {
      const y = yF(i), tagCol = f.tag === "latest" ? "#1f9d6b" : f.tag === "prerelease" ? "#3a6fd0" : f.tag === "pointer" ? "#8a5cf6" : "#8d8d99";
      parts.push(`<rect x="${colF}" y="${y}" width="${bw}" height="${bh}" rx="9" fill="${s.broken ? "var(--del)" : "var(--card)"}" stroke="${f.dep ? "#d99a00" : "var(--line)"}" ${f.dep ? 'stroke-dasharray="5 3" stroke-width="2"' : ""}/>
        <text x="${colF + 10}" y="${y + 17}" font-size="11" font-weight="700" fill="var(--ink)">${f.id === "pointer" ? "latest_version_pointer" : f.id}</text>
        <text x="${colF + 10}" y="${y + 33}" font-size="9" fill="var(--muted)">${f.file}${f.dep ? " · deprecated" : ""}</text>
        ${f.tag ? `<rect x="${colF + bw - 70}" y="${y + 7}" width="62" height="16" rx="8" fill="${tagCol}"/><text x="${colF + bw - 39}" y="${y + 18.5}" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">${f.tag}</text>` : ""}`);
    });
    rels.forEach((r, i) => {
      const y = yR(i);
      parts.push(`<rect x="${colR}" y="${y}" width="${bw}" height="${bh}" rx="9" fill="${r.stale ? "var(--upd)" : r.broken ? "var(--del)" : "color-mix(in srgb, #2fa36b 14%, var(--card))"}" stroke="${r.stale ? "#d99a00" : "var(--line)"}"/>
        <text x="${colR + 10}" y="${y + 17}" font-size="11" font-weight="700" fill="var(--ink)">${r.name}</text>
        <text x="${colR + 10}" y="${y + 33}" font-size="9" fill="var(--muted)">${r.kind}</text>`);
    });
    $$("#ver-svg").innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="min-width:700px">${parts.join("")}</svg>`;
    $$("#ver-cons").innerHTML = cons.map(c => `<div style="border-color:${c.ok ? (c.msg.startsWith("⚠") ? "#d99a00" : "var(--line)") : "#e0442f"}"><b>${c.id}</b>: ${esc(c.msg)}</div>`).join("");
  }

  function cmds(s) {
    if (!s.vs.length) return `dbt build -s dim_customers+`;
    const lines = [`dbt build -s dim_customers            <span class="c"># all versions (${s.vs.map(v => "v" + v).join(", ")})</span>`,
      `dbt build -s "dim_customers,version:latest"   <span class="c"># only v${s.latest}</span>`];
    if (s.vs.some(v => v > s.latest)) lines.push(`dbt build -s "version:prerelease"     <span class="c"># v2 while it's being tested</span>`);
    if (s.vs.some(v => v < s.latest)) lines.push(`dbt build --exclude "version:old"      <span class="c"># skip v1 in dev</span>`);
    lines.push(`dbt build -s dim_customers.v${s.vs[s.vs.length - 1]}           <span class="c"># one version</span>`);
    return lines.join("\n");
  }

  function render() {
    if (getVer() === "v18" && st.strat === "pointer") st.strat = "alias";
    segmented($$("#ver-strat"), Object.entries(STRATS).map(([k, v]) => ({ value: k, label: v.label, disabled: k === "pointer" && getVer() === "v18", title: k === "pointer" && getVer() === "v18" ? "dbt 1.12+" : "" })), st.strat, v => { st.strat = v; render(); });
    const s = STEPS[st.step];
    $$("#ver-steps").innerHTML = STEPS.map((x, i) => `<button class="step ${i === st.step ? "on" : i < st.step ? "done" : ""}" data-i="${i}">${x.t}</button>`).join("");
    $$("#ver-steps").querySelectorAll(".step").forEach(b => b.addEventListener("click", () => { stop(); st.step = +b.dataset.i; render(); }));
    $$("#ver-narr").innerHTML = s.txt + (s.vs.length ? ` <span class="muted">Base name strategy: ${STRATS[st.strat].note}.</span>` : "");
    draw(s);
    $$("#ver-yaml").innerHTML = `<div class="file">models/marts/_dim_customers.yml</div><pre class="code">${yaml(s)}</pre>`;
    $$("#ver-cmd").innerHTML = `<div class="file">selection</div><pre class="code">${cmds(s)}</pre>`;
  }
  function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; $$("#ver-play").textContent = "▶ Play the lifecycle"; } }
  $$("#ver-play").addEventListener("click", () => {
    if (st.timer) { stop(); return; }
    st.step = 0; render(); $$("#ver-play").textContent = "■ Stop";
    st.timer = setInterval(() => { if (st.step >= STEPS.length - 1) { stop(); return; } st.step++; render(); }, 2600);
  });
  document.addEventListener("verchange", render);
  render();
})();
