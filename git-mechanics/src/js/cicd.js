// =====================================================================
// CI/CD page: clickable YAML annotations + a pipeline simulator.
// Each trigger event evaluates per-job rules (which jobs exist), then a
// tick loop runs them in stage order, or as a DAG when "needs" is on.
// =====================================================================
(function () {
  const ANN = {
    workflow: ["workflow:rules", "Decides whether a pipeline is created <em>at all</em>. This classic pattern runs MR pipelines for MRs, and branch pipelines only when the branch has no open MR, so you never get two duplicate pipelines for one push."],
    stages: ["stages", "Ordered list of stages. Jobs of a stage start only when all jobs of the previous stage succeeded (unless <code>needs</code> says otherwise). Default stages: .pre, build, test, deploy, .post."],
    default: ["default", "Settings inherited by every job unless the job overrides them: <code>image</code>, <code>before_script</code>, <code>cache</code>, <code>retry</code>, <code>tags</code>, <code>interruptible</code>…"],
    image: ["image", "The Docker image the job's script runs in (docker / kubernetes executors). Pin a tag: <code>python:3.12-slim</code>, not <code>latest</code>."],
    interruptible: ["interruptible", "If a newer pipeline starts on the same branch, this one can be auto-canceled (with the project setting \"Auto-cancel redundant pipelines\"). Saves runner minutes. Don't set it on deploy jobs."],
    variables: ["variables", "Environment variables for all jobs (here) or one job. Non-secret only: secrets go in <em>Settings → CI/CD → Variables</em>, masked and protected."],
    job: ["a job", "Any top-level key that isn't a keyword is a job. The name is free (<code>test:unit</code>, <code>deploy-prod</code>…). The only required key is <code>script</code>: shell commands, run in order; the first non-zero exit code fails the job."],
    allow_failure: ["allow_failure", "A failure shows as an orange warning but doesn't fail the pipeline or block later stages. Good for informative checks (linting) you aren't ready to enforce. Can also be <code>exit_codes: [42]</code>."],
    needs: ["needs", "Turns the pipeline into a DAG: this job starts as soon as <code>build:image</code> succeeds, without waiting for the whole previous stage. Also downloads only those jobs' artifacts. <code>needs: []</code> = start immediately."],
    cache: ["cache", "Files kept <em>between pipelines</em> to save time (pip, npm, dbt_packages). The key changes when <code>requirements.txt</code> changes. Best effort: the job must still work with an empty cache."],
    artifacts: ["artifacts", "Files saved <em>by this job</em> and passed to later jobs, downloadable in the UI. <code>reports: junit</code> makes GitLab show failed tests directly in the MR. <code>when: always</code> keeps them even if the job fails."],
    environment: ["environment", "Records a deployment: GitLab tracks which commit is live in <code>production</code>, shows the URL in the MR, and offers rollback. Review apps use dynamic names like <code>review/$CI_COMMIT_REF_SLUG</code>."],
    rules: ["rules", "Evaluated when the pipeline is created, first match wins. Here the job exists only in tag pipelines. No match = job absent from the pipeline. Conditions: <code>if</code>, <code>changes</code>, <code>exists</code>."],
    manual: ["when: manual", "The job is created but waits for someone to press ▶ (with permission to deploy). In <code>rules</code>, manual jobs default to <code>allow_failure: false</code>, so the pipeline shows as <em>blocked</em> until it's played."],
    resource_group: ["resource_group", "Only one job of this group runs at a time across all pipelines: two production deploys can't overlap."],
    tags: ["tags", "Select a runner: only runners having all these tags pick the job up. Typically a runner inside your network for deploys or warehouse access."],
  };
  const yaml = document.getElementById("yaml"), box = document.getElementById("ann-box");
  if (yaml) yaml.addEventListener("click", e => {
    const a = e.target.closest(".ann"); if (!a) return;
    yaml.querySelectorAll(".ann").forEach(x => x.classList.toggle("on", x === a));
    const [t, d] = ANN[a.dataset.a];
    box.innerHTML = `<h4>${t}</h4><p>${d}</p>`;
    box.animate?.([{ opacity: .4, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 250 });
  });
})();

(function () {
  const root = document.getElementById("cisim");
  if (!root) return;
  const $$ = s => root.querySelector(s);
  const STAGES = ["lint", "build", "test", "deploy"];
  const Y = (why, when = "on_success") => ({ when, why });
  const N = why => ({ when: "never", why });
  const JOBS = [
    { id: "lint:sql", stage: "lint", dur: 3, allow: true, needs: [],
      rules: { branch: Y("push"), mr: Y("MR event"), main: Y("push"), tag: N("rules: not on tags"), schedule: N("not scheduled") } },
    { id: "build:image", stage: "build", dur: 4, needs: [],
      rules: { branch: Y("always"), mr: Y("always"), main: Y("always"), tag: Y("always"), schedule: N("not scheduled") } },
    { id: "build:docs", stage: "build", dur: 11, needs: [],
      rules: { branch: Y("always"), mr: Y("always"), main: Y("always"), tag: Y("always"), schedule: N("not scheduled") } },
    { id: "test:unit", stage: "test", dur: 5, needs: ["build:image"],
      rules: { branch: Y("always"), mr: Y("always"), main: Y("always"), tag: Y("always"), schedule: N("not scheduled") } },
    { id: "test:dbt", stage: "test", dur: 7, needs: ["build:image"],
      rules: { branch: N("MR / main only"), mr: Y("changes: models/**"), main: Y("default branch"), tag: N("MR / main only"), schedule: N("not scheduled") } },
    { id: "sast", stage: "test", dur: 4, needs: [],
      rules: { branch: Y("always"), mr: Y("always"), main: Y("always"), tag: N("rules: not on tags"), schedule: N("not scheduled") } },
    { id: "deploy:review", stage: "deploy", dur: 3, needs: ["test:unit", "test:dbt"], env: "review/42-discount",
      rules: { branch: N("MR only"), mr: Y("MR event"), main: N("MR only"), tag: N("MR only"), schedule: N("MR only") } },
    { id: "deploy:staging", stage: "deploy", dur: 3, needs: ["test:unit", "test:dbt", "build:docs"], env: "staging",
      rules: { branch: N("main only"), mr: N("main only"), main: Y("default branch"), tag: N("main only"), schedule: N("main only") } },
    { id: "deploy:prod", stage: "deploy", dur: 4, needs: ["test:unit"], env: "production",
      rules: { branch: N("tags only"), mr: N("tags only"), main: N("tags only"), tag: Y("$CI_COMMIT_TAG", "manual"), schedule: N("tags only") } },
    { id: "dbt:full-refresh", stage: "deploy", dur: 9, needs: [],
      rules: { branch: N("schedule only"), mr: N("schedule only"), main: N("schedule only"), tag: N("schedule only"), schedule: Y("schedule") } },
  ];
  const EVENTS = {
    branch: { label: "Branch push (no MR)", title: "Branch pipeline · 42-discount-rules", narr: "A branch without an open MR gets a <b>branch pipeline</b> (<code>$CI_COMMIT_BRANCH</code> set, no <code>$CI_OPEN_MERGE_REQUESTS</code>). MR-only jobs are absent." },
    mr: { label: "Merge request !87", title: "MR pipeline · !87 (branch pipeline suppressed by workflow:rules)", narr: "The same push, now that an MR is open: <code>workflow:rules</code> creates an <b>MR pipeline</b> and suppresses the branch pipeline. MR jobs appear: dbt tests on changed models and a review app." },
    main: { label: "Merge into main", title: "Branch pipeline · main", narr: "Merging the MR pushes to <b>main</b> (the default branch): full test suite, then an automatic deploy to <b>staging</b>." },
    tag: { label: "Tag v1.4.0", title: "Tag pipeline · v1.4.0", narr: "Pushing tag <b>v1.4.0</b> (<code>$CI_COMMIT_TAG</code>) builds the release; <b>deploy:prod</b> is manual: someone with permission presses ▶." },
    schedule: { label: "Schedule (nightly)", title: "Scheduled pipeline · nightly 02:00", narr: "A <b>pipeline schedule</b> (cron) runs only what's meant for nightly runs, here a dbt full refresh. Everything else is excluded by its rules." },
  };
  const st = { ev: "mr", fail: false, lint: false, needs: false, jobs: [], t: 0, timer: null, ran: false };

  function create() {
    clearInterval(st.timer); st.timer = null; st.t = 0; st.ran = false;
    st.jobs = JOBS.map(j => {
      const r = j.rules[st.ev];
      return { ...j, rule: r, present: r.when !== "never", status: r.when === "never" ? "absent" : "created", left: j.dur, started: null };
    });
    draw();
    const present = st.jobs.filter(j => j.present).length;
    $$("#ci-narr").innerHTML = EVENTS[st.ev].narr + ` <b>${present}</b> of ${JOBS.length} jobs created. Press <b>▶ Run pipeline</b>.`;
    $$("#ci-bar").style.width = "0";
  }

  const byId = id => st.jobs.find(j => j.id === id);
  const done = j => ["success", "warning"].includes(j.status);
  const finished = j => ["success", "warning", "failed", "skipped", "absent"].includes(j.status);
  function ready(j) {
    if (st.needs) {
      const deps = j.needs.map(byId).filter(d => d.present);
      if (deps.some(d => ["failed", "skipped"].includes(d.status))) return "skip";
      return deps.every(done) ? "go" : "wait";
    }
    const before = st.jobs.filter(x => x.present && STAGES.indexOf(x.stage) < STAGES.indexOf(j.stage));
    if (before.some(x => x.status === "failed" || x.status === "skipped")) return "skip";
    return before.every(x => finished(x) || x.status === "manual") ? "go" : "wait";
  }

  function tick() {
    st.t++;
    st.jobs.forEach(j => {
      if (j.status === "running") {
        j.left--;
        if (j.left <= 0) {
          const fails = (j.id === "test:unit" && st.fail) || (j.id === "lint:sql" && st.lint);
          j.status = fails ? (j.allow ? "warning" : "failed") : "success";
          j.ended = st.t;
        }
      } else if (j.status === "pending") { j.status = "running"; j.started = st.t; }
    });
    st.jobs.forEach(j => {
      if (j.status !== "created") return;
      const r = ready(j);
      if (r === "skip") j.status = "skipped";
      else if (r === "go") j.status = j.rule.when === "manual" ? "manual" : "pending";
    });
    draw();
    const status = pipeStatus();
    if (status !== "running") { clearInterval(st.timer); st.timer = null; summary(status); }
  }

  function pipeStatus() {
    const p = st.jobs.filter(j => j.present);
    if (p.some(j => ["running", "pending"].includes(j.status)) || (st.timer && p.some(j => j.status === "created"))) return "running";
    if (p.some(j => j.status === "failed")) return "failed";
    if (p.some(j => j.status === "manual")) return "blocked";
    if (p.every(j => finished(j))) return p.some(j => j.status === "warning") ? "warning" : "success";
    return "created";
  }

  function summary(status) {
    const p = st.jobs.filter(j => j.present);
    const serial = Math.max(...p.filter(j => j.ended).map(j => j.ended), 0);
    const msg = {
      success: `✅ Pipeline <b>passed</b> in <b>${serial} min</b>.`,
      warning: `⚠️ Pipeline <b>passed with warnings</b> in <b>${serial} min</b>: lint:sql failed but has <code>allow_failure: true</code>.`,
      failed: `❌ Pipeline <b>failed</b>: test:unit exited with code 1. ${st.needs ? "With needs, only jobs that depend on it were skipped." : "All later stages were skipped."} With \"Pipelines must succeed\", the MR can't be merged.`,
      blocked: `⏸ Pipeline <b>blocked</b> on a manual job. Press ▶ on <b>deploy:prod</b> to release v1.4.0.`,
    }[status] || "";
    $$("#ci-narr").innerHTML = msg + (st.needs || status === "failed" || status === "blocked" ? "" : " Now tick <b>use needs (DAG)</b> and run again to compare the duration.");
  }

  const ICON = { created: "", pending: "⏱", running: "", success: "✓", failed: "✕", warning: "!", skipped: "»", manual: "⚙", absent: "" };
  function draw() {
    const pipe = $$("#ci-pipe");
    pipe.innerHTML = STAGES.map(s => `<div class="stage"><h5>${s}</h5>${st.jobs.filter(j => j.stage === s).map(j => {
      let why = "";
      if (j.status === "absent") why = j.rule.why;
      else if (j.status === "manual") why = "";
      else if (["success", "failed", "warning"].includes(j.status)) why = `${j.ended - j.started} min`;
      else if (j.status === "created") why = j.rule.when === "manual" ? "manual" : j.rule.why;
      else why = j.status;
      return `<div class="job ${j.status}" data-id="${j.id}" title="${j.present ? "rule: " + j.rule.why : "excluded: " + j.rule.why}">
        <span class="ji">${ICON[j.status]}</span><span class="jn">${j.id}</span>
        ${j.status === "manual" ? `<button class="play" data-play="${j.id}">▶ play</button>` : `<span class="why">${esc(why)}</span>`}</div>`;
    }).join("")}</div>`).join("");
    if (st.needs) drawNeeds(pipe);
    const s = pipeStatus();
    const el = $$("#ci-status");
    el.className = "pipe-status " + (s === "warning" ? "success" : s);
    el.textContent = { created: "created", running: "running", success: "passed", warning: "passed with warnings", failed: "failed", blocked: "blocked" }[s];
    $$("#ci-title").textContent = EVENTS[st.ev].title;
    const p = st.jobs.filter(j => j.present), fin = p.filter(j => finished(j) || j.status === "manual").length;
    $$("#ci-bar").style.width = (p.length ? fin / p.length * 100 : 0) + "%";
  }

  function drawNeeds(pipe) {
    const base = pipe.getBoundingClientRect();
    const svg = svgEl("svg", { class: "needs-svg", width: pipe.scrollWidth, height: pipe.scrollHeight });
    st.jobs.filter(j => j.present).forEach(j => j.needs.forEach(n => {
      const a = pipe.querySelector(`[data-id="${n}"]`), b = pipe.querySelector(`[data-id="${j.id}"]`);
      if (!a || !b || !byId(n).present) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.right - base.left + pipe.scrollLeft, y1 = ra.top + ra.height / 2 - base.top;
      const x2 = rb.left - base.left + pipe.scrollLeft, y2 = rb.top + rb.height / 2 - base.top;
      const mx = (x1 + x2) / 2;
      svg.appendChild(svgEl("path", { d: `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}` }));
    }));
    pipe.appendChild(svg);
  }

  function run() {
    create(); st.ran = true;
    st.jobs.forEach(j => { if (j.present && st.needs && j.needs.filter(n => byId(n).present).length === 0) j.status = j.rule.when === "manual" ? "manual" : "pending"; });
    st.jobs.forEach(j => { if (j.present && !st.needs && j.stage === STAGES.find(s => st.jobs.some(x => x.present && x.stage === s))) j.status = j.rule.when === "manual" ? "manual" : "pending"; });
    $$("#ci-narr").innerHTML = st.needs ? "Jobs with <code>needs: []</code> or whose needs are done start right away, regardless of stage." : "Stage by stage: a stage starts when the whole previous stage is done.";
    draw();
    st.timer = setInterval(tick, REDUCED ? 120 : 450);
  }

  root.addEventListener("click", e => {
    const p = e.target.closest("[data-play]"); if (!p) return;
    const j = byId(p.dataset.play); j.status = "pending";
    $$("#ci-narr").innerHTML = `▶ <b>${j.id}</b> started by you. GitLab records who deployed what to <b>${j.env}</b>.`;
    draw();
    if (!st.timer) st.timer = setInterval(tick, REDUCED ? 120 : 450);
  });
  segmented($$("#ci-event"), Object.entries(EVENTS).map(([k, v]) => ({ value: k, label: v.label })), st.ev, v => { st.ev = v; create(); });
  [["#ci-t-fail", "fail"], ["#ci-t-lint", "lint"], ["#ci-t-needs", "needs"]].forEach(([sel, key]) => {
    const lab = $$(sel), cb = lab.querySelector("input");
    cb.addEventListener("change", () => { st[key] = cb.checked; lab.classList.toggle("on", cb.checked); create(); });
  });
  $$("#ci-run").addEventListener("click", run);
  addEventListener("resize", () => { if (st.needs) draw(); });
  create();
})();
