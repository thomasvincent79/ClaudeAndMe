// =====================================================================
// Merge request lifecycle: each step rebuilds GitLab's repo from scratch
// (same seed → same SHAs, so the graph animates between steps) and
// updates a mock MR widget. The last step applies the chosen merge method.
// =====================================================================
(function () {
  const root = document.getElementById("mrsim");
  if (!root) return;
  const $$ = s => root.querySelector(s);
  const BR = "42-discount-rules";
  const STEPS = [
    ["📌", "Issue"], ["🌿", "Branch"], ["⬆️", "Push"], ["🔀", "Draft MR"], ["🔴", "CI fails"],
    ["🔧", "Fix & push"], ["💬", "Review"], ["✅", "Approve"], ["🚀", "Merge"],
  ];
  $$("#mr-steps").innerHTML = STEPS.map(([i, l], k) => `<button class="ci-step" data-step="${k}"><span class="ci-ico">${i}</span>${l}</button>`).join("");
  const st = { method: "merge", squash: false };
  let view;

  function build(step) {
    GIT_SEQ = 300;
    const r = new Repo("gitlab");
    const c1 = r.addCommit([], "C1"), c2 = r.addCommit([c1.id], "C2");
    r.refs.main = c2.id; r.head = { ref: "main" };
    if (step >= 1) { r.refs[BR] = c2.id; r.head = { ref: BR }; }
    if (step >= 2) { Git.commit(r, "F1"); Git.commit(r, "F2"); }
    if (step >= 5) Git.commit(r, "F3");
    if (step >= 6) r.refs.main = r.addCommit([r.refs.main], "C3").id;
    if (step >= 8) {
      const { method, squash } = st;
      if (method !== "merge") { r.head = { ref: BR }; Git.rebase(r, "main"); }
      r.head = { ref: "main" };
      let tip = r.refs[BR];
      if (squash) tip = r.addCommit([method === "merge" ? c2.id : r.refs.main], "S").id;
      if (method === "ff") r.refs.main = tip;
      else r.refs.main = r.addCommit([r.refs.main, tip], "M1").id;
      delete r.refs[BR];
    }
    return r;
  }

  function cmdFor(step) {
    const m = st.method, sq = st.squash;
    return [
      `<span class="c"># GitLab UI → Issues → New issue</span>\n#42  Add discount rules for loyal customers\n<span class="c">assignee: you · label: ~dbt</span>`,
      `<span class="c"># in issue #42: "Create merge request ▾ → Create branch"</span>\n<span class="k">git fetch</span> origin\n<span class="k">git switch</span> ${BR}`,
      `<span class="k">git add</span> models/marts/discounts.sql\n<span class="k">git commit</span> -m <span class="s">"feat: discount model"</span>\n<span class="k">git commit</span> -am <span class="s">"test: discount rules"</span>\n<span class="k">git push</span> -u origin ${BR}`,
      `<span class="c">remote: To create a merge request for ${BR}, visit:</span>\n<span class="c">remote:   https://gitlab.com/acme/shop/-/merge_requests/new?…</span>\n<span class="c"># title "Draft: …", description "Closes #42"</span>`,
      `<span class="c"># GitLab runs .gitlab-ci.yml for the MR</span>\nlint ✔  build ✔  <span class="k">test:unit ✘</span>\n<span class="c">AssertionError: expected 9.50, got 9.5</span>`,
      `<span class="k">git commit</span> -am <span class="s">"fix: rounding in discount"</span>\n<span class="k">git push</span>        <span class="c"># new pipeline starts by itself</span>`,
      `<span class="c"># reviewer comments on 2 lines → 2 threads</span>\n<span class="c"># meanwhile a teammate's MR landed on main (C3)</span>`,
      `<span class="c"># answer, push or resolve both threads, then:</span>\n<span class="f">/ready</span>      <span class="c"># remove Draft</span>\n<span class="f">/approve</span>    <span class="c"># by @alice (code owner)</span>`,
      (m !== "merge" ? `<span class="f">/rebase</span>     <span class="c"># target moved: GitLab rebases ${BR} on main</span>\n` : "") +
        `<span class="c"># click Merge${sq ? " (squash on)" : ""}</span>\n` +
        { merge: "→ merge commit M1 (2 parents)", semi: "→ merge commit M1 on a straight line", ff: "→ main fast-forwards, no merge commit" }[m] +
        `\n<span class="c"># source branch deleted · issue #42 closed</span>\n<span class="k">git switch</span> main &amp;&amp; <span class="k">git pull</span>`,
    ][step];
  }

  const NARR = [
    "Work starts with an <b>issue</b>: what and why. It can carry labels, a milestone, an assignee and a due date.",
    "From the issue, GitLab creates a branch named after it (<b>42-…</b>), so branch, MR and issue are linked. Locally it's just <code>fetch</code> + <code>switch</code>.",
    "You commit locally and <b>push</b> the branch. Pushing a branch never affects main.",
    "You open a <b>Draft merge request</b>: it can't be merged yet, but CI runs and colleagues can already look. <code>Closes #42</code> links the issue.",
    "Every push to an MR triggers a <b>pipeline</b>. One test fails: the MR shows a red pipeline and, with \"Pipelines must succeed\", the merge button stays disabled.",
    "Fix locally, commit, push: the MR updates in place (same MR, one more commit) and a new pipeline runs, green this time.",
    "Reviewers open <b>threads</b> on specific lines. Meanwhile <b>main moved</b> (C3), which matters for semi-linear and fast-forward methods.",
    "Threads resolved, MR marked ready, a code owner <b>approves</b>. All merge checks are green.",
    "", // set dynamically
  ];
  function mergeNarr() {
    const sq = st.squash ? " With <b>squash</b>, F1–F3 become a single commit S first." : "";
    return {
      merge: "<b>Merge commit</b>: M1 joins main and the branch, whatever main did meanwhile." + sq,
      semi: "<b>Semi-linear</b>: GitLab first rebases the branch on the new main (F′ commits), then adds merge commit M1. Each MR is a bubble on a straight line." + sq,
      ff: "<b>Fast-forward</b>: after the rebase, main simply moves to the branch tip. No merge commit, perfectly linear history." + sq,
    }[st.method] + " The source branch is deleted, issue #42 closes, and the pipeline on main deploys.";
  }

  function mrCard(step) {
    if (step < 3) return `<div class="mr"><div class="mr-top"><div class="mr-title">#42 Add discount rules for loyal customers</div>
      <div class="mr-meta"><span class="mr-state none">Issue · Open</span><span>~dbt</span><span>assigned to you</span></div></div>
      <div class="mr-row ${step >= 1 ? "ok flash" : "off"}"><span class="ico">🌿</span>${step >= 1 ? `Branch <code>${BR}</code> created from this issue` : "No branch yet"}</div>
      <div class="mr-row ${step >= 2 ? "ok flash" : "off"}"><span class="ico">⬆</span>${step >= 2 ? "2 commits pushed: \"Create merge request\" button appears" : "Nothing pushed"}</div>
      <div class="mr-row off"><span class="ico">🔀</span>No merge request yet</div></div>`;
    const draft = step < 7, merged = step >= 8;
    const pipe = step === 3 ? ["wait", "⏳", "Pipeline #1042 running: lint · build · test"]
      : step === 4 ? ["bad", "✘", "Pipeline #1042 <b>failed</b>: test:unit"]
      : merged ? ["ok", "✔", "Pipeline #1046 on main: passed, deployed to staging"] : ["ok", "✔", `Pipeline #104${step >= 5 ? 3 : 2} passed`];
    const appr = step >= 7 ? ["ok", "✔", "Approved by @alice (code owner)"] : ["wait", "1", "Approval required: 0 of 1 (Code owners)"];
    const thr = step < 6 ? ["off", "💬", "No threads"] : step === 6 ? ["bad", "2", "2 unresolved threads"] : ["ok", "✔", "All threads resolved"];
    const needRebase = st.method !== "merge" && step >= 6;
    const reb = !needRebase ? null : merged ? ["ok", "✔", "Rebased onto main before merge"] : ["wait", "↻", "Target branch has new commits: rebase required"];
    const canMerge = step === 7;
    const row = (r, flash) => r && `<div class="mr-row ${r[0]} ${flash ? "flash" : ""}"><span class="ico">${r[1]}</span><span>${r[2]}</span></div>`;
    return `<div class="mr"><div class="mr-top"><div class="mr-title">${draft ? "Draft: " : ""}Add discount rules for loyal customers <span class="muted">!87</span></div>
      <div class="mr-meta"><span class="mr-state ${merged ? "merged" : draft ? "draft" : ""}">${merged ? "Merged" : draft ? "Draft" : "Open"}</span>
      <code>${BR}</code> → <code>main</code><span>· Closes #42</span></div></div>
      ${row(pipe, step === 4 || step === 5 || merged)}${row(appr, step === 7)}${row(thr, step === 6 || step === 7)}${row(reb, step === 6 || merged) || ""}
      <div class="mr-row ${merged ? "ok flash" : ""}"><span class="ico">${merged ? "✔" : "📌"}</span>${merged ? "Issue #42 closed · source branch deleted" : "Issue #42 will close on merge"}
        <button class="mr-btn" disabled>${merged ? "Merged" : canMerge ? (needRebase ? "Rebase, then merge" : "Merge") : "Merge blocked"}</button></div></div>`;
  }

  function show(step) {
    const r = build(step);
    if (!view) view = new GraphView($$("#mr-graph"), r, { minWidth: 360, dx: 48, dy: 70, showOrphans: false });
    view.setRepo(r); view.render();
    $$("#mr-card").innerHTML = mrCard(step);
    $$("#mr-cmd").innerHTML = cmdFor(step);
    $$("#mr-narr").innerHTML = step === 8 ? mergeNarr() : NARR[step];
  }

  const player = stepper($$("#mr-steps"), STEPS.length, show, { auto: 2600 });
  segmented($$("#mr-method"), [{ value: "merge", label: "merge commit" }, { value: "semi", label: "semi-linear" }, { value: "ff", label: "fast-forward" }], st.method,
    v => { st.method = v; show(player.cur); });
  segmented($$("#mr-squash"), [{ value: false, label: "off" }, { value: true, label: "on" }], st.squash, v => { st.squash = v; show(player.cur); });
  $$("#mr-next").addEventListener("click", () => { player.stop(); player.next(); });
  $$("#mr-prev").addEventListener("click", () => { player.stop(); player.prev(); });
  $$("#mr-play").addEventListener("click", () => player.play());
  player.go(0);
})();
