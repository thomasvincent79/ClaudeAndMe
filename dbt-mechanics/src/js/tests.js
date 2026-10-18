// =====================================================================
// Data test simulator: a data test is a query returning failing records.
// dbt counts them, then applies severity / warn_if / error_if.
// =====================================================================
(function () {
  const root = document.getElementById("testsim");
  if (!root) return;

  const ORDERS = [
    { id: 1, customer_id: 101, status: "placed", amount: 20 },
    { id: 2, customer_id: 102, status: "shipped", amount: 35 },
    { id: 3, customer_id: null, status: "placed", amount: 10 },
    { id: 4, customer_id: 104, status: "returnd", amount: 50 },
    { id: 4, customer_id: 105, status: "shipped", amount: 15 },
    { id: 6, customer_id: 999, status: "completed", amount: 40 },
    { id: 7, customer_id: 101, status: "completed", amount: 60 },
  ];
  const CUSTOMERS = [101, 102, 104, 105];
  const VALUES = ["placed", "shipped", "completed", "returned"];

  const TESTS = {
    unique: {
      label: "unique(id)",
      fail(rows) {
        const c = {}; rows.forEach(r => { if (r.id !== null) c[r.id] = (c[r.id] || 0) + 1; });
        const dup = Object.keys(c).filter(k => c[k] > 1).map(Number);
        return { count: dup.length, rows: rows.filter(r => dup.includes(r.id)), unit: "duplicated values" };
      },
      sql: w => `select id as unique_field, count(*) as n_records
from ${w}
where id is not null
group by id
having count(*) &gt; 1`,
      yaml18: `      - name: id
        data_tests:
          - unique`,
      yaml112: `      - name: id
        data_tests:
          - unique`,
    },
    not_null: {
      label: "not_null(customer_id)",
      fail(rows) { const f = rows.filter(r => r.customer_id === null); return { count: f.length, rows: f, unit: "rows" }; },
      sql: w => `select customer_id
from ${w}
where customer_id is null`,
      yaml18: `      - name: customer_id
        data_tests:
          - not_null`,
      yaml112: `      - name: customer_id
        data_tests:
          - not_null`,
    },
    accepted_values: {
      label: "accepted_values(status)",
      fail(rows) {
        const bad = [...new Set(rows.filter(r => !VALUES.includes(r.status)).map(r => r.status))];
        return { count: bad.length, rows: rows.filter(r => bad.includes(r.status)), unit: "unexpected values" };
      },
      sql: w => `with all_values as (
  select status as value_field, count(*) as n_records
  from ${w}
  group by status
)
select * from all_values
where value_field not in ('placed','shipped','completed','returned')`,
      yaml18: `      - name: status
        data_tests:
          - accepted_values:
              values: ['placed', 'shipped', 'completed', 'returned']`,
      yaml112: `      - name: status
        data_tests:
          - accepted_values:
              <span class="h">arguments:</span>          <span class="c"># 1.10.5+</span>
                values: ['placed', 'shipped', 'completed', 'returned']`,
    },
    relationships: {
      label: "relationships(customer_id → customers.id)",
      fail(rows) { const f = rows.filter(r => r.customer_id !== null && !CUSTOMERS.includes(r.customer_id)); return { count: f.length, rows: f, unit: "orphan rows" }; },
      sql: w => `select child.customer_id as from_field
from ${w} as child
left join customers as parent on child.customer_id = parent.id
where child.customer_id is not null
  and parent.id is null`,
      yaml18: `      - name: customer_id
        data_tests:
          - relationships:
              to: ref('customers')
              field: id`,
      yaml112: `      - name: customer_id
        data_tests:
          - relationships:
              <span class="h">arguments:</span>          <span class="c"># 1.10.5+</span>
                to: ref('customers')
                field: id`,
    },
  };
  const WHERES = [
    { id: "", label: "none" },
    { id: "amount > 12", label: "amount > 12" },
    { id: "status != 'returnd'", label: "status != 'returnd'" },
  ];

  const st = { test: "unique", severity: "error", warnIf: "!=0", errorIf: "!=0", where: "", store: false };
  const els = {
    test: $("#t-test", root), sev: $("#t-sev", root), warnIf: $("#t-warnif", root), errorIf: $("#t-errorif", root),
    where: $("#t-where", root), store: $("#t-store", root), table: $("#t-table", root), sql: $("#t-sql", root),
    result: $("#t-result", root), yaml: $("#t-yaml", root),
  };

  function cond(expr, n) {
    const m = String(expr).replace(/\s+/g, "").match(/^(>=|<=|!=|=|>|<)(\d+)$/);
    if (!m) return null;
    const v = Number(m[2]);
    return { ">": n > v, ">=": n >= v, "<": n < v, "<=": n <= v, "=": n === v, "!=": n !== v }[m[1]];
  }

  function applyWhere(rows) {
    if (st.where === "amount > 12") return rows.filter(r => r.amount > 12);
    if (st.where === "status != 'returnd'") return rows.filter(r => r.status !== "returnd");
    return rows;
  }

  function render() {
    segmented(els.test, Object.entries(TESTS).map(([k, t]) => ({ value: k, label: t.label })), st.test, v => { st.test = v; render(); });
    segmented(els.sev, [{ value: "error", label: "error" }, { value: "warn", label: "warn" }], st.severity, v => { st.severity = v; render(); });
    segmented(els.where, WHERES.map(w => ({ value: w.id, label: w.label })), st.where, v => { st.where = v; render(); });
    segmented(els.store, [{ value: false, label: "false" }, { value: true, label: "true" }], st.store, v => { st.store = v; render(); });

    const t = TESTS[st.test];
    const scope = applyWhere(ORDERS);
    const res = t.fail(scope);
    const failSet = new Set(res.rows);
    renderTable(els.table, [{ key: "id", label: "id" }, { key: "customer_id", label: "customer_id" }, { key: "status", label: "status" }, { key: "amount", label: "amount" }],
      ORDERS.map(r => ({ ...r, _cls: !scope.includes(r) ? "gone" : failSet.has(r) ? "del" : "" })));

    const from = st.where ? `(select * from analytics.orders where ${st.where}) dbt_subquery` : "analytics.orders";
    els.sql.innerHTML = `<div class="file">target/compiled/…/${st.test}_orders_….sql</div><pre class="code">${t.sql(from)}</pre>`;

    // dbt's logic: failures = count(*) of the test query; then error_if / warn_if
    const errorHit = cond(st.errorIf, res.count), warnHit = cond(st.warnIf, res.count);
    let status, why;
    if (errorHit === null || warnHit === null) { status = "?"; why = "Conditions must look like >0, >=10, !=0…"; }
    else if (st.severity === "error" && errorHit) { status = "ERROR"; why = `severity=error and error_if '${st.errorIf}' is true for ${res.count}`; }
    else if (warnHit) { status = "WARN"; why = st.severity === "error" ? `error_if '${st.errorIf}' is false, warn_if '${st.warnIf}' is true` : `severity=warn: error_if is ignored, warn_if '${st.warnIf}' is true`; }
    else { status = "PASS"; why = `warn_if '${st.warnIf}' is false for ${res.count}`; }
    const cls = status === "PASS" ? "ok" : status === "ERROR" ? "bad" : "";
    els.result.innerHTML = `<div class="verdict ${cls}" style="${status === "WARN" ? "background:var(--upd);color:var(--upd-ink)" : ""}">
      <strong>${status}</strong>: the test query returns ${res.count} ${res.unit} → ${esc(why)}.
      ${status === "ERROR" ? "<br>dbt build skips everything downstream of this model." : status === "WARN" ? "<br>Reported, but the run continues (unless --warn-error)." : ""}
      ${st.store && res.count ? `<br>Failing records stored in <code>&lt;schema&gt;_dbt_test__audit.${st.test}_orders_…</code> (store_failures=true).` : ""}</div>`;

    const cfg = [];
    if (st.severity !== "error") cfg.push(`severity: ${st.severity}`);
    if (st.warnIf !== "!=0") cfg.push(`warn_if: "${st.warnIf}"`);
    if (st.errorIf !== "!=0") cfg.push(`error_if: "${st.errorIf}"`);
    if (st.where) cfg.push(`where: "${st.where}"`);
    if (st.store) cfg.push("store_failures: true");
    const withCfg = (yaml) => {
      if (!cfg.length) return yaml;
      const lines = yaml.split("\n");
      if (/- (unique|not_null)$/.test(lines[lines.length - 1])) lines[lines.length - 1] += ":";
      const ind = " ".repeat(14); // same level as the test's arguments
      return lines.join("\n") + `\n${ind}config:\n` + cfg.map(c => `${ind}  ${esc(c)}`).join("\n");
    };
    els.yaml.innerHTML = `<div class="vgrid">
      <div class="vcol only-v18"><span class="tag v18">1.8.6</span><div class="file">models/orders.yml</div><pre class="code">models:
  - name: orders
    columns:
${withCfg(t.yaml18)}</pre></div>
      <div class="vcol only-v112"><span class="tag v112">1.12</span><div class="file">models/orders.yml</div><pre class="code">models:
  - name: orders
    columns:
${withCfg(t.yaml112)}</pre></div></div>`;
  }

  els.warnIf.addEventListener("input", e => { st.warnIf = e.target.value; render(); });
  els.errorIf.addEventListener("input", e => { st.errorIf = e.target.value; render(); });
  els.warnIf.value = st.warnIf; els.errorIf.value = st.errorIf;
  render();
})();
