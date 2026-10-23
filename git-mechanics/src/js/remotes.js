// =====================================================================
// Remotes simulator: two Repo objects (your clone, GitLab's copy) that
// only exchange commits through fetch / pull / push. Pushes are refused
// unless they fast-forward the remote; --force-with-lease checks that
// origin/main still matches the remote.
// =====================================================================
(function () {
  const root = document.getElementById("rmsim");
  if (!root) return;
  const $$ = s => root.querySelector(s);
  let local, remote, lv, rv, na, nb, playing = null;

  function fresh() {
    GIT_SEQ = 100; na = 0; nb = 0;
    remote = new Repo("origin");
    const c1 = remote.addCommit([], "C1"), c2 = remote.addCommit([c1.id], "C2");
    remote.refs.main = c2.id;
    local = new Repo("local");
    local.importFrom(remote, c2.id); local.refs.main = c2.id; local.remoteRefs["origin/main"] = c2.id;
    if (!lv) { lv = new GraphView($$("#rm-local"), local, { minWidth: 300, dx: 56 }); rv = new GraphView($$("#rm-remote"), remote, { minWidth: 300, dx: 56 }); }
    else { lv.setRepo(local); lv.reset(); rv.setRepo(remote); rv.reset(); }
    $$("#rm-term").innerHTML = "";
    termPrint($$("#rm-term"), [{ cmd: "git clone git@gitlab.com:team/shop.git" }, { out: "Cloning into 'shop'... done.", cls: "dim" }]);
    draw();
  }

  function aheadBehind() {
    const m = local.refs.main, o = local.remoteRefs["origin/main"];
    const am = local.ancestors(m), ao = local.ancestors(o);
    return { ahead: [...am].filter(x => !ao.has(x)).length, behind: [...ao].filter(x => !am.has(x)).length };
  }
  function draw(focusL, focusR) {
    lv.render({ focus: focusL }); rv.render({ focus: focusR });
    const { ahead, behind } = aheadBehind();
    $$("#rm-ab").textContent = ahead || behind ? `main: ahead ${ahead}, behind ${behind} (vs origin/main)` : "main = origin/main";
    buttons();
  }

  function fetch() {
    const before = local.remoteRefs["origin/main"], tip = remote.refs.main;
    if (before === tip) return { out: [], narr: "Nothing new on GitLab: <b>origin/main</b> is already accurate." };
    local.importFrom(remote, tip); local.remoteRefs["origin/main"] = tip;
    const forced = !remote.isAncestor(before, tip);
    return { out: ["From gitlab.com:team/shop", `${forced ? " + " : "   "}${before}..${tip}  main       -> origin/main${forced ? "  (forced update)" : ""}`],
      narr: `<b>fetch</b> downloaded the new commits and moved <b>origin/main</b>. Your <b>main</b> and your files did not change: you can inspect before integrating.` };
  }

  const OPS = {
    commit: () => { const r = Git.commit(local, "A" + (++na)); return { out: r.out, narr: `Local commit <b>A${na}</b>. GitLab doesn't know about it until you push.`, fl: r.focus }; },
    teammate: () => {
      const c = remote.addCommit([remote.refs.main], "B" + (++nb)); remote.refs.main = c.id;
      return { cmd: "(teammate) git push", out: [`   ...  main -> main  (by Sam)`], narr: `Your teammate pushed <b>B${nb}</b> to GitLab. Your laptop has no idea yet: <b>origin/main</b> still shows the old position.`, fr: c.id };
    },
    fetch: () => fetch(),
    pull: () => {
      const f = fetch(); const m = Git.merge(local, "origin/main");
      return { out: [...f.out, ...m.out], narr: `<b>pull</b> = fetch + merge. ${m.narr}`, fl: m.focus };
    },
    pullrb: () => {
      const f = fetch(); const m = Git.rebase(local, "origin/main");
      return { out: [...f.out, ...m.out], narr: `<b>pull --rebase</b> = fetch + rebase. ${m.narr}`, fl: m.focus };
    },
    push: mode => () => {
      const mine = local.refs.main, theirs = remote.refs.main;
      if (mine === theirs) return { out: ["Everything up-to-date"], narr: "GitLab already has your main." };
      const ff = local.commits.has(theirs) && local.isAncestor(theirs, mine);
      if (!ff && mode === "normal") {
        const known = local.remoteRefs["origin/main"] === theirs;
        return { err: true, out: ["To gitlab.com:team/shop.git", ` ! [rejected]        main -> main (${known ? "non-fast-forward" : "fetch first"})`, "error: failed to push some refs to 'gitlab.com:team/shop.git'",
          known ? "hint: Updates were rejected because the tip of your current branch is behind its remote counterpart." : "hint: Updates were rejected because the remote contains work that you do not have locally."],
          narr: `<b>Rejected.</b> GitLab's main (${remote.get(theirs).msg}) is not an ancestor of yours: accepting would drop commits. Integrate first with <b>git pull</b> or <b>git pull --rebase</b>.` };
      }
      if (!ff && mode === "lease" && local.remoteRefs["origin/main"] !== theirs)
        return { err: true, out: ["To gitlab.com:team/shop.git", " ! [rejected]        main -> main (stale info)", "error: failed to push some refs"],
          narr: `<b>--force-with-lease refused</b>: GitLab's main moved since your last fetch (someone pushed <b>${remote.get(theirs).msg}</b>). Nothing was overwritten. Fetch, look, then decide.` };
      remote.importFrom(local, mine); const old = theirs; remote.refs.main = mine; local.remoteRefs["origin/main"] = mine;
      return { out: ["To gitlab.com:team/shop.git", `${ff ? "   " : " + "}${old}..${mine}  main -> main${ff ? "" : "  (forced update)"}`],
        narr: ff ? `Accepted: a <b>fast-forward</b> of GitLab's main. <b>origin/main</b> moves too.` :
          `<b>Forced.</b> GitLab's main now points to your history. Any commit only reachable from the old tip is <b>gone from the branch</b> (faded on the right)${mode === "force" && [...remote.commits.values()].some(c => /^B/.test(c.msg) && !remote.reachable().has(c.id)) ? ": your teammate's work just disappeared" : ""}.`,
        fr: mine };
    },
    status: () => {
      const { ahead, behind } = aheadBehind();
      const line = ahead && behind ? `Your branch and 'origin/main' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.`
        : ahead ? `Your branch is ahead of 'origin/main' by ${ahead} commit${ahead > 1 ? "s" : ""}.` : behind ? `Your branch is behind 'origin/main' by ${behind} commit${behind > 1 ? "s" : ""}, and can be fast-forwarded.` : "Your branch is up to date with 'origin/main'.";
      return { out: ["On branch main", line], narr: `<b>status</b> compares main with your <b>origin/main</b> bookmark, not with GitLab itself. ${remote.refs.main !== local.remoteRefs["origin/main"] ? "Here the bookmark is stale: GitLab has moved, fetch to find out." : ""}` };
    },
  };
  const CMDS = [
    ["git commit", "commit"], ["👥 teammate pushes", "teammate"], ["git fetch", "fetch"], ["git pull", "pull"], ["git pull --rebase", "pullrb"],
    ["git push", "push:normal"], ["git push --force-with-lease", "push:lease"], ["git push --force", "push:force"], ["git status", "status"],
  ];
  function buttons() {
    $$("#rm-btns").innerHTML = CMDS.map(([l, k]) => `<button data-op="${k}" class="${/force/.test(k) ? "risky" : ""}" ${playing ? "disabled" : ""}>${l}</button>`).join("");
  }
  function run(label, key) {
    const [k, arg] = key.split(":");
    const res = arg ? OPS[k](arg)() : OPS[k]();
    termPrint($$("#rm-term"), [{ cmd: res.cmd || label }, ...res.out.map(o => ({ out: o, cls: res.err ? "err" : "" }))]);
    $$("#rm-narr").innerHTML = res.narr;
    draw(res.fl, res.fr);
  }
  const SCENARIOS = {
    "Rejected push → pull": ["commit", "teammate", "push:normal", "pull", "push:normal"],
    "pull --rebase": ["commit", "commit", "teammate", "push:normal", "pullrb", "push:normal"],
    "Force push accident": ["commit", "teammate", "push:force"],
    "Lease saves the day": ["commit", "teammate", "push:lease", "fetch", "pullrb", "push:lease"],
  };
  $$("#rm-presets").innerHTML = Object.keys(SCENARIOS).map(k => `<button data-scn="${k}">${k}</button>`).join("");
  function play(name) {
    clearTimeout(playing); fresh();
    const steps = [...SCENARIOS[name]];
    const next = () => {
      if (!steps.length) { playing = null; buttons(); return; }
      const key = steps.shift(); run(CMDS.find(c => c[1] === key)[0], key);
      playing = setTimeout(next, REDUCED ? 300 : 1600); buttons();
    };
    playing = setTimeout(next, 200);
  }
  root.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.op) run(b.textContent, b.dataset.op);
    else if (b.dataset.scn) play(b.dataset.scn);
  });
  $$("#rm-reset").addEventListener("click", () => { clearTimeout(playing); playing = null; fresh(); $$("#rm-narr").innerHTML = "Back to a fresh clone."; });
  fresh();
})();
