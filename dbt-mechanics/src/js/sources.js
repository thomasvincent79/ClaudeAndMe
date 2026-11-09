// =====================================================================
// Sources / exposures / packages: (1) lineage from sources to exposures
// with selection presets, (2) package version resolution + lock file
// =====================================================================
(function () {
  const ln = document.getElementById("linsim");
  if (ln) {
    const $$ = s => ln.querySelector(s);
    const N = (id, type, x, y, parents = []) => ({ id, type, x, y, parents });
    const NODES = [
      N("stripe.payments", "source", 10, 20), N("shop.orders", "source", 10, 90), N("shop.customers", "source", 10, 160), N("hubspot.contacts", "source", 10, 230),
      N("stg_payments", "model", 190, 20, ["stripe.payments"]), N("stg_orders", "model", 190, 90, ["shop.orders"]),
      N("stg_customers", "model", 190, 160, ["shop.customers"]), N("stg_contacts", "model", 190, 230, ["hubspot.contacts"]),
      N("fct_orders", "model", 370, 55, ["stg_orders", "stg_payments"]), N("dim_customers", "model", 370, 160, ["stg_customers", "stg_contacts"]),
      N("weekly_kpis", "exposure", 560, 30, ["fct_orders", "dim_customers"]), N("churn_model", "exposure", 560, 160, ["dim_customers"]),
      N("crm_sync", "exposure", 560, 240, ["stg_contacts"]),
    ];
    const BY = Object.fromEntries(NODES.map(n => [n.id, n]));
    const anc = id => { const s = new Set(), q = [id]; while (q.length) BY[q.shift()].parents.forEach(p => { if (!s.has(p)) { s.add(p); q.push(p); } }); return s; };
    const kids = id => NODES.filter(n => n.parents.includes(id)).map(n => n.id);
    const desc = id => { const s = new Set(), q = [id]; while (q.length) kids(q.shift()).forEach(c => { if (!s.has(c)) { s.add(c); q.push(c); } }); return s; };
    const PRESETS = {
      "+exposure:weekly_kpis": { f: () => new Set(["weekly_kpis", ...anc("weekly_kpis")]), d: "everything the dashboard depends on: rebuild exactly what feeds it" },
      "source:stripe+": { f: () => new Set(["stripe.payments", ...desc("stripe.payments")]), d: "everything downstream of Stripe, e.g. after a Stripe incident or backfill" },
      "source:hubspot+": { f: () => new Set(["hubspot.contacts", ...desc("hubspot.contacts")]), d: "which models and exposures are impacted if HubSpot is late" },
      "+exposure:*": { f: () => { const s = new Set(); NODES.filter(n => n.type === "exposure").forEach(e => { s.add(e.id); anc(e.id).forEach(a => s.add(a)); }); return s; }, d: "all models used by at least one exposure: the ones that matter to the business" },
      "resource_type:source": { f: () => new Set(NODES.filter(n => n.type === "source").map(n => n.id)), d: "all sources (e.g. dbt test -s resource_type:source to test raw data first)" },
    };
    let cur = "+exposure:weekly_kpis";
    const COL = { source: "#2fa36b", model: "#3a6fd0", exposure: "#ff5f3f" };
    function render() {
      const sel = PRESETS[cur].f(), W = 150, H = 34, parts = [];
      NODES.forEach(n => n.parents.forEach(p => {
        const a = BY[p], hot = sel.has(n.id) && sel.has(p);
        parts.push(`<path class="dag-edge ${hot ? "hot" : ""}" d="M${a.x + W} ${a.y + H / 2} C${a.x + W + 25} ${a.y + H / 2} ${n.x - 25} ${n.y + H / 2} ${n.x} ${n.y + H / 2}"/>`);
      }));
      NODES.forEach(n => {
        const on = sel.has(n.id), c = COL[n.type], ex = n.type === "exposure";
        parts.push(`<g class="dag-node ${on ? "pulse" : "dim"}"><rect class="body" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="${ex ? 17 : 8}" fill="${on ? `color-mix(in srgb, ${c} 18%, var(--card))` : "var(--card)"}" stroke="${on ? c : "var(--line)"}" stroke-width="${on ? 1.8 : 1}"/>
          <text x="${n.x + 12}" y="${n.y + 14}" font-size="10.5" font-weight="600" fill="var(--ink)">${ex ? "📊 " : ""}${n.id}</text>
          <text x="${n.x + 12}" y="${n.y + 27}" font-size="9" fill="${c}">${n.type}</text></g>`);
      });
      $$("#ln-dag").innerHTML = `<svg viewBox="0 0 720 272" style="min-width:620px">${parts.join("")}</svg>`;
      $$("#ln-cmd").innerHTML = `<span class="p">$</span>dbt build <span class="fl">-s</span> <span class="v">"${cur}"</span>`;
      const models = [...sel].filter(id => BY[id].type === "model");
      $$("#ln-out").innerHTML = `<b>${models.length}</b> model${models.length !== 1 ? "s" : ""} built${[...sel].some(id => BY[id].type === "source") ? " (sources are selected but never built: tests and freshness apply to them)" : ""}. <span class="muted">${PRESETS[cur].d}.</span>`;
    }
    segmented($$("#ln-sel"), Object.keys(PRESETS).map(k => ({ value: k, label: k })), cur, v => { cur = v; render(); });
    render();
  }

  // ------------------------------------------------ 2 · package resolution
  const pk = document.getElementById("pkgsim");
  if (pk) {
    const $$ = s => pk.querySelector(s);
    const VERS = ["1.0.0", "1.1.0", "1.1.1", "1.2.0", "1.3.0", "1.4.0"]; // illustrative
    const RANGES = {
      root: { label: "your project", opts: { a: [">=1.0.0", "<2.0.0"], b: [">=1.3.0", "<2.0.0"], c: ["1.1.1"] } },
      pkgA: { label: "audit_helper", opts: { a: [">=1.0.0", "<2.0.0"], b: [">=1.1.0", "<1.3.0"] } },
      pkgB: { label: "codegen", opts: { a: [">=1.0.0", "<2.0.0"], b: [">=1.2.0", "<1.5.0"] } },
    };
    const st = { root: "a", pkgA: "b", pkgB: "a", locked: false };
    const cmp = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
    const ok = (v, r) => r.every(c => { const m = c.match(/^(>=|<=|>|<)?(.+)$/); const op = m[1] || "=", t = m[2], d = cmp(v, t);
      return op === ">=" ? d >= 0 : op === "<=" ? d <= 0 : op === ">" ? d > 0 : op === "<" ? d < 0 : d === 0; });
    function render() {
      const ranges = Object.entries(RANGES).map(([k, r]) => ({ k, label: r.label, r: r.opts[st[k]] }));
      const fits = VERS.filter(v => ranges.every(x => ok(v, x.r)));
      const pick = fits[fits.length - 1];
      Object.entries(RANGES).forEach(([k, r]) => segmented($$(`#pk-${k}`), Object.entries(r.opts).map(([o, v]) => ({ value: o, label: v.join(", ") })), st[k], v => { st[k] = v; render(); }));
      const W = 640, L = 150, x = i => L + i * ((W - L - 20) / (VERS.length - 1));
      const parts = VERS.map((v, i) => `<line x1="${x(i)}" x2="${x(i)}" y1="16" y2="${30 + ranges.length * 30}" stroke="var(--line)"/><text x="${x(i)}" y="12" text-anchor="middle" font-size="10" fill="var(--muted)">${v}</text>`);
      ranges.forEach((rg, j) => {
        const y = 26 + j * 30, inside = VERS.map((v, i) => ok(v, rg.r) ? i : -1).filter(i => i >= 0);
        parts.push(`<text x="8" y="${y + 13}" font-size="10.5" fill="var(--ink)">${rg.label}</text>`);
        if (inside.length) parts.push(`<rect x="${x(inside[0]) - 8}" y="${y}" width="${x(inside[inside.length - 1]) - x(inside[0]) + 16}" height="18" rx="9" fill="#3a6fd0" opacity=".25" stroke="#3a6fd0"/>`);
      });
      if (pick) { const i = VERS.indexOf(pick); parts.push(`<circle cx="${x(i)}" cy="${30 + ranges.length * 30}" r="8" fill="#1f9d6b"><animate attributeName="r" values="6;10;6" dur="1.2s" repeatCount="indefinite"/></circle>`); }
      $$("#pk-svg").innerHTML = `<svg viewBox="0 0 ${W} ${48 + ranges.length * 30}" style="min-width:560px">${parts.join("")}</svg>`;
      $$("#pk-out").innerHTML = pick
        ? `<div class="verdict ok">✓ <code>dbt deps</code> picks the <b>highest</b> version in every range: <b>dbt_utils ${pick}</b> (illustrative version numbers).</div>
           <div class="file">package-lock.yml (commit it)</div><pre class="code">packages:
  - package: dbt-labs/dbt_utils
    version: ${pick}
  - package: dbt-labs/audit_helper
    version: 0.12.0
  - package: dbt-labs/codegen
    version: 0.13.1
sha1_hash: 7c1e…   <span class="c"># hash of packages.yml: if it changes, deps re-resolves</span></pre>`
        : `<div class="verdict bad">✗ Version error for package dbt-labs/dbt_utils: no version satisfies every range. Widen your range, or upgrade/downgrade the package that pins it.</div>`;
    }
    render();
  }
})();
