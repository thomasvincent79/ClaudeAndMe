// =====================================================================
// Python models page: (1) where the code runs, per platform (animated)
// (2) lazy DataFrame vs to_pandas(): how much data lands in Python memory
// =====================================================================
(function () {
  // ------------------------------------------------ 1 · execution path
  const ex = document.getElementById("pyexec");
  if (ex) {
    const $$ = s => ex.querySelector(s);
    const PLAT = {
      snowflake: {
        label: "Snowflake (Snowpark)", runner: "stored procedure", compute: "your warehouse", write: "df.write.save_as_table()",
        wrap: `<span class="c"># ---- your code (unchanged) ----</span>
def model(dbt, session): ...

<span class="c"># ---- appended by dbt (simplified) ----</span>
def ref(*args): return session.table(<span class="s">"ANALYTICS.DBT_ALICE.STG_TICKETS"</span>)
class dbtObj:  ref = ref; this = <span class="s">"ANALYTICS.DBT_ALICE.TICKET_SCORES"</span>; is_incremental = False
def main(session):
    df = model(dbtObj(), session)
    df.write.mode(<span class="s">"overwrite"</span>).save_as_table(<span class="s">"ANALYTICS.DBT_ALICE.TICKET_SCORES"</span>)
<span class="c"># → run as an anonymous stored procedure (packages from the Snowflake Anaconda channel)</span>`,
        cfg: `python_version: "3.11"
packages: ["scikit-learn==1.5.*"]
use_anonymous_sproc: true          <span class="c"># default</span>
imports: ["@my_stage/helpers.py"]   <span class="c"># optional files from a stage</span>
external_access_integrations: [...] <span class="c"># to call external APIs</span>`,
      },
      databricks: {
        label: "Databricks (PySpark)", runner: "notebook job", compute: "cluster / serverless", write: "df.write.saveAsTable()",
        wrap: `<span class="c"># ---- your code (unchanged) ----</span>
def model(dbt, session): ...

<span class="c"># ---- appended by dbt (simplified) ----</span>
def ref(*args): return spark.table(<span class="s">"main.dbt_alice.stg_tickets"</span>)
df = model(dbtObj(spark.table), spark)
df.write.mode(<span class="s">"overwrite"</span>).format(<span class="s">"delta"</span>).saveAsTable(<span class="s">"main.dbt_alice.ticket_scores"</span>)
<span class="c"># → uploaded as a notebook and run via the chosen submission_method</span>`,
        cfg: `submission_method: all_purpose_cluster  <span class="c"># or job_cluster, serverless_cluster,</span>
cluster_id: "0123-456789-abcde"      <span class="c">#    workflow_job (adapter dependent)</span>
packages: ["rapidfuzz"]
create_notebook: false`,
      },
      bigquery: {
        label: "BigQuery", runner: "BigFrames / Dataproc", compute: "slots or Dataproc", write: "df.to_gbq()",
        wrap: `<span class="c"># ---- your code (unchanged) ----</span>
def model(dbt, session): ...

<span class="c"># ---- appended by dbt (simplified, bigframes) ----</span>
import bigframes.pandas as bpd
def ref(*args): return bpd.read_gbq(<span class="s">"proj.dbt_alice.stg_tickets"</span>)
df = model(dbtObj(), session)
df.to_gbq(<span class="s">"proj.dbt_alice.ticket_scores"</span>, if_exists=<span class="s">"replace"</span>)`,
        cfg: `submission_method: bigframes   <span class="c"># or serverless / cluster (Dataproc)</span>
<span class="c"># Dataproc: gcs_bucket, dataproc_region, (dataproc_cluster_name)</span>
packages: ["holidays"]`,
      },
    };
    const STEPS = [
      { t: "Parse", d: "dbt reads <code>ticket_scores.py</code> with Python's AST (it doesn't run it). The <code>dbt.ref()</code> / <code>dbt.source()</code> calls with <b>literal strings</b> give the DAG edges, and <code>dbt.config()</code> literals give the config." },
      { t: "Compile", d: "dbt appends a small wrapper: <code>ref()</code> resolves to real table names, plus <code>this</code>, <code>is_incremental</code>, the config values, and the write step." },
      { t: "Submit", d: "dbt sends the code to the platform. Nothing runs on your laptop or orchestrator." },
      { t: "Execute", d: "The platform runs <code>model(dbt, session)</code>. DataFrame operations are pushed down to the engine until you convert to pandas." },
      { t: "Materialize", d: "The returned DataFrame is written as a table (or merged, for incremental)." },
      { t: "Downstream", d: "SQL models use it like any other: <code>{{ ref('ticket_scores') }}</code>. Data tests run on it normally." },
    ];
    const st = { plat: "snowflake", step: 0, timer: null };
    function draw() {
      const p = PLAT[st.plat], k = st.step;
      const box = (x, y, w, h, title, sub, on) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${on ? "color-mix(in srgb, var(--accent) 14%, var(--card))" : "var(--soft)"}" stroke="${on ? "var(--accent)" : "var(--line)"}" stroke-width="${on ? 2 : 1}"/>
        <text x="${x + w / 2}" y="${y + 24}" text-anchor="middle" class="d-txt" font-weight="700">${title}</text>
        <text x="${x + w / 2}" y="${y + 42}" text-anchor="middle" class="d-mut">${sub}</text>`;
      const parts = [
        `<rect x="6" y="6" width="300" height="208" rx="16" fill="none" stroke="var(--muted)" stroke-dasharray="5 4" opacity=".5"/>
         <text x="18" y="26" class="d-mut" font-weight="700">WHERE dbt RUNS (laptop / CI / orchestrator)</text>
         <rect x="340" y="6" width="554" height="208" rx="16" fill="none" stroke="var(--accent)" stroke-dasharray="5 4" opacity=".55"/>
         <text x="352" y="26" class="d-mut" font-weight="700" style="fill:var(--accent)">${p.label.toUpperCase()}</text>`,
        box(20, 44, 130, 58, "1 Parse", "AST → DAG", k === 0),
        box(166, 44, 130, 58, "2 Compile", "+ wrapper", k === 1),
        box(20, 130, 276, 58, "dbt build -s ticket_scores", "the only thing dbt does locally: orchestrate", false),
        box(360, 44, 160, 58, "3 Submit", p.runner, k === 2),
        box(540, 44, 160, 58, "4 Execute", p.compute, k === 3),
        box(720, 44, 160, 58, "5 Materialize", p.write, k === 4),
        box(540, 130, 340, 58, "6 Downstream SQL + tests", "{{ ref('ticket_scores') }}", k === 5),
        `<path id="pe" d="M85 102 L85 116 L231 116 L231 102 M296 73 L360 73 L520 73 L540 73 L700 73 L720 73 M800 102 L800 130" fill="none"/>`,
        `<path class="d-line" d="M150 73 L166 73"/><path class="d-line" d="M296 73 L360 73"/><path class="d-line" d="M520 73 L540 73"/><path class="d-line" d="M700 73 L720 73"/><path class="d-line" d="M800 102 L800 130"/>`,
      ];
      const pos = [[85, 73], [231, 73], [440, 73], [620, 73], [800, 73], [710, 159]][k];
      parts.push(`<circle cx="${pos[0]}" cy="${pos[1] - 36}" r="7" class="flow-dot"><animate attributeName="r" values="5;9;5" dur="1s" repeatCount="indefinite"/></circle>`);
      $$("#pe-svg").innerHTML = `<svg viewBox="0 0 900 220" style="min-width:720px">${parts.join("")}</svg>`;
      $$("#pe-steps").innerHTML = STEPS.map((s, i) => `<button class="step ${i === k ? "on" : i < k ? "done" : ""}" data-i="${i}">${i + 1}. ${s.t}</button>`).join("");
      $$("#pe-steps").querySelectorAll(".step").forEach(b => b.addEventListener("click", () => { stop(); st.step = +b.dataset.i; draw(); }));
      $$("#pe-narr").innerHTML = `<b>${STEPS[k].t}</b>: ${STEPS[k].d}`;
      $$("#pe-code").innerHTML = `<div class="file">target/run/…/ticket_scores.py (what the platform receives)</div><pre class="code">${p.wrap}</pre>`;
      $$("#pe-cfg").innerHTML = `<div class="file">platform-specific config (YAML or dbt.config)</div><pre class="code">${p.cfg}</pre>`;
    }
    function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; $$("#pe-play").textContent = "▶ Run it"; } }
    $$("#pe-play").addEventListener("click", () => {
      if (st.timer) { stop(); return; }
      st.step = 0; draw(); $$("#pe-play").textContent = "■ Stop";
      st.timer = setInterval(() => { if (st.step >= STEPS.length - 1) { stop(); return; } st.step++; draw(); }, 1600);
    });
    segmented($$("#pe-plat"), Object.entries(PLAT).map(([k, v]) => ({ value: k, label: v.label })), st.plat, v => { st.plat = v; draw(); });
    draw();
  }

  // ------------------------------------------------ 2 · lazy vs pandas
  const lz = document.getElementById("pylazy");
  if (lz) {
    const $$ = s => lz.querySelector(s);
    const TOTAL = 10_000_000, RECENT = 600_000, OUT_ROWS = 31 * 12; // 31 days × 12 categories
    const BYTES = 400, PANDAS_X = 4; // per ticket row (text column); pandas object overhead
    const MEM = 16e9; // memory available to the Python process
    const st = { when: "end" };
    const OPTS = {
      start: { label: "to_pandas() first", code: `df = dbt.ref(<span class="s">"stg_tickets"</span>).<span class="h">to_pandas()</span>          <span class="c"># ✗ 10M rows pulled</span>
df = df[df.CREATED_AT &gt;= cutoff]
df[<span class="s">"SCORE"</span>] = clf.predict_proba(df.BODY)[:, 1]
out = df.groupby([<span class="s">"DAY"</span>, <span class="s">"CATEGORY"</span>]).SCORE.mean().reset_index()
return out`, moved: TOTAL },
      filter: { label: "filter, then to_pandas()", code: `df = dbt.ref(<span class="s">"stg_tickets"</span>)
df = df.filter(F.col(<span class="s">"CREATED_AT"</span>) &gt;= cutoff)        <span class="c"># pushed down as SQL</span>
pdf = df.select(<span class="s">"ID"</span>, <span class="s">"DAY"</span>, <span class="s">"CATEGORY"</span>, <span class="s">"BODY"</span>).<span class="h">to_pandas()</span>   <span class="c"># 600k rows</span>
pdf[<span class="s">"SCORE"</span>] = clf.predict_proba(pdf.BODY)[:, 1]
return pdf.groupby([<span class="s">"DAY"</span>, <span class="s">"CATEGORY"</span>]).SCORE.mean().reset_index()`, moved: RECENT },
      end: { label: "stay lazy (vectorized UDF)", code: `score = F.pandas_udf(lambda s: pd.Series(clf.predict_proba(s)[:, 1]),
                     return_type=FloatType(), input_types=[StringType()])
df = dbt.ref(<span class="s">"stg_tickets"</span>).filter(F.col(<span class="s">"CREATED_AT"</span>) &gt;= cutoff)
df = df.with_column(<span class="s">"SCORE"</span>, score(F.col(<span class="s">"BODY"</span>)))   <span class="c"># runs in batches, in parallel</span>
return df.group_by(<span class="s">"DAY"</span>, <span class="s">"CATEGORY"</span>).agg(F.avg(<span class="s">"SCORE"</span>).alias(<span class="s">"SCORE"</span>))
<span class="c"># nothing materialized in the procedure's memory: the engine streams batches</span>`, moved: 0 },
    };
    function render() {
      const o = OPTS[st.when];
      const bytes = o.moved * BYTES * PANDAS_X, pct = Math.min(100, bytes / MEM * 100);
      const stages = [
        { n: "stg_tickets", rows: TOTAL, where: "engine" },
        { n: "filter last 30 days", rows: RECENT, where: st.when === "start" ? "python" : "engine" },
        { n: "score (ML model)", rows: RECENT, where: st.when === "end" ? "engine (UDF batches)" : "python" },
        { n: "group by day, category", rows: OUT_ROWS, where: st.when === "end" ? "engine" : "python" },
      ];
      const W = 880, parts = [];
      stages.forEach((s, i) => {
        const x = 10 + i * 220, py = s.where.startsWith("python");
        const h = 14 + Math.log10(s.rows) * 9;
        parts.push(`<rect x="${x}" y="${20}" width="200" height="74" rx="12" fill="${py ? "color-mix(in srgb, #e0a800 18%, var(--card))" : "color-mix(in srgb, #3a6fd0 12%, var(--card))"}" stroke="${py ? "#e0a800" : "#3a6fd0"}"/>
          <text x="${x + 100}" y="42" text-anchor="middle" class="d-txt" font-weight="700">${s.n}</text>
          <text x="${x + 100}" y="60" text-anchor="middle" class="d-mut">${s.rows.toLocaleString("en-US")} rows</text>
          <text x="${x + 100}" y="80" text-anchor="middle" font-size="10" font-weight="700" fill="${py ? "#b07d00" : "#3a6fd0"}">${py ? "🐍 in Python memory" : "⚙ " + s.where}</text>
          <rect x="${x + 100 - h * 2}" y="104" width="${h * 4}" height="10" rx="5" fill="${py ? "#e0a800" : "#3a6fd0"}" opacity=".7"><animate attributeName="opacity" values=".4;.9;.4" dur="${1 + i * .3}s" repeatCount="indefinite"/></rect>`);
        if (i < stages.length - 1) parts.push(`<path d="M${x + 200} 57 L${x + 220} 57" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar)"/>`);
      });
      $$("#lz-svg").innerHTML = `<svg viewBox="0 0 ${W} 124" style="min-width:720px"><defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="var(--muted)"/></marker></defs>${parts.join("")}</svg>`;
      $$("#lz-code").innerHTML = `<div class="file">models/ml/ticket_scores.py</div><pre class="code">${o.code}</pre>`;
      const gb = (bytes / 1e9).toFixed(2);
      $$("#lz-out").innerHTML = `<div class="meter"><div class="meter-bar" style="width:${pct}%;${pct > 80 ? "background:#e0442f" : ""}"></div></div>
        Rows moved into Python memory: <b>${o.moved.toLocaleString("en-US")}</b> ≈ <b>${gb} GB</b> in pandas (≈400 B/row × 4 for pandas string objects) of ${MEM / 1e9} GB available.
        <div class="verdict ${pct > 80 ? "bad" : "ok"}" style="margin-top:8px">${pct > 80
          ? "✗ Likely out of memory (or very slow): pandas holds everything in one process. The engine's parallelism is wasted."
          : o.moved ? "✓ Works: filter in the engine first, then use pandas for the part that needs a library." : "✓ Best: the engine scales the UDF across its workers, and memory stays flat whatever the volume."}</div>`;
    }
    segmented($$("#lz-when"), Object.entries(OPTS).map(([k, v]) => ({ value: k, label: v.label })), st.when, v => { st.when = v; render(); });
    render();
  }
})();
