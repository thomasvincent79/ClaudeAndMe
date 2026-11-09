// =====================================================================
// Macros page: (1) parse vs execute phases (the `execute` flag)
// (2) generate_schema_name: default vs env-aware override
// (3) adapter.dispatch resolution
// =====================================================================
(function () {
  // ------------------------------------------------ 1 · parse vs execute
  const pe = document.getElementById("macsim");
  if (pe) {
    const $$ = s => pe.querySelector(s);
    const st = { guard: true, phase: 0, timer: null };
    const SRC = g => `{% macro get_payment_methods() %}
  {% set q %}select distinct payment_method from {{ ref('stg_payments') }}{% endset %}
  {% set res = run_query(q) %}
  ${g ? `{% if execute %}
    {% set methods = res.columns[0].values() %}
  {% else %}
    {% set methods = [] %}
  {% endif %}` : `{% set methods = res.columns[0].values() %}   {# ✗ no guard #}`}
  {{ return(methods) }}
{% endmacro %}`;
    const MODEL = `select order_id,
{% for m in get_payment_methods() %}
  sum(case when payment_method = '{{ m }}' then amount end) as {{ m }}_amount,
{% endfor %}
  sum(amount) as total_amount
from {{ ref('stg_payments') }}
group by 1`;
    const PHASES = [
      { t: "1 · Parse", x: "<code>execute = False</code>", d: "dbt reads every file to build the DAG. Jinja is rendered to find <code>ref()</code>, <code>source()</code> and <code>config()</code>, but <b>no query runs</b>: <code>run_query()</code> returns <code>None</code>." },
      { t: "2 · Compile / run", x: "<code>execute = True</code>", d: "Now dbt renders each selected node for real: <code>run_query()</code> hits the warehouse and returns an agate table." },
      { t: "3 · Rendered SQL", x: "target/compiled/…", d: "The loop has been unrolled into plain SQL, which is what runs in the warehouse." },
    ];
    function render() {
      const g = st.guard, k = st.phase;
      $$("#mac-src").innerHTML = `<div class="file">macros/get_payment_methods.sql</div><pre class="code">${esc(SRC(g)).replace(/\{% if execute %\}|\{% else %\}|\{% endif %\}/g, m => `<span class="h">${m}</span>`)}</pre>
        <div class="file">models/fct_payments_pivot.sql</div><pre class="code">${esc(MODEL)}</pre>`;
      $$("#mac-steps").innerHTML = PHASES.map((p, i) => `<button class="step ${i === k ? "on" : i < k ? "done" : ""}" data-i="${i}">${p.t}</button>`).join("");
      $$("#mac-steps").querySelectorAll(".step").forEach(b => b.addEventListener("click", () => { st.phase = +b.dataset.i; render(); }));
      let out;
      if (k === 0) out = g
        ? `<div class="verdict ok">✓ <code>res</code> is <code>None</code>, but the guard sets <code>methods = []</code>: the loop renders nothing, the parse succeeds, and dbt records <code>ref('stg_payments')</code> as a dependency.</div>`
        : `<div class="verdict bad">✗ Compilation Error in macro get_payment_methods<br>'None' has no attribute 'columns'. During parse <code>run_query</code> returns <code>None</code>. Wrap it in <code>{% if execute %}</code>.</div>`;
      else if (k === 1) out = g ? `<div class="verdict ok">✓ <code>run_query</code> returns 3 rows: <code>card</code>, <code>paypal</code>, <code>voucher</code>.</div>` : `<div class="verdict bad">Never reached: the parse already failed.</div>`;
      else out = g ? `<div class="file">target/compiled/…/fct_payments_pivot.sql</div><pre class="code">select order_id,
  sum(case when payment_method = 'card' then amount end) as card_amount,
  sum(case when payment_method = 'paypal' then amount end) as paypal_amount,
  sum(case when payment_method = 'voucher' then amount end) as voucher_amount,
  sum(amount) as total_amount
from analytics.dbt_alice.stg_payments
group by 1</pre>` : `<div class="verdict bad">Nothing compiled.</div>`;
      $$("#mac-out").innerHTML = `<div class="narration" style="margin-top:0"><b>${PHASES[k].t}</b> · ${PHASES[k].x}: ${PHASES[k].d}</div>${out}`;
    }
    segmented($$("#mac-guard"), [{ value: true, label: "with {% if execute %}" }, { value: false, label: "without the guard" }], st.guard, v => { st.guard = v; st.phase = 0; render(); });
    $$("#mac-play").addEventListener("click", () => {
      clearInterval(st.timer); st.phase = 0; render();
      st.timer = setInterval(() => { if (st.phase >= 2 || !st.guard) { clearInterval(st.timer); return; } st.phase++; render(); }, 1800);
    });
    render();
  }

  // ------------------------------------------------ 2 · schema naming
  const sn = document.getElementById("schemasim");
  if (sn) {
    const $$ = s => sn.querySelector(s);
    const st = { target: "dev", custom: "marts", macro: "default" };
    const TARGETS = { dev: "dbt_alice", ci: "dbt_cloud_pr_123_456", prod: "analytics" };
    function compute() {
      const base = TARGETS[st.target], c = st.custom === "none" ? null : st.custom;
      if (st.macro === "default") return c ? `${base}_${c}` : base;
      if (st.target === "prod") return c || base;           // override: custom schema only in prod
      return base;
    }
    function render() {
      const res = compute();
      const code = st.macro === "default"
        ? `<span class="c">{# built-in default: no file needed #}</span>
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- set default_schema = target.schema -%}
    {%- if custom_schema_name is none -%}
        {{ default_schema }}
    {%- else -%}
        <span class="h">{{ default_schema }}_{{ custom_schema_name | trim }}</span>
    {%- endif -%}
{%- endmacro %}`
        : `<span class="c">{# macros/generate_schema_name.sql: overrides the built-in #}</span>
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if target.name == 'prod' and custom_schema_name is not none -%}
        <span class="h">{{ custom_schema_name | trim }}</span>
    {%- else -%}
        {{ target.schema }}
    {%- endif -%}
{%- endmacro %}
<span class="c">{# same logic as the built-in helper generate_schema_name_for_env #}</span>`;
      $$("#sn-code").innerHTML = `<pre class="code">${code}</pre>`;
      $$("#sn-out").innerHTML = `<div class="sn-flow">
        <div><span class="muted">target.schema</span><b>${TARGETS[st.target]}</b></div><div class="gop">+</div>
        <div><span class="muted">+schema config</span><b>${st.custom === "none" ? "—" : st.custom}</b></div><div class="gop">⇒</div>
        <div class="sn-res"><span class="muted">model lands in</span><b>${res}.fct_orders</b></div></div>
        <div class="muted" style="font-size:.88rem;margin-top:6px">${st.macro === "default" && st.target === "prod" && st.custom !== "none"
          ? "⚠ With the default macro, prod gets <code>analytics_marts</code>, not <code>marts</code>. That's why most projects override it."
          : st.macro === "override" && st.target !== "prod" ? "Dev and CI collapse everything into the personal or PR schema: no collisions between developers." : ""}</div>`;
      $$("#sn-cfg").innerHTML = `<pre class="code"><span class="c"># dbt_project.yml</span>
models:
  my_project:
    marts:
      ${st.custom === "none" ? "<span class=\"c\"># no +schema</span>" : `+schema: ${st.custom}`}</pre>`;
    }
    segmented($$("#sn-target"), Object.keys(TARGETS).map(t => ({ value: t, label: `target: ${t}` })), st.target, v => { st.target = v; render(); });
    segmented($$("#sn-custom"), [{ value: "marts", label: "+schema: marts" }, { value: "none", label: "no +schema" }], st.custom, v => { st.custom = v; render(); });
    segmented($$("#sn-macro"), [{ value: "default", label: "built-in macro" }, { value: "override", label: "env-aware override" }], st.macro, v => { st.macro = v; render(); });
    render();
  }

  // ------------------------------------------------ 3 · dispatch
  const dp = document.getElementById("dispsim");
  if (dp) {
    const $$ = s => dp.querySelector(s);
    const st = { adapter: "snowflake", override: false };
    const IMPL = { snowflake: true, bigquery: true, postgres: true, redshift: false, databricks: false };
    const PARENT = { redshift: "postgres" };
    function chain() {
      const a = st.adapter, list = [];
      const ns = st.override ? ["my_project", "acme_utils"] : ["acme_utils"];
      ns.forEach(n => {
        const owned = n === "my_project" ? { snowflake: true } : IMPL;
        [a, PARENT[a]].filter(Boolean).forEach(ad => list.push({ name: `${n}.${ad}__safe_cast`, found: !!owned[ad] }));
        if (n === "acme_utils") list.push({ name: `${n}.default__safe_cast`, found: true });
      });
      const hit = list.findIndex(x => x.found);
      return { list, hit };
    }
    function render() {
      const { list, hit } = chain();
      $$("#dp-chain").innerHTML = list.map((x, i) => `<div class="dp-row ${i === hit ? "hit" : i < hit ? "miss" : "skip"}" style="animation-delay:${i * .12}s">
        <span>${i < hit ? "✗" : i === hit ? "✓" : "·"}</span><code>${x.name}</code><span class="muted">${i < hit ? "not defined" : i === hit ? "← used" : "not checked"}</span></div>`).join("");
      $$("#dp-cfg").innerHTML = st.override ? `<pre class="code"><span class="c"># dbt_project.yml: look in MY project first for acme_utils macros</span>
dispatch:
  - macro_namespace: acme_utils
    search_order: ['my_project', 'acme_utils']</pre>
<pre class="code"><span class="c">-- macros/snowflake__safe_cast.sql (my own implementation)</span>
{% macro snowflake__safe_cast(value, type) %}
  try_cast({{ value }} as {{ type }})
{% endmacro %}</pre>` : `<pre class="code"><span class="c">-- inside a package "acme_utils" (illustrative)</span>
{% macro safe_cast(value, type) %}
  {{ return(adapter.dispatch('safe_cast', 'acme_utils')(value, type)) }}
{% endmacro %}</pre>`;
    }
    segmented($$("#dp-adapter"), Object.keys(IMPL).map(a => ({ value: a, label: a })), st.adapter, v => { st.adapter = v; render(); });
    segmented($$("#dp-ov"), [{ value: false, label: "package only" }, { value: true, label: "+ my override (search_order)" }], st.override, v => { st.override = v; render(); });
    render();
  }
})();
