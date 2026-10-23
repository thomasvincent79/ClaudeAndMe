// =====================================================================
// Branch sandbox: a Repo + GraphView driven by typed commands, quick
// buttons and scripted scenarios played step by step.
// =====================================================================
(function () {
  const root = document.getElementById("brsim");
  if (!root) return;
  const $$ = s => root.querySelector(s);
  let repo, view, n, playing = null;

  function fresh() {
    GIT_SEQ = 0; n = 0;
    repo = new Repo("shop");
    const c1 = repo.addCommit([], "C" + (++n)); repo.refs.main = c1.id;
    const c2 = repo.addCommit([c1.id], "C" + (++n)); repo.refs.main = c2.id;
    repo.reflog = [{ id: c2.id, why: "commit: C2" }, { id: c1.id, why: "commit (initial): C1" }];
    if (!view) view = new GraphView($$("#br-graph"), repo, { minWidth: 640 });
    else { view.setRepo(repo); view.reset(); }
    view.render();
    $$("#br-term").innerHTML = "";
    termPrint($$("#br-term"), [{ cmd: "git log --oneline" }, ...Git.log(repo).map(o => ({ out: o }))]);
  }
  const msgFor = () => "C" + (++n);

  function run(line) {
    line = line.trim(); if (!line) return;
    const res = runGitCommand(repo, line, msgFor);
    termPrint($$("#br-term"), [{ cmd: line }, ...res.out.map(o => ({ out: o, cls: res.ok ? "" : "err" }))]);
    if (res.narr) $$("#br-narr").innerHTML = res.narr;
    else if (!res.ok) $$("#br-narr").innerHTML = "That didn't work: read the error in the terminal.";
    view.render({ focus: res.focus });
    buttons();
  }

  function buttons() {
    const cur = repo.branch(), others = Object.keys(repo.refs).filter(b => b !== cur);
    const cmds = ["git commit"];
    if (!repo.refs.feature) cmds.push("git switch -c feature");
    others.forEach(b => cmds.push(`git switch ${b}`));
    if (cur) others.forEach(b => cmds.push(`git merge ${b}`, `git rebase ${b}`));
    cmds.push("git reset --hard HEAD~1", "git log --oneline", "git reflog");
    $$("#br-btns").innerHTML = cmds.map(c => `<button data-cmd="${c}" class="${/reset|rebase/.test(c) ? "risky" : ""}" ${playing ? "disabled" : ""}>${c}</button>`).join("");
  }

  const SCENARIOS = {
    "Fast-forward": ["git switch -c feature", "git commit", "git commit", "git switch main", "git merge feature"],
    "3-way merge": ["git switch -c feature", "git commit", "git commit", "git switch main", "git commit", "git merge feature"],
    "--no-ff": ["git switch -c feature", "git commit", "git commit", "git switch main", "git merge --no-ff feature", "git branch -d feature"],
    "Rebase": ["git switch -c feature", "git commit", "git commit", "git switch main", "git commit", "git switch feature", "git rebase main", "git switch main", "git merge feature"],
    "Cherry-pick": ["git switch -c experiment", "git commit", "git commit", "git switch main", "git cherry-pick C4"],
    "Detached HEAD": ["git switch C1", "git commit", "git switch main", "git reflog"],
    "Revert vs reset": ["git commit", "git revert HEAD", "git reset --hard HEAD~2"],
  };
  $$("#br-presets").innerHTML = Object.keys(SCENARIOS).map(k => `<button data-scn="${k}">${k}</button>`).join("");

  function play(name) {
    clearTimeout(playing); fresh();
    const steps = [...SCENARIOS[name]];
    const next = () => {
      if (!steps.length) { playing = null; buttons(); return; }
      const c = steps.shift();
      $$("#br-in").value = c; run(c); $$("#br-in").value = "";
      playing = setTimeout(next, REDUCED ? 300 : 1300);
      buttons();
    };
    playing = setTimeout(next, 200);
    root.querySelectorAll("[data-scn]").forEach(b => b.classList.toggle("on", b.dataset.scn === name));
  }

  root.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.cmd) run(b.dataset.cmd);
    else if (b.dataset.scn) play(b.dataset.scn);
  });
  $$("#br-run").addEventListener("click", () => { run($$("#br-in").value); $$("#br-in").value = ""; });
  const hist = []; let hi = 0;
  $$("#br-in").addEventListener("keydown", e => {
    if (e.key === "Enter") { const v = e.target.value; if (v.trim()) hist.push(v); hi = hist.length; run(v); e.target.value = ""; }
    else if (e.key === "ArrowUp" && hi > 0) { e.target.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hi = Math.min(hist.length, hi + 1); e.target.value = hist[hi] || ""; }
  });
  $$("#br-reset").addEventListener("click", () => { clearTimeout(playing); playing = null; fresh(); buttons(); $$("#br-narr").innerHTML = "Back to two commits on <b>main</b>."; });

  fresh(); buttons();
})();
