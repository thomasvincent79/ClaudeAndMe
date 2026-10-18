// =====================================================================
// Source freshness simulator: drag "now", watch age vs warn/error zones.
// age = snapshotted_at (now) - max(loaded_at_field); error_after wins over
// warn_after. Plus a source_status:fresher+ selection demo.
// =====================================================================
(function () {
  const root = document.getElementById("freshsim");
  if (!root) return;
  const $$ = s => root.querySelector(s);
  const T0 = Date.UTC(2024, 5, 10, 0, 0); // 2024-06-10 00:00 UTC
  const h = n => T0 + n * 3600e3;
  const TABLES = [
    { id: "orders", last: h(3), warn: 6, err: 12, field: "_etl_loaded_at", filter: true },
    { id: "customers", last: h(-10), warn: 12, err: 24, field: "_etl_loaded_at" },
    { id: "payments", last: h(-30), warn: 12, err: 24, field: "_etl_loaded_at" },
    { id: "product_skus", last: h(-200), off: true },
  ];
  const st = { now: 8, mode: "field" };
  const fmt = t => new Date(t).toISOString().slice(0, 16).replace("T", " ");

  function status(t, nowMs) {
    if (t.off) return { s: "SKIP", age: null };
    const age = (nowMs - t.last) / 3600e3;
    return { s: age > t.err ? "ERROR STALE" : age > t.warn ? "WARN" : "PASS", age };
  }

  function render() {
    const nowMs = h(st.now);
    $$("#fr-now").textContent = fmt(nowMs) + " UTC";
    const maxAge = 48, W = 520, L = 140;
    const x = a => L + Math.min(a, maxAge) / maxAge * W;
    const rows = [];
    TABLES.forEach((t, i) => {
      const y = 30 + i * 44, r = status(t, nowMs);
      rows.push(`<text x="10" y="${y + 17}" font-size="12" fill="var(--ink)" font-weight="600">${t.id}</text>`);
      if (t.off) {
        rows.push(`<rect x="${L}" y="${y + 4}" width="${W}" height="18" rx="6" fill="var(--soft)" stroke="var(--line)" stroke-dasharray="4 3"/>
          <text x="${L + 10}" y="${y + 17}" font-size="10.5" fill="var(--muted)">freshness: null → not checked</text>`);
        return;
      }
      rows.push(`<rect x="${L}" y="${y + 4}" width="${x(t.warn) - L}" height="18" rx="6" fill="var(--new)"/>
        <rect x="${x(t.warn)}" y="${y + 4}" width="${x(t.err) - x(t.warn)}" height="18" fill="var(--upd)"/>
        <rect x="${x(t.err)}" y="${y + 4}" width="${L + W - x(t.err)}" height="18" rx="6" fill="var(--del)"/>
        <text x="${x(t.warn) + 3}" y="${y + 34}" font-size="9" fill="var(--muted)">warn ${t.warn}h</text>
        <text x="${x(t.err) + 3}" y="${y + 34}" font-size="9" fill="var(--muted)">error ${t.err}h</text>`);
      if (r.age >= 0) {
        const col = r.s === "PASS" ? "#1f9d6b" : r.s === "WARN" ? "#d99a00" : "#e0442f";
        rows.push(`<line x1="${L}" x2="${x(r.age)}" y1="${y + 13}" y2="${y + 13}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>
          <circle cx="${x(r.age)}" cy="${y + 13}" r="7" fill="${col}" stroke="var(--card)" stroke-width="2"/>
          <text x="${L + W + 12}" y="${y + 17}" font-size="11" font-weight="700" fill="${col}">${r.s} · ${r.age.toFixed(0)}h${r.age > maxAge ? "+" : ""}</text>`);
      } else {
        rows.push(`<text x="${L + W + 12}" y="${y + 17}" font-size="11" fill="var(--muted)">not loaded yet</text>`);
      }
    });
    [0, 12, 24, 36, 48].forEach(a => rows.push(`<text x="${x(a)}" y="18" font-size="9.5" text-anchor="middle" fill="var(--muted)">${a}h</text>`));
    $$("#fr-svg").innerHTML = `<svg viewBox="0 0 800 ${30 + TABLES.length * 44}" style="min-width:640px">${rows.join("")}</svg>`;

    // CLI output
    const checked = TABLES.filter(t => !t.off);
    const lines = checked.map((t, i) => {
      const r = status(t, nowMs);
      const tag = r.age < 0 ? "PASS" : r.s;
      const word = tag === "PASS" ? "PASS" : tag === "WARN" ? "WARN" : "ERROR STALE";
      const col = tag === "PASS" ? "s" : tag === "WARN" ? "h" : "k";
      return `${i + 1} of ${checked.length} <span class="${col}">${word.padEnd(11)}</span> freshness of shop.${t.id.padEnd(10)} [${word} in 0.${3 + i}s]`;
    });
    const errs = checked.filter(t => status(t, nowMs).s === "ERROR STALE").length;
    $$("#fr-out").innerHTML = `<pre class="code">$ dbt source freshness
${lines.join("\n")}

${errs ? `<span class="k">Done. exit code 1</span>: a stale source fails the job, so downstream jobs can be blocked` : `<span class="s">Done. exit code 0</span> (WARN does not fail the job)`}
<span class="c">→ results written to target/sources.json</span></pre>`;

    // compiled query
    const t = TABLES[0];
    $$("#fr-sql").innerHTML = st.mode === "field"
      ? `<div class="file">compiled freshness query · loaded_at_field + filter</div><pre class="code">select
  max(${t.field}) as max_loaded_at,
  convert_timezone('UTC', current_timestamp()) as snapshotted_at
from raw.shop.orders
<span class="h">where ${t.field} &gt;= dateadd('day', -3, current_timestamp)</span>   <span class="c">-- filter: limits the scan</span></pre>`
      : `<div class="file">metadata-based freshness · no loaded_at_field</div><pre class="code"><span class="c">-- no query on the table itself: dbt reads warehouse metadata
-- (e.g. information_schema.tables.last_altered on Snowflake)</span>
select table_name, last_altered as max_loaded_at
from raw.information_schema.tables
where table_schema = 'SHOP'</pre>
      <div class="callout warn" style="margin-top:8px"><b>Metadata measures "table changed", not "new data arrived"</b>
      <p>A load that inserts zero rows, a delete, or a maintenance operation can update <code>last_altered</code>, so the source looks fresh when it isn't.
      Prefer <code>loaded_at_field</code> when you have a reliable load timestamp.</p></div>`;
  }

  const slider = $$("#fr-slider");
  slider.addEventListener("input", () => { st.now = +slider.value; render(); });
  segmented($$("#fr-mode"), [{ value: "field", label: "loaded_at_field" }, { value: "meta", label: "metadata (no field)" }], st.mode, v => { st.mode = v; render(); });
  $$("#fr-play").addEventListener("click", () => {
    let v = 4; slider.value = 4; st.now = 4; render();
    const id = setInterval(() => { v += 1; if (v > 52) { clearInterval(id); return; } slider.value = v; st.now = v; render(); }, 90);
  });
  render();

  // -------------------------------------------- source_status:fresher+
  const sroot = document.getElementById("freshersim");
  if (!sroot) return;
  const SRC = ["orders", "customers", "payments"];
  const MODELS = [
    { id: "stg_orders", p: ["orders"], x: 250, y: 20 }, { id: "stg_customers", p: ["customers"], x: 250, y: 80 }, { id: "stg_payments", p: ["payments"], x: 250, y: 140 },
    { id: "fct_orders", p: ["stg_orders", "stg_payments"], x: 470, y: 50 }, { id: "dim_customers", p: ["stg_customers"], x: 470, y: 120 },
    { id: "mart_revenue", p: ["fct_orders", "dim_customers"], x: 680, y: 85 },
  ];
  const fresher = new Set(["orders"]);
  const pos = { orders: { x: 20, y: 20 }, customers: { x: 20, y: 80 }, payments: { x: 20, y: 140 } };
  MODELS.forEach(m => { pos[m.id] = m; });
  function selected() {
    const sel = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      MODELS.forEach(m => { if (!sel.has(m.id) && m.p.some(p => fresher.has(p) || sel.has(p))) { sel.add(m.id); changed = true; } });
    }
    return sel;
  }
  function drawF() {
    const sel = selected(); const parts = [];
    MODELS.forEach(m => m.p.forEach(p => {
      const a = pos[p], hot = sel.has(m.id) && (fresher.has(p) || sel.has(p));
      parts.push(`<path class="dag-edge ${hot ? "hot" : ""}" d="M${a.x + 150} ${a.y + 18} C${a.x + 190} ${a.y + 18} ${m.x - 40} ${m.y + 18} ${m.x} ${m.y + 18}"/>`);
    }));
    SRC.forEach(s => {
      const p = pos[s], on = fresher.has(s);
      parts.push(`<g style="cursor:pointer" data-src="${s}"><rect x="${p.x}" y="${p.y}" width="150" height="36" rx="9" fill="${on ? "var(--new)" : "var(--card)"}" stroke="${on ? "#1f9d6b" : "var(--line)"}" stroke-width="1.6"/>
        <rect x="${p.x}" y="${p.y}" width="5" height="36" rx="2" fill="#2fa36b"/>
        <text x="${p.x + 12}" y="${p.y + 16}" font-size="11" font-weight="600" fill="var(--ink)">shop.${s}</text>
        <text x="${p.x + 12}" y="${p.y + 29}" font-size="9.5" fill="${on ? "var(--new-ink)" : "var(--muted)"}">${on ? "fresher ✓ (click)" : "no new data (click)"}</text></g>`);
    });
    MODELS.forEach(m => {
      const on = sel.has(m.id);
      parts.push(`<g class="dag-node ${on ? "" : "dim"}"><rect class="body" x="${m.x}" y="${m.y}" width="150" height="36" rx="9" fill="${on ? "color-mix(in srgb, #3a6fd0 16%, var(--card))" : "var(--card)"}" stroke="${on ? "#3a6fd0" : "var(--line)"}" stroke-width="1.6"/>
        <rect x="${m.x}" y="${m.y}" width="5" height="36" rx="2" fill="#3a6fd0"/>
        <text x="${m.x + 12}" y="${m.y + 22}" font-size="11" font-weight="600" fill="var(--ink)">${m.id}</text></g>`);
    });
    sroot.querySelector("#fresher-svg").innerHTML = `<svg viewBox="0 0 840 190" style="min-width:680px">${parts.join("")}</svg>`;
    sroot.querySelectorAll("[data-src]").forEach(g => g.addEventListener("click", () => {
      const s = g.dataset.src; fresher.has(s) ? fresher.delete(s) : fresher.add(s); drawF();
    }));
    sroot.querySelector("#fresher-out").innerHTML = `<b>${sel.size}</b> of ${MODELS.length} models rebuilt: ${[...sel].join(", ") || "none, so the job is a no-op"}`;
  }
  drawF();
})();
