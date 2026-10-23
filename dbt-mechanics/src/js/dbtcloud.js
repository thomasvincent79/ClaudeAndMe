// =====================================================================
// dbt platform page: (1) CI pipeline stepper, (2) compare-changes PR
// comment mock, (3) dbt State vs "build everything" simulator.
// =====================================================================
(function () {
  // ------------------------------------------------ 1 · CI pipeline
  const ci = document.getElementById("cisim");
  if (ci) {
    const STEPS = [
      { t: "PR opened", icon: "🔀", p: "You push branch <code>feat/eur-amounts</code> and open PR #456. The Git webhook (GitHub, GitLab or Azure DevOps) notifies dbt.",
        core: "You maintain a GitHub Actions / GitLab CI workflow triggered on <code>pull_request</code>." },
      { t: "CI job starts", icon: "⚙️", p: "The CI job (id 123) starts. A newer push to the same PR cancels the stale run (smart cancellation, paid plans).",
        core: "Write concurrency / cancel-in-progress rules yourself." },
      { t: "Lint", icon: "🧹", p: "Linting runs first (SQLFluff rules from your <code>.sqlfluff</code>; native <code>dbt lint</code> on v2). You choose: stop or continue on error.",
        core: "Add a <code>sqlfluff lint models/</code> step with your own dbt templater setup." },
      { t: "Build modified", icon: "🏗️", p: "<code>dbt build --select state:modified+</code> runs in the temporary schema <code>dbt_cloud_pr_123_456</code>. It <strong>defers automatically</strong> to Production, so unchanged parents are read from prod.",
        core: "Download prod's <code>manifest.json</code> (artifact store), then run <code>dbt build -s state:modified+ --defer --state prod/</code> with a schema built from the PR number." },
      { t: "Compare changes", icon: "🔍", p: "Advanced CI (Enterprise) compares the PR's tables with prod and posts a summary comment on the PR: rows added, removed and modified, primary key, columns.",
        core: "No built-in equivalent. Write audit queries yourself, or use a package such as audit_helper." },
      { t: "Merge", icon: "✅", p: "Checks are green and the PR is merged into <code>main</code>.",
        core: "Same, as a branch protection rule on the CI status." },
      { t: "Merge job → prod", icon: "🚀", p: "A merge job (triggered by the merge) deploys the change: for example <code>dbt build -s state:modified+</code> in Production, so the next CI run compares against a fresh manifest.",
        core: "A second workflow on <code>push: main</code>, plus uploading the new manifest for the next CI runs." },
      { t: "Cleanup", icon: "🧽", p: "When the PR closes, dbt drops <code>dbt_cloud_pr_123_456</code> automatically, as long as your <code>generate_schema_name</code> keeps the <code>dbt_cloud_pr_</code> prefix.",
        core: "A scheduled <code>drop schema</code> job or macro, which is easy to forget, so PR schemas pile up." },
    ];
    let cur = 0, timer = null;
    const box = ci.querySelector("#ci-steps"), detail = ci.querySelector("#ci-detail"), play = ci.querySelector("#ci-play");
    function render() {
      box.innerHTML = STEPS.map((s, i) => `<button class="ci-step ${i < cur ? "done" : ""} ${i === cur ? "on" : ""}" data-i="${i}">
        <span class="ci-ico">${s.icon}</span><span class="ci-t">${i + 1}. ${s.t}</span></button>`).join("");
      box.style.setProperty("--prog", (cur / (STEPS.length - 1) * 100) + "%");
      box.querySelectorAll(".ci-step").forEach(b => b.addEventListener("click", () => { stop(); cur = +b.dataset.i; render(); }));
      const s = STEPS[cur];
      detail.innerHTML = `<div class="vgrid" style="grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))">
        <div class="card"><span class="badge" style="background:var(--accent);color:#fff">dbt platform</span><p>${s.p}</p></div>
        <div class="card"><span class="badge">with dbt Core (1.8.6 / 1.12)</span><p>${s.core}</p></div></div>`;
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; play.textContent = "▶ Play the PR"; } }
    play.addEventListener("click", () => {
      if (timer) { stop(); return; }
      cur = 0; render(); play.textContent = "■ Stop";
      timer = setInterval(() => { if (cur >= STEPS.length - 1) { stop(); return; } cur++; render(); }, 1800);
    });
    render();
  }

  // ------------------------------------------------ 2 · compare changes
  const cc = document.getElementById("ccsim");
  if (cc) {
    const SCEN = {
      filter: {
        label: "exclude cancelled orders", diff: `   select order_id, customer_id, amount, status
   from {{ ref('stg_orders') }}
<span class="k">-  </span>
<span class="s">+  where status != 'cancelled'</span>`,
        stats: { before: 10000, after: 9812, added: 0, removed: 188, modified: 0 }, pk: "✓ unique, not null", cols: [],
        rows: [{ k: 1007, col: "—", b: "cancelled · 42.00", a: "(row removed)", t: "del" }, { k: 1191, col: "—", b: "cancelled · 18.50", a: "(row removed)", t: "del" }],
      },
      round: {
        label: "round amount to 0 decimals", diff: `<span class="k">-  amount,</span>
<span class="s">+  round(amount, 0) as amount,</span>`,
        stats: { before: 10000, after: 10000, added: 0, removed: 0, modified: 6234 }, pk: "✓ unique, not null", cols: [{ c: "amount", ch: "type numeric(18,2) → numeric(18,0)" }],
        rows: [{ k: 1001, col: "amount", b: "42.35", a: "42", t: "upd" }, { k: 1002, col: "amount", b: "18.50", a: "19", t: "upd" }, { k: 1003, col: "amount", b: "7.99", a: "8", t: "upd" }],
      },
      join: {
        label: "join customers (fan-out bug)", diff: `<span class="s">+  left join {{ ref('stg_addresses') }} a using (customer_id)</span>
<span class="s">+  , a.city</span>`,
        stats: { before: 10000, after: 10437, added: 437, removed: 0, modified: 0 }, pk: "✗ 437 duplicated order_id", cols: [{ c: "city", ch: "added (varchar)" }],
        rows: [{ k: 1012, col: "order_id", b: "1 row", a: "2 rows (Paris, Lyon)", t: "del" }, { k: 1077, col: "order_id", b: "1 row", a: "3 rows", t: "del" }],
      },
    };
    let sc = "filter";
    const draw = () => {
      const s = SCEN[sc], st = s.stats;
      cc.querySelector("#cc-diff").innerHTML = `<div class="file">models/marts/fct_orders.sql · PR #456</div><pre class="code">${s.diff}</pre>`;
      const bad = s.pk.startsWith("✗");
      cc.querySelector("#cc-comment").innerHTML = `<div class="pr-comment">
        <div class="pr-head"><span class="pr-avatar">dbt</span><b>dbt-platform</b> <span class="muted">commented · CI job #123 · compare against Production</span></div>
        <div class="pr-body">
          <div style="font-weight:700;margin-bottom:8px">🔍 Compare changes · <code>fct_orders</code></div>
          <div class="pr-stats">
            <div><span>Rows</span><b>${st.before.toLocaleString("en-US")} → ${st.after.toLocaleString("en-US")}</b></div>
            <div class="${st.added ? "pos" : ""}"><span>Added</span><b>+${st.added}</b></div>
            <div class="${st.removed ? "neg" : ""}"><span>Removed</span><b>−${st.removed}</b></div>
            <div class="${st.modified ? "mod" : ""}"><span>Modified</span><b>~${st.modified.toLocaleString("en-US")}</b></div>
            <div class="${bad ? "neg" : "pos"}"><span>Primary key</span><b>${s.pk}</b></div>
          </div>
          ${s.cols.length ? `<div style="margin:8px 0 4px"><b>Columns</b>: ${s.cols.map(c => `<code>${c.c}</code> ${esc(c.ch)}`).join(" · ")}</div>` : `<div style="margin:8px 0 4px"><b>Columns</b>: no change</div>`}
          <table class="dt" style="margin-top:6px"><tr><th>order_id</th><th>column</th><th>prod</th><th>this PR</th></tr>
            ${s.rows.map(r => `<tr class="${r.t}"><td>${r.k}</td><td>${r.col}</td><td>${esc(r.b)}</td><td>${esc(r.a)}</td></tr>`).join("")}</table>
          <div class="muted" style="font-size:.78rem;margin-top:6px">Sample of up to 100 cached records per model, kept 30 days.</div>
        </div></div>
        <div class="verdict ${bad ? "bad" : "ok"}" style="margin-top:10px">${bad
          ? "The tests would also catch the duplicates (if you have a unique test), but compare changes shows the reviewer <b>why</b>: a join that fans out."
          : sc === "filter" ? "Intended change: 188 rows removed, nothing else moved. The reviewer can approve with confidence."
          : "Expected: a large modified count, a type change and no row-count change. Check that downstream consumers accept integers."}</div>`;
    };
    segmented(cc.querySelector("#cc-scen"), Object.entries(SCEN).map(([k, v]) => ({ value: k, label: v.label })), sc, v => { sc = v; draw(); });
    draw();
  }

  // ------------------------------------------------ 3 · dbt State
  const ss = document.getElementById("statesim");
  if (ss) {
    const HOURS = ["06", "07", "08", "09", "10", "11", "12", "13"];
    // which source receives new data at which hour
    const NEW = { orders: HOURS, customers: ["06", "12"], fx_rates: ["06"] };
    const M = [
      { id: "stg_orders", p: ["orders"] }, { id: "stg_customers", p: ["customers"] }, { id: "stg_fx", p: ["fx_rates"] },
      { id: "fct_orders", p: ["stg_orders", "stg_fx"] }, { id: "dim_customers", p: ["stg_customers"] },
      { id: "mart_revenue", p: ["fct_orders", "dim_customers"], lagCfg: true },
    ];
    const st = { mode: "state", lag: true, codeChange: true, col: HOURS.length, timer: null };
    function simulate() {
      const grid = {}; const lastBuild = {}; let builds = 0;
      HOURS.forEach((h, hi) => {
        const changed = new Set(Object.keys(NEW).filter(s => NEW[s].includes(h)));
        M.forEach(m => {
          let build, why;
          if (st.mode === "core") { build = true; why = "dbt build rebuilds every selected model"; }
          else {
            const code = st.codeChange && h === "09" && m.id === "dim_customers";
            const fresh = m.p.some(p => changed.has(p));
            if (hi === 0) { build = true; why = "first run"; }
            else if (code) { build = true; why = "code changed (PR merged at 09:00)"; }
            else if (!fresh) { build = false; why = "no new upstream data and no code change → reused"; }
            else if (m.lagCfg && st.lag && lastBuild[m.id] !== undefined && hi - lastBuild[m.id] < 3) { build = false; why = "new data, but built less than 3h ago (lag setting) → waits"; }
            else { build = true; why = "new upstream data"; }
          }
          grid[m.id + h] = { build, why };
          if (build) { builds++; lastBuild[m.id] = hi; changed.add(m.id); }
        });
      });
      return { grid, builds };
    }
    function render() {
      const { grid, builds } = simulate();
      const total = HOURS.length * M.length;
      const head = `<tr><th>model \\ hourly run</th>${HOURS.map((h, i) => `<th class="${i < st.col ? "" : "fut"}">${h}:00</th>`).join("")}</tr>`;
      const srcRows = Object.keys(NEW).map(s => `<tr class="src"><td>source: ${s}</td>${HOURS.map((h, i) => `<td class="${i < st.col ? "" : "fut"}">${NEW[s].includes(h) ? "●" : ""}</td>`).join("")}</tr>`).join("");
      const rows = M.map(m => `<tr><td>${m.id}${m.lagCfg && st.lag && st.mode === "state" ? ' <span class="badge">lag 3h</span>' : ""}</td>${HOURS.map((h, i) => {
        const g = grid[m.id + h];
        if (i >= st.col) return `<td class="fut"></td>`;
        return `<td class="${g.build ? "b" : "s"}" title="${esc(g.why)}">${g.build ? "■" : "·"}</td>`;
      }).join("")}</tr>`).join("");
      ss.querySelector("#state-grid").innerHTML = `<div class="tbl-wrap"><table class="state-grid">${head}${srcRows}${rows}</table></div>`;
      const shown = st.col === HOURS.length;
      const pct = Math.round((1 - builds / total) * 100);
      ss.querySelector("#state-out").innerHTML = shown
        ? `<div class="meter"><div class="meter-bar" style="width:${builds / total * 100}%"></div></div>
           <b>${builds}</b> model builds out of ${total} ${st.mode === "state" ? `<span class="yes">→ ${pct}% skipped</span> (hover a cell to see why)` : "(everything, every hour)"}`
        : "Running…";
    }
    segmented(ss.querySelector("#state-mode"), [{ value: "core", label: "dbt Core: dbt build every hour" }, { value: "state", label: "dbt platform: dbt State" }], st.mode, v => { st.mode = v; render(); });
    ss.querySelectorAll("[data-sk]").forEach(inp => inp.addEventListener("change", () => { st[inp.dataset.sk] = inp.checked; inp.closest(".toggle").classList.toggle("on", inp.checked); render(); }));
    ss.querySelector("#state-play").addEventListener("click", () => {
      clearInterval(st.timer); st.col = 0; render();
      st.timer = setInterval(() => { st.col++; render(); if (st.col >= HOURS.length) clearInterval(st.timer); }, 450);
    });
    render();
  }
})();
