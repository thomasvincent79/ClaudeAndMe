// =====================================================================
// "Which test should I use?" — a small decision tree with an animated path
// =====================================================================
(function () {
  const root = document.getElementById("tguide");
  if (!root) return;
  const $$ = s => root.querySelector(s);

  const Q = {
    start: { q: "What do you want to be sure about?", opts: [
      { l: "My SQL logic is correct (edge cases)", to: "unit" },
      { l: "The values in the data", to: "data" },
      { l: "The columns & types consumers rely on", to: "contract" },
      { l: "Data arrived on time", to: "fresh" },
      { l: "My refactor didn't change results", to: "regression" },
    ] },
    data: { q: "What kind of rule is it?", opts: [
      { l: "Key unique / not null, enum, foreign key", to: "builtin" },
      { l: "Common but not built-in (composite key, range, regex, recency…)", to: "package" },
      { l: "My own rule, needed on many columns / models", to: "custom" },
      { l: "A one-off business rule across tables", to: "singular" },
    ] },
  };
  const R = {
    builtin: { t: "Built-in generic test", a: "t-builtin", why: "Zero code, and it should be on every model anyway.", ex: "data_tests: [unique, not_null]" },
    package: { t: "Generic test from a package", a: "t-package", why: "Someone already wrote and tested it.", ex: "- dbt_utils.unique_combination_of_columns:\n    combination_of_columns: [order_id, line_no]" },
    custom: { t: "Custom generic test", a: "t-custom", why: "Write the SQL once, then reuse it in YAML everywhere.", ex: "{% test is_positive(model, column_name) %}\nselect * from {{ model }} where {{ column_name }} <= 0\n{% endtest %}" },
    singular: { t: "Singular test", a: "t-singular", why: "Free-form SQL, ideal for reconciliations between models.", ex: "-- tests/assert_payments_cover_orders.sql\nselect ... having paid < amount" },
    unit: { t: "Unit test (1.8+)", a: "t-unit", why: "Mocked inputs and an expected output. It tests the code, runs before the build, and covers cases prod doesn't have yet.", ex: "unit_tests:\n  - name: ...\n    given: [...]\n    expect: {rows: [...]}" },
    contract: { t: "Model contract (+ data tests)", a: "t-contract", why: "The build fails if the shape drifts. Add model versions for breaking changes.", ex: "config:\n  contract: {enforced: true}" },
    fresh: { t: "Source freshness", a: "t-fresh", why: "A dedicated command, run first in the job, with warn/error thresholds.", ex: "freshness:\n  warn_after: {count: 12, period: hour}" },
    regression: { t: "Regression / audit test", a: "t-regression", why: "Compares dev with prod on keys and values (audit_helper, or compare changes on the platform).", ex: "{{ audit_helper.compare_relations(...) }}" },
  };
  // tree layout
  const NODES = {
    start: { x: 20, y: 150, l: "What to check?" },
    data: { x: 210, y: 70, l: "Data values" },
    unit: { x: 210, y: 150, l: "Unit test", leaf: 1 }, contract: { x: 210, y: 200, l: "Contract", leaf: 1 },
    fresh: { x: 210, y: 250, l: "Freshness", leaf: 1 }, regression: { x: 210, y: 300, l: "Regression", leaf: 1 },
    builtin: { x: 400, y: 10, l: "Built-in generic", leaf: 1 }, package: { x: 400, y: 60, l: "Package generic", leaf: 1 },
    custom: { x: 400, y: 110, l: "Custom generic", leaf: 1 }, singular: { x: 400, y: 160, l: "Singular", leaf: 1 },
  };
  const EDGES = [["start", "data"], ["start", "unit"], ["start", "contract"], ["start", "fresh"], ["start", "regression"],
    ["data", "builtin"], ["data", "package"], ["data", "custom"], ["data", "singular"]];
  let path = ["start"];

  function draw() {
    const on = new Set(path); const W = 150, H = 34; const parts = [];
    EDGES.forEach(([a, b], i) => {
      const A = NODES[a], B = NODES[b], hot = on.has(a) && on.has(b);
      parts.push(`<path id="tge${i}" class="dag-edge ${hot ? "hot" : ""}" d="M${A.x + W} ${A.y + H / 2} C${A.x + W + 25} ${A.y + H / 2} ${B.x - 25} ${B.y + H / 2} ${B.x} ${B.y + H / 2}"/>`);
      if (hot) parts.push(`<circle r="5" class="flow-dot"><animateMotion dur="1.2s" repeatCount="indefinite"><mpath href="#tge${i}"/></animateMotion></circle>`);
    });
    Object.entries(NODES).forEach(([k, n]) => {
      const act = on.has(k), last = path[path.length - 1] === k;
      parts.push(`<g class="dag-node ${act || path.length === 1 ? "" : "dim"}">
        <rect class="body" x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="${n.leaf ? 17 : 8}" fill="${last && n.leaf ? "var(--new)" : act ? "color-mix(in srgb, var(--accent) 16%, var(--card))" : "var(--card)"}" stroke="${act ? "var(--accent)" : "var(--line)"}" stroke-width="${act ? 2 : 1}"/>
        <text x="${n.x + W / 2}" y="${n.y + 21}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink)">${n.l}</text></g>`);
    });
    $$("#tg-tree").innerHTML = `<svg viewBox="0 0 570 345" style="min-width:480px">${parts.join("")}</svg>`;
  }
  function render() {
    const cur = path[path.length - 1];
    if (Q[cur]) {
      $$("#tg-q").innerHTML = `<div class="pane-title"><span>question ${path.length}</span>${path.length > 1 ? '<button class="btn" id="tg-back">← back</button>' : ""}</div>
        <h3 style="margin:4px 0 10px">${Q[cur].q}</h3>
        <div class="tg-opts">${Q[cur].opts.map((o, i) => `<button class="tg-opt" data-i="${i}">${esc(o.l)}</button>`).join("")}</div>`;
      $$("#tg-result").innerHTML = "";
      root.querySelectorAll(".tg-opt").forEach(b => b.addEventListener("click", () => { path.push(Q[cur].opts[+b.dataset.i].to); render(); }));
    } else {
      const r = R[cur];
      $$("#tg-q").innerHTML = `<div class="pane-title"><span>recommendation</span><button class="btn" id="tg-back">← back</button></div>`;
      $$("#tg-result").innerHTML = `<div class="verdict ok"><div style="font-size:1.1rem;font-weight:800;margin-bottom:4px">→ ${r.t}</div>${esc(r.why)}</div>
        <pre class="code">${esc(r.ex)}</pre>
        <div class="controls"><a class="btn primary" href="#${r.a}" style="text-decoration:none">See the full example ↓</a><button class="btn" id="tg-restart">Start over</button></div>`;
      $$("#tg-restart").addEventListener("click", () => { path = ["start"]; render(); });
      const card = document.getElementById(r.a);
      document.querySelectorAll(".tcard").forEach(c => c.classList.toggle("hl", c === card));
    }
    const back = root.querySelector("#tg-back");
    if (back) back.addEventListener("click", () => { path.pop(); render(); });
    draw();
  }
  render();
})();
