// =====================================================================
// Incremental strategy simulator: same target table + same source,
// each strategy applies its own DML. Phases are animated, and the final table
// is checked against the source ("what a full refresh would give").
// =====================================================================
(function () {
  const root = document.getElementById("incsim");
  if (!root) return;

  const r = (id, event_date, amount, updated_at) => ({ id, event_date, amount, updated_at });
  const TARGET = [
    r(1, "01-01", 10, "01-01"), r(2, "01-01", 20, "01-01"),
    r(3, "01-02", 30, "01-02"), r(4, "01-02", 40, "01-02"),
    r(5, "01-03", 50, "01-03"),
  ];
  const SOURCE = [
    r(1, "01-01", 10, "01-01"), r(2, "01-01", 20, "01-01"),
    r(3, "01-02", 35, "01-04"), r(4, "01-02", 40, "01-02"),
    r(5, "01-03", 55, "01-04"), r(6, "01-03", 60, "01-04"),
    r(7, "01-04", 70, "01-04"),
    r(8, "01-01", 80, "01-04"),  // late-arriving event
  ];
  const SRC_NOTE = { 3: "amount corrected 30→35", 5: "amount corrected 50→55", 6: "new", 7: "new (today)", 8: "new, LATE: event of 01-01 arriving today" };

  const STRATS = [
    { id: "append", label: "append" },
    { id: "merge", label: "merge" },
    { id: "delete+insert", label: "delete+insert" },
    { id: "insert_overwrite", label: "insert_overwrite" },
    { id: "microbatch", label: "microbatch", ver: "v112" },
  ];
  const FILTERS = [
    { id: "changed", label: "updated_at > max(updated_at)" },
    { id: "window", label: "event_date >= max(event_date) - 1 day" },
  ];

  const st = { strat: "merge", filter: "changed", lookback: 1, phase: 0, timer: null };
  const els = {
    strat: $("#inc-strat", root), filter: $("#inc-filter", root), lookback: $("#inc-lookback", root),
    filterWrap: $("#inc-filter-wrap", root), lookbackWrap: $("#inc-lookback-wrap", root),
    source: $("#inc-source", root), input: $("#inc-input", root), inputTitle: $("#inc-input-title", root),
    target: $("#inc-target", root), steps: $("#inc-steps", root), narr: $("#inc-narr", root),
    verdict: $("#inc-verdict", root), model: $("#inc-model", root), sql: $("#inc-sql", root),
    play: $("#inc-play", root),
  };

  const key = x => `${x.id}|${x.event_date}|${x.amount}`;
  const clone = rows => rows.map(x => ({ id: x.id, event_date: x.event_date, amount: x.amount, updated_at: x.updated_at }));
  const sortRows = rows => rows.sort((a, b) => a.id - b.id || (a._order || 0) - (b._order || 0));
  const dayMinus = (d, n) => { const day = parseInt(d.slice(3), 10) - n; return "01-" + String(day).padStart(2, "0"); };

  function modelInput() {
    if (st.strat === "microbatch") return null; // per batch
    if (st.filter === "changed") {
      const mx = TARGET.map(x => x.updated_at).sort().pop();
      return SOURCE.filter(x => x.updated_at > mx);
    }
    const mx = TARGET.map(x => x.event_date).sort().pop();
    return SOURCE.filter(x => x.event_date >= dayMinus(mx, 1));
  }

  function batches() { // run "today" = 01-04, batch_size = day
    const out = [];
    for (let i = st.lookback; i >= 0; i--) out.push(dayMinus("01-04", i));
    return out;
  }

  // Build phases: [{title, text, rows}] where rows carry display classes
  function phases() {
    const base = clone(TARGET);
    const P = [{ title: "Before", text: "Target table as left by the previous run (yesterday).", rows: base.map(x => ({ ...x })) }];
    const input = modelInput();
    const s = st.strat;

    if (s === "append") {
      const after = base.map(x => ({ ...x })).concat(input.map(x => ({ ...x, _cls: "new", _flash: true })));
      P.push({ title: "INSERT", text: `All ${input.length} input rows are inserted as-is. Existing rows are never looked at, so changed rows become duplicates.`, rows: sortRows(after) });
    }

    if (s === "merge") {
      const byId = new Map(base.map(x => [x.id, { ...x }]));
      let upd = 0, ins = 0;
      input.forEach(n => {
        const cur = byId.get(n.id);
        if (cur) {
          const cc = {};
          ["event_date", "amount", "updated_at"].forEach(k => { if (cur[k] !== n[k]) cc[k] = "cell-upd"; });
          Object.assign(cur, n, { _cls: Object.keys(cc).length ? "upd" : "", _cellCls: cc, _flash: true }); upd++;
        } else { byId.set(n.id, { ...n, _cls: "new", _flash: true }); ins++; }
      });
      P.push({ title: "MERGE", text: `One statement: ${upd} input rows matched on unique_key → UPDATE, ${ins} not matched → INSERT. Rows that aren't in the input are left alone.`, rows: sortRows([...byId.values()]) });
    }

    if (s === "delete+insert") {
      const ids = new Set(input.map(x => x.id));
      const marked = base.map(x => ids.has(x.id) ? { ...x, _cls: "gone" } : { ...x });
      P.push({ title: "1 · DELETE", text: `delete from target where id in (select id from tmp): ${marked.filter(x => x._cls).length} rows removed.`, rows: marked });
      const after = base.filter(x => !ids.has(x.id)).concat(input.map(x => ({ ...x, _cls: "new", _flash: true })));
      P.push({ title: "2 · INSERT", text: `insert into target select * from tmp: ${input.length} rows inserted. Same result as merge here, but done in 2 statements.`, rows: sortRows(after) });
    }

    if (s === "insert_overwrite") {
      const parts = [...new Set(input.map(x => x.event_date))].sort();
      const marked = base.map(x => parts.includes(x.event_date) ? { ...x, _cls: "gone" } : { ...x });
      P.push({ title: "1 · DROP partitions", text: `The input touches partitions ${parts.join(", ")}. EVERY existing row in those partitions is removed, whether or not it is in the input.`, rows: marked });
      const after = base.filter(x => !parts.includes(x.event_date)).concat(input.map(x => ({ ...x, _cls: "new", _flash: true })));
      P.push({ title: "2 · WRITE partitions", text: `Partitions ${parts.join(", ")} now contain only the input rows. Other partitions are untouched.`, rows: sortRows(after) });
    }

    if (s === "microbatch") {
      let cur = base.map(x => ({ ...x }));
      batches().forEach(b => {
        const batchRows = SOURCE.filter(x => x.event_date === b);
        const marked = cur.map(x => ({ ...x, _cls: x.event_date === b ? "gone" : "", _flash: false, _cellCls: {} }));
        P.push({ title: `batch ${b} · delete`, text: `Batch [${b}, ${dayMinus(b, -1)}): upstream refs are filtered automatically on event_time. Rows of this batch already in the target are replaced.`, rows: marked });
        cur = cur.filter(x => x.event_date !== b).map(x => ({ ...x, _cls: "", _flash: false, _cellCls: {} }))
          .concat(batchRows.map(x => ({ ...x, _cls: "new", _flash: true })));
        sortRows(cur);
        P.push({ title: `batch ${b} · insert`, text: `${batchRows.length} source rows with event_date in ${b} written. Each batch is an independent query that can be retried alone.`, rows: cur.map(x => ({ ...x })) });
      });
    }
    return P;
  }

  function verdict(rows) {
    const issues = [];
    SOURCE.forEach(s => {
      const got = rows.filter(x => x.id === s.id);
      if (!got.length) issues.push(`id ${s.id} is missing${TARGET.some(t => t.id === s.id) ? " (it was in the target before: data loss)" : " (never loaded)"}`);
      else if (got.length > 1) issues.push(`id ${s.id} is duplicated (${got.map(g => g.amount).join(" and ")})`);
      else if (got[0].amount !== s.amount) issues.push(`id ${s.id} is stale: ${got[0].amount} instead of ${s.amount}`);
    });
    return issues;
  }

  const COLS = [{ key: "id", label: "id" }, { key: "event_date", label: "event_date" }, { key: "amount", label: "amount" }, { key: "updated_at", label: "updated_at", cls: "meta" }];

  function modelSql() {
    const s = st.strat;
    if (s === "microbatch") {
      return `<div class="file">models/fct_orders.sql · dbt 1.9+</div><pre class="code">{{ config(
    materialized=<span class="s">'incremental'</span>,
    incremental_strategy=<span class="s">'microbatch'</span>,
    event_time=<span class="s">'event_date'</span>,
    batch_size=<span class="s">'day'</span>,
    begin=<span class="s">'2024-01-01'</span>,
    <span class="h">lookback=${st.lookback}</span>${getVer() !== "v18" ? `,
    unique_key=<span class="s">'id'</span>  <span class="c">-- required on Postgres only</span>` : ""}
) }}
<span class="c">-- no is_incremental() block: dbt filters the ref below per batch
-- because stg_orders has event_time configured</span>
select id, event_date, amount, updated_at
from {{ ref(<span class="s">'stg_orders'</span>) }}</pre>`;
    }
    const cfg = {
      "append": "",
      "merge": `,\n    unique_key=<span class="s">'id'</span>`,
      "delete+insert": `,\n    unique_key=<span class="s">'id'</span>`,
      "insert_overwrite": `,\n    partition_by={<span class="s">'field'</span>: <span class="s">'event_date'</span>, <span class="s">'data_type'</span>: <span class="s">'date'</span>}`,
    }[s];
    const where = st.filter === "changed"
      ? `where updated_at &gt; (select max(updated_at) from {{ this }})`
      : `where event_date &gt;= (select max(event_date) - interval '1 day' from {{ this }})`;
    return `<div class="file">models/fct_orders.sql</div><pre class="code">{{ config(
    materialized=<span class="s">'incremental'</span>,
    <span class="h">incremental_strategy=<span class="s">'${s}'</span></span>${cfg}
) }}
select id, event_date, amount, updated_at
from {{ ref(<span class="s">'stg_orders'</span>) }}
<span class="k">{% if is_incremental() %}</span>
<span class="h">${where}</span>
<span class="k">{% endif %}</span></pre>`;
  }

  function dmlSql() {
    const s = st.strat;
    const t = "analytics.fct_orders", tmp = "fct_orders__dbt_tmp";
    const m = {
      "append": `insert into ${t} (id, event_date, amount, updated_at)
select id, event_date, amount, updated_at from ${tmp};`,
      "merge": `merge into ${t} as DBT_INTERNAL_DEST
using ${tmp} as DBT_INTERNAL_SOURCE
  on DBT_INTERNAL_SOURCE.id = DBT_INTERNAL_DEST.id
when matched then update set
  event_date = DBT_INTERNAL_SOURCE.event_date,
  amount = DBT_INTERNAL_SOURCE.amount, updated_at = DBT_INTERNAL_SOURCE.updated_at
when not matched then insert (id, event_date, amount, updated_at)
  values (DBT_INTERNAL_SOURCE.id, …);`,
      "delete+insert": `delete from ${t}
where (id) in (select distinct id from ${tmp});

insert into ${t} (id, event_date, amount, updated_at)
select id, event_date, amount, updated_at from ${tmp};`,
      "insert_overwrite": `<span class="c">-- Spark / Databricks (dynamic partition overwrite)</span>
insert overwrite table ${t}
partition (event_date)
select id, amount, updated_at, event_date from ${tmp};

<span class="c">-- BigQuery: merge … on FALSE
--   when not matched by source and event_date in unnest(dbt_partitions_for_replacement) then delete
--   when not matched then insert …</span>`,
      "microbatch": batches().map(b => `<span class="c">-- batch ${b} (Snowflake/Redshift use delete+insert, Postgres merge,
--  BigQuery/Spark insert_overwrite, Databricks replace_where)</span>
delete from ${t}
where event_date &gt;= '2024-${b}' and event_date &lt; '2024-${dayMinus(b, -1)}';
insert into ${t} select … from stg_orders
where event_date &gt;= '2024-${b}' and event_date &lt; '2024-${dayMinus(b, -1)}';`).join("\n\n"),
    };
    return `<div class="file">what dbt runs (simplified)</div><pre class="code">${m[s]}</pre>`;
  }

  function stratsForVer() {
    return STRATS.map(x => ({ value: x.id, label: x.label + (x.ver && getVer() === "both" ? " (1.9+)" : ""), disabled: x.ver === "v112" && getVer() === "v18",
      title: x.ver === "v112" && getVer() === "v18" ? "microbatch arrives in dbt 1.9" : "" }));
  }

  function render() {
    stopPlay();
    if (getVer() === "v18" && st.strat === "microbatch") st.strat = "merge";
    segmented(els.strat, stratsForVer(), st.strat, v => { st.strat = v; st.phase = 99; render(); });
    segmented(els.filter, FILTERS.map(f => ({ value: f.id, label: f.label })), st.filter, v => { st.filter = v; st.phase = 99; render(); });
    segmented(els.lookback, [1, 2, 3].map(n => ({ value: n, label: String(n) })), st.lookback, v => { st.lookback = v; st.phase = 99; render(); });
    const mb = st.strat === "microbatch";
    els.filterWrap.style.display = mb ? "none" : "";
    els.lookbackWrap.style.display = mb ? "" : "none";

    // source with notes
    renderTable(els.source, COLS.concat([{ key: "note", label: "" }]), SOURCE.map(x => {
      const tgt = TARGET.find(t => t.id === x.id);
      return { ...x, note: SRC_NOTE[x.id] || "", _cls: !tgt ? "new" : tgt.amount !== x.amount ? "upd" : "" };
    }));

    // model input
    const input = modelInput();
    if (mb) {
      els.inputTitle.textContent = `input: one query per batch (${batches().join(", ")})`;
      renderTable(els.input, COLS.concat([{ key: "batch", label: "batch" }]),
        SOURCE.filter(x => batches().includes(x.event_date)).map(x => ({ ...x, batch: x.event_date })).sort((a, b) => a.event_date < b.event_date ? -1 : 1));
    } else {
      els.inputTitle.textContent = `input: the model's select (is_incremental() = true) → ${input.length} rows`;
      renderTable(els.input, COLS, input);
    }

    const P = phases();
    if (st.phase >= P.length) st.phase = P.length - 1;
    els.steps.innerHTML = "";
    P.forEach((p, i) => {
      const b = document.createElement("button");
      b.className = "step" + (i === st.phase ? " on" : i < st.phase ? " done" : "");
      b.textContent = p.title;
      b.addEventListener("click", () => { stopPlay(); st.phase = i; render(); });
      els.steps.appendChild(b);
    });
    const ph = P[st.phase];
    renderTable(els.target, COLS, ph.rows);
    els.narr.innerHTML = `<b>${esc(ph.title)}</b>: ${esc(ph.text)}`;

    const final = P[P.length - 1].rows;
    const issues = verdict(final);
    if (st.phase === P.length - 1) {
      els.verdict.className = "verdict " + (issues.length ? "bad" : "ok");
      els.verdict.innerHTML = issues.length
        ? `✗ Result differs from a full refresh (${final.length} rows vs ${SOURCE.length}):<ul>${issues.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`
        : `✓ Result equals a full refresh (${SOURCE.length} rows)`;
    } else { els.verdict.className = "verdict"; els.verdict.innerHTML = ""; }
    els.model.innerHTML = modelSql();
    els.sql.innerHTML = dmlSql();
  }

  function stopPlay() { if (st.timer) { clearInterval(st.timer); st.timer = null; els.play.textContent = "▶ Animate"; } }
  els.play.addEventListener("click", () => {
    if (st.timer) { stopPlay(); return; }
    const n = phases().length;
    st.phase = 0; render();
    els.play.textContent = "■ Stop";
    const timer = setInterval(() => {
      if (st.phase >= n - 1) { stopPlay(); return; }
      st.phase += 1; st.timer = null; render(); st.timer = timer; els.play.textContent = "■ Stop";
    }, 1500);
    st.timer = timer;
  });
  document.addEventListener("verchange", () => render());
  st.phase = 99;
  render();
})();
