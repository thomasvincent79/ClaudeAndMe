// =====================================================================
// Snapshot simulator: replays dbt's snapshot_staging_table logic
// (timestamp strategy) run by run, for each hard-delete mode.
// Rules mirrored from dbt-adapters macros/materializations/snapshots/helpers.sql:
//   * "current" rows = dbt_valid_to is null
//   * new key                -> insert, dbt_valid_from = updated_at
//   * updated_at > valid_from-> close current (valid_to = new updated_at) + insert
//   * key missing in source  -> invalidate/new_record: valid_to = run time
//   * new_record             -> also insert a marker row: valid_from = run time,
//                               dbt_is_deleted = 'True', valid_to null
//   * key returns (new_record) -> marker closed, new row with dbt_is_deleted='False'
// =====================================================================
(function () {
  const root = document.getElementById("snapsim");
  if (!root) return;

  const MODES = [
    { id: "v18_false", ver: "v18", hd: "ignore", label: "invalidate_hard_deletes=false", note: "default" },
    { id: "v18_true", ver: "v18", hd: "invalidate", label: "invalidate_hard_deletes=true" },
    { id: "v112_ignore", ver: "v112", hd: "ignore", label: "hard_deletes='ignore'", note: "default" },
    { id: "v112_invalidate", ver: "v112", hd: "invalidate", label: "hard_deletes='invalidate'" },
    { id: "v112_new_record", ver: "v112", hd: "new_record", label: "hard_deletes='new_record'" },
  ];

  const o = (id, status, updated_at) => ({ id, status, updated_at });
  function buildRuns(scenario) {
    const back = scenario === "changed" ? o(2, "cancelled", "2024-01-04") : o(2, "placed", "2024-01-01");
    return [
      { ts: "2024-01-01", title: "Run 1 · first load", source: [o(1, "placed", "2024-01-01"), o(2, "placed", "2024-01-01"), o(3, "placed", "2024-01-01")] },
      { ts: "2024-01-02", title: "Run 2 · order 1 shipped", source: [o(1, "shipped", "2024-01-02"), o(2, "placed", "2024-01-01"), o(3, "placed", "2024-01-01")] },
      { ts: "2024-01-03", title: "Run 3 · order 2 hard-deleted", source: [o(1, "shipped", "2024-01-02"), o(3, "placed", "2024-01-01")] },
      { ts: "2024-01-04", title: "Run 4 · order 2 comes back", source: [o(1, "shipped", "2024-01-02"), back, o(3, "placed", "2024-01-01")] },
      { ts: "2024-01-05", title: "Run 5 · order 3 hard-deleted", source: [o(1, "shipped", "2024-01-02"), { ...back }] },
    ];
  }

  function scdId(r) { // fake md5(id || valid_from || run) — just to look like dbt_scd_id
    let h = 2166136261; const s = `${r.id}|${r.dbt_valid_from}|${r.dbt_is_deleted || ""}`;
    for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).padStart(8, "0") + "…";
  }

  // Run the snapshot logic for one run. Returns {rows, events}
  function snapshotRun(prev, source, ts, hd) {
    const rows = prev.map(r => ({ ...r, _cls: "", _cellCls: {}, _flash: false }));
    const events = [];
    const current = new Map(rows.filter(r => r.dbt_valid_to === null).map(r => [r.id, r]));
    const inserts = [];
    for (const s of source) {
      const cur = current.get(s.id);
      const isMarker = hd === "new_record" && cur && cur.dbt_is_deleted === "True";
      if (!cur || cur.dbt_valid_from < s.updated_at || isMarker) {
        if (cur) {
          cur.dbt_valid_to = s.updated_at; cur._cellCls = { dbt_valid_to: "cell-upd" };
          events.push(isMarker
            ? `order ${s.id} is back: its deletion marker is closed (dbt_valid_to = ${s.updated_at}) and a new row with dbt_is_deleted='False' is inserted`
            : `order ${s.id} changed (${cur.status} → ${s.status}): old version closed with dbt_valid_to = updated_at = ${s.updated_at}`);
          if (cur.dbt_valid_from > s.updated_at) events.push(`⚠ order ${s.id}: the new row starts (${s.updated_at}) BEFORE the row it closes (${cur.dbt_valid_from}), so their validity windows overlap`);
        } else {
          const wasSeen = rows.some(r => r.id === s.id);
          events.push(wasSeen
            ? `order ${s.id} has no current row (it was invalidated), so it is inserted as if it were new, with dbt_valid_from = updated_at = ${s.updated_at}`
            : `order ${s.id} is new: inserted with dbt_valid_from = updated_at = ${s.updated_at}`);
          if (wasSeen) {
            const lastClose = rows.filter(r => r.id === s.id).map(r => r.dbt_valid_to).sort().pop();
            if (lastClose && s.updated_at < lastClose) events.push(`⚠ order ${s.id} came back with an old updated_at (${s.updated_at}): the new row overlaps the previous window that ended ${lastClose}`);
          }
        }
        const n = { ...s, dbt_updated_at: s.updated_at, dbt_valid_from: s.updated_at, dbt_valid_to: null, _cls: "new", _flash: true, _cellCls: {} };
        if (hd === "new_record") n.dbt_is_deleted = "False";
        inserts.push(n);
      } else if (cur && cur.dbt_valid_from >= s.updated_at && !isMarker) {
        // unchanged: nothing to do
      }
    }
    const inSource = new Set(source.map(s => s.id));
    for (const [id, cur] of current) {
      if (inSource.has(id)) continue;
      if (hd === "ignore") {
        if (!cur._ghostNoted) events.push(`order ${id} is gone from the source but nothing happens: its row stays "current" (dbt_valid_to is null) forever`);
        continue;
      }
      if (hd === "new_record" && cur.dbt_is_deleted === "True") { events.push(`order ${id} is still deleted: the marker row is already current, nothing to do`); continue; }
      cur.dbt_valid_to = ts; cur._cellCls = { dbt_valid_to: "cell-upd" };
      if (hd === "invalidate") {
        events.push(`order ${id} is gone from the source: its current row is closed with dbt_valid_to = snapshot time (${ts}). No row says "deleted"; the history just stops`);
      } else {
        events.push(`order ${id} is gone from the source: current row closed at ${ts} AND a marker row is inserted (dbt_is_deleted='True', dbt_valid_from = ${ts}, dbt_updated_at = ${ts})`);
        inserts.push({ id, status: cur.status, updated_at: cur.updated_at, dbt_updated_at: ts, dbt_valid_from: ts, dbt_valid_to: null,
          dbt_is_deleted: "True", _cls: "del", _flash: true, _cellCls: {} });
      }
    }
    inserts.forEach(r => { r.dbt_scd_id = scdId(r); });
    const all = rows.concat(inserts).sort((a, b) => a.id - b.id || (a.dbt_valid_from < b.dbt_valid_from ? -1 : a.dbt_valid_from > b.dbt_valid_from ? 1 : 0));
    if (!events.length) events.push("nothing changed in the source, so the snapshot is untouched");
    return { rows: all, events };
  }

  // ---------- state ----------
  const st = { mode: "v18_true", scenario: "changed", run: 0, asOf: null, timer: null };
  const els = {
    mode: $("#snap-mode", root), scenario: $("#snap-scenario", root), steps: $("#snap-steps", root),
    source: $("#snap-source", root), snap: $("#snap-table", root), narr: $("#snap-narr", root),
    tl: $("#snap-timeline", root), asof: $("#snap-asof", root), asofOut: $("#snap-asof-out", root),
    cfg: $("#snap-config", root), prev: $("#snap-prev", root), next: $("#snap-next", root), play: $("#snap-play", root),
  };

  function modesForVer() {
    const v = getVer();
    return MODES.filter(m => v === "both" || m.ver === v);
  }
  function mode() { return MODES.find(m => m.id === st.mode); }

  function computeAll() {
    const runs = buildRuns(st.scenario);
    const states = []; let rows = [];
    runs.forEach(r => { const res = snapshotRun(rows, r.source, r.ts, mode().hd); rows = res.rows; states.push(res); });
    return { runs, states };
  }

  function renderControls() {
    const opts = modesForVer();
    if (!opts.some(m => m.id === st.mode)) {
      // keep the same behaviour when switching version
      const hd = mode().hd; st.mode = (opts.find(m => m.hd === hd) || opts[0]).id;
    }
    segmented(els.mode, opts.map(m => ({ value: m.id, label: (getVer() === "both" ? (m.ver === "v18" ? "1.8 · " : "1.12 · ") : "") + m.label })), st.mode,
      v => { st.mode = v; render(); });
    segmented(els.scenario, [
      { value: "changed", label: "with a new updated_at" },
      { value: "same", label: "unchanged (old updated_at)" },
    ], st.scenario, v => { st.scenario = v; render(); });
  }

  function configSnippet() {
    const m = mode();
    if (m.ver === "v18") {
      return `<div class="file">snapshots/orders_snapshot.sql · dbt 1.8.6</div><pre class="code"><span class="k">{% snapshot</span> orders_snapshot <span class="k">%}</span>
{{ config(
    target_schema=<span class="s">'snapshots'</span>,
    unique_key=<span class="s">'id'</span>,
    strategy=<span class="s">'timestamp'</span>,
    updated_at=<span class="s">'updated_at'</span>,
    <span class="h">invalidate_hard_deletes=${m.hd === "invalidate" ? "True" : "False"}</span>
) }}
select id, status, updated_at from {{ source(<span class="s">'shop'</span>, <span class="s">'orders'</span>) }}
<span class="k">{% endsnapshot %}</span></pre>`;
    }
    return `<div class="file">snapshots/orders_snapshot.yml · dbt 1.12</div><pre class="code">snapshots:
  - name: orders_snapshot
    relation: source(<span class="s">'shop'</span>, <span class="s">'orders'</span>)
    config:
      schema: snapshots
      unique_key: id
      strategy: timestamp
      updated_at: updated_at
      <span class="h">hard_deletes: ${m.hd}</span></pre>`;
  }

  function cols() {
    const c = [
      { key: "id", label: "id" }, { key: "status", label: "status" }, { key: "updated_at", label: "updated_at" },
      { key: "dbt_scd_id", label: "dbt_scd_id", cls: "meta" }, { key: "dbt_updated_at", label: "dbt_updated_at", cls: "meta" },
      { key: "dbt_valid_from", label: "dbt_valid_from" }, { key: "dbt_valid_to", label: "dbt_valid_to" },
    ];
    if (mode().hd === "new_record") c.push({ key: "dbt_is_deleted", label: "dbt_is_deleted" });
    return c;
  }

  function render() {
    stop();
    renderControls();
    const { runs, states } = computeAll();
    if (st.run >= runs.length) st.run = runs.length - 1;
    els.cfg.innerHTML = configSnippet();

    els.steps.innerHTML = "";
    runs.forEach((r, i) => {
      const b = document.createElement("button");
      b.className = "step" + (i === st.run ? " on" : i < st.run ? " done" : "");
      b.textContent = r.title;
      b.addEventListener("click", () => { stop(); st.run = i; st.asOf = null; render(); });
      els.steps.appendChild(b);
    });
    els.prev.disabled = st.run === 0; els.next.disabled = st.run === runs.length - 1;

    // source table, diffed with the previous run
    const prevSrc = st.run > 0 ? runs[st.run - 1].source : [];
    const cur = runs[st.run].source;
    const srcRows = cur.map(s => {
      const p = prevSrc.find(x => x.id === s.id);
      const cls = st.run === 0 ? "" : !p ? "new" : (p.updated_at !== s.updated_at || p.status !== s.status) ? "upd" : "";
      return { ...s, _cls: cls };
    });
    prevSrc.filter(p => !cur.some(s => s.id === p.id)).forEach(p => srcRows.push({ ...p, _cls: "gone" }));
    srcRows.sort((a, b) => a.id - b.id);
    renderTable(els.source, [{ key: "id", label: "id" }, { key: "status", label: "status" }, { key: "updated_at", label: "updated_at" }], srcRows);

    const state = states[st.run];
    renderTable(els.snap, cols(), state.rows);
    els.narr.innerHTML = `<b>${esc(runs[st.run].title)}</b> (snapshot time = ${runs[st.run].ts})<ul style="margin:6px 0 0;padding-left:18px">` +
      state.events.map(e => `<li>${esc(e)}</li>`).join("") + "</ul>";

    drawTimeline(state.rows, runs[st.run].ts);
    renderAsOf(runs, states);
  }

  // ---------- timeline (one lane per validity window) ----------
  const COLORS = { placed: "#3a6fd0", shipped: "#1f9d6b", cancelled: "#d99a00", deleted: "#d0402d" };
  function drawTimeline(rows, nowTs) {
    const days = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06"];
    const W = 760, left = 70, right = 20, dayW = (W - left - right) / (days.length - 1);
    const x = d => left + days.indexOf(d) * dayW;
    const nowX = x(nowTs) + dayW * 0.6;
    const ids = [...new Set(rows.map(r => r.id))].sort();
    let y = 34; const parts = [];
    days.forEach(d => {
      parts.push(`<line x1="${x(d)}" x2="${x(d)}" y1="22" y2="1000" stroke="var(--line)" />`);
      parts.push(`<text x="${x(d)}" y="14" text-anchor="middle" font-size="11" fill="var(--muted)">${d.slice(5)}</text>`);
    });
    ids.forEach(id => {
      const mine = rows.filter(r => r.id === id);
      const lanes = [];
      mine.forEach(r => {
        const a = x(r.dbt_valid_from), b = r.dbt_valid_to ? x(r.dbt_valid_to) : nowX;
        let lane = lanes.findIndex(end => end <= a + 0.5);
        if (lane === -1) { lane = lanes.length; lanes.push(b); } else lanes[lane] = b;
        r._lane = lane; r._a = a; r._b = b;
      });
      const laneH = 22, h = Math.max(1, lanes.length) * laneH;
      parts.push(`<text x="8" y="${y + h / 2 + 4}" font-size="12" fill="var(--ink)">order ${id}</text>`);
      mine.forEach(r => {
        const del = r.dbt_is_deleted === "True";
        const col = del ? COLORS.deleted : COLORS[r.status];
        const yy = y + r._lane * laneH + 2, w = Math.max(3, r._b - r._a);
        parts.push(`<rect x="${r._a}" y="${yy}" width="${w}" height="${laneH - 6}" rx="4" fill="${col}" fill-opacity="${del ? .25 : .85}" stroke="${col}" ${del ? 'stroke-dasharray="4 3"' : ""}/>`);
        parts.push(`<text x="${r._a + 6}" y="${yy + 12}" font-size="10.5" fill="${del ? col : "#fff"}">${del ? "deleted" : r.status}${r.dbt_valid_to ? "" : " →"}</text>`);
      });
      if (!rows.some(r => r.id === id && r.dbt_valid_to === null)) {
        const end = Math.max(...mine.map(r => r._b));
        parts.push(`<text x="${end + 4}" y="${y + 13}" font-size="10" fill="var(--muted)">(no current row)</text>`);
      }
      y += h + 8;
    });
    parts.push(`<line x1="${nowX}" x2="${nowX}" y1="22" y2="${y}" stroke="var(--accent)" stroke-dasharray="3 3"/><text x="${nowX + 3}" y="${y - 2}" font-size="10" fill="var(--accent)">now</text>`);
    els.tl.innerHTML = `<svg class="timeline-svg" viewBox="0 0 ${W} ${y + 6}">${parts.join("")}</svg>`;
  }

  // ---------- point-in-time query ----------
  function renderAsOf(runs, states) {
    const available = runs.slice(0, st.run + 1).map(r => r.ts);
    if (!st.asOf || !available.includes(st.asOf)) st.asOf = available[available.length - 1];
    segmented(els.asof, available.map(d => ({ value: d, label: d.slice(5) })), st.asOf, v => { st.asOf = v; renderAsOf(runs, states); });
    const rows = states[st.run].rows;
    const nr = mode().hd === "new_record";
    const hit = rows.filter(r => r.dbt_valid_from <= st.asOf && (r.dbt_valid_to === null || st.asOf < r.dbt_valid_to) && (!nr || r.dbt_is_deleted === "False"));
    const truth = runs.find(r => r.ts === st.asOf).source;
    const problems = [];
    truth.forEach(t => {
      const h = hit.filter(r => r.id === t.id);
      if (!h.length) problems.push(`order ${t.id} existed (${t.status}) but is missing`);
      else if (h.length > 1) problems.push(`order ${t.id} comes back ${h.length} times (overlapping windows)`);
      else if (h[0].status !== t.status) problems.push(`order ${t.id} shows '${h[0].status}' but was '${t.status}'`);
    });
    hit.filter(r => !truth.some(t => t.id === r.id)).forEach(r => problems.push(`order ${r.id} is returned but was deleted at that date`));
    const sql = `select id, status from orders_snapshot
where dbt_valid_from &lt;= '${st.asOf}'
  and (dbt_valid_to &gt; '${st.asOf}' or dbt_valid_to is null)${nr ? `\n  <span class="h">and dbt_is_deleted = 'False'</span>` : ""}`;
    els.asofOut.innerHTML = `<pre class="code">${sql}</pre>
      <div>Result: ${hit.length ? [...new Set(hit.map(r => r.id))].map(id => hit.filter(r => r.id === id).map(r => `order ${r.id} (${r.status})`).join(" + ")).join(", ") : "no rows"}</div>
      <div class="verdict ${problems.length ? "bad" : "ok"}">${problems.length ? "✗ Doesn't match what the source looked like on " + st.asOf + ":<ul>" + problems.map(p => `<li>${esc(p)}</li>`).join("") + "</ul>" : "✓ Matches what the source looked like on " + st.asOf}</div>`;
  }

  function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; els.play.textContent = "▶ Play"; } }
  els.prev.addEventListener("click", () => { st.run = Math.max(0, st.run - 1); st.asOf = null; render(); });
  els.next.addEventListener("click", () => { st.run += 1; st.asOf = null; render(); });
  $("#snap-reset", root).addEventListener("click", () => { st.run = 0; st.asOf = null; render(); });
  els.play.addEventListener("click", () => {
    if (st.timer) { stop(); return; }
    st.run = 0; st.asOf = null; render();
    els.play.textContent = "■ Stop";
    st.timer = setInterval(() => {
      if (st.run >= 4) { stop(); return; }
      st.run += 1; st.asOf = null;
      const t = st.timer; st.timer = null; render(); st.timer = t; els.play.textContent = "■ Stop";
    }, 2200);
  });
  document.addEventListener("verchange", () => render());
  render();
})();
