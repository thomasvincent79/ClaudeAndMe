// =====================================================================
// Undo simulator: a single file whose version lives in four places
// (commit history, staging area, working dir, stash). Each command
// changes some of them; chips fly from where their content came from.
// =====================================================================
(function () {
  const root = document.getElementById("unsim");
  if (!root) return;
  const $$ = s => root.querySelector(s);
  const VCOL = ["#8d8d99", "#2f7fd8", "#e8492b", "#6b4fbb", "#12946a", "#d6338a", "#c58a00", "#0f8b9c"];
  let st;

  function init() {
    GIT_SEQ = 200;
    const commits = new Map();
    let parent = null;
    ["Initial commit", "Add discount rule", "Fix VAT rounding"].forEach((msg, i) => {
      const sha = nextSha(); commits.set(sha, { sha, msg, v: i + 1, parent }); parent = sha;
    });
    st = { commits, tip: parent, idx: 3, wd: 4, maxV: 4, stash: [], reflog: [] };
    [...commits.values()].reverse().forEach(c => st.reflog.push({ sha: c.sha, why: (c.parent ? "commit: " : "commit (initial): ") + c.msg }));
  }
  const head = () => st.commits.get(st.tip);
  const chain = () => { const out = []; let c = head(); while (c) { out.push(c); c = st.commits.get(c.parent); } return out; };
  const shaOfV = v => [...st.commits.values()].find(c => c.v === v)?.sha || "";
  const badge = v => `<span class="ver" style="background:${VCOL[v % VCOL.length]}">v${v}</span>`;
  function moveTip(sha, why) { st.tip = sha; st.reflog.unshift({ sha, why }); }

  function render(touched = []) {
    const ch = chain(), reach = new Set(ch.map(c => c.sha));
    const orphans = [...st.commits.values()].filter(c => !reach.has(c.sha)).reverse();
    const hv = head().v;
    const card = (c, orphan) => `<div class="ccard ${c.sha === st.tip ? "headc" : ""} ${orphan ? "gonec" : ""}" data-key="c:${c.sha}">
      <span class="sha">${c.sha}</span> ${badge(c.v)} ${c.sha === st.tip ? '<span class="badge">HEAD → main</span>' : ""}<div class="muted" style="font-size:.72rem">${esc(c.msg)}</div></div>`;
    flipRender($$("#un-zones"), () => {
      $$("#un-zones").innerHTML = `
        <div class="zone ${touched.includes("head") ? "touched" : ""}"><h4>🗃️ History (main)</h4><div class="zsub">commits, newest first</div><div class="zone-items">
          ${ch.map(c => card(c)).join("")}
          ${orphans.length ? `<div class="zsub" style="margin-top:6px">orphaned (only in reflog)</div>${orphans.map(c => card(c, true)).join("")}` : ""}</div></div>
        <div class="zone ${touched.includes("idx") ? "touched" : ""}"><h4>📥 Staging area</h4><div class="zsub">${st.idx === hv ? "same as HEAD" : "differs from HEAD: staged"}</div><div class="zone-items">
          <div class="fchip ${st.idx === hv ? "clean" : "staged"}" data-key="idx:v${st.idx}" data-from="wd:v${st.idx} c:${shaOfV(st.idx)} st:v${st.idx}">app.py ${badge(st.idx)}<span class="st">${st.idx === hv ? "" : "staged"}</span></div></div></div>
        <div class="zone ${touched.includes("wd") ? "touched" : ""}"><h4>📝 Working directory</h4><div class="zsub">${st.wd === st.idx ? "same as staging" : "differs: not staged"}</div><div class="zone-items">
          <div class="fchip ${st.wd === st.idx ? "clean" : "modified"}" data-key="wd:v${st.wd}" data-from="idx:v${st.wd} c:${shaOfV(st.wd)} st:v${st.wd}">app.py ${badge(st.wd)}<span class="st">${st.wd === st.idx ? "" : "modified"}</span></div></div></div>
        <div class="zone ${touched.includes("stash") ? "touched" : ""}"><h4>👝 Stash</h4><div class="zsub">git stash list</div><div class="zone-items">
          ${st.stash.map((s, i) => `<div class="fchip" data-key="st:v${s.wd}" data-from="wd:v${s.wd}">stash@{${i}} ${badge(s.wd)}</div>`).join("") || '<div class="zone-empty">empty</div>'}</div></div>`;
    });
    buttons();
  }

  const dirty = () => st.wd !== head().v || st.idx !== head().v;
  const OPS = {
    edit: () => { st.wd = ++st.maxV; return { t: ["wd"], out: ["(saved app.py)"], cls: "dim", narr: `You edited the file: working directory is now ${badge(st.wd)}.` }; },
    add: () => { st.idx = st.wd; return { t: ["idx"], out: [], narr: `Staging area now holds ${badge(st.idx)}.` }; },
    commit: () => {
      if (st.idx === head().v) return { err: true, out: ["nothing added to commit"], narr: "The staging area equals HEAD: nothing to commit." };
      const sha = nextSha(); st.commits.set(sha, { sha, msg: "Update app.py", v: st.idx, parent: st.tip }); moveTip(sha, "commit: Update app.py");
      return { t: ["head"], out: [`[main ${sha}] Update app.py`], narr: `New commit ${sha} with ${badge(st.idx)}.` };
    },
    amend: () => {
      const old = head(); const sha = nextSha();
      st.commits.set(sha, { sha, msg: old.msg + " (amended)", v: st.idx, parent: old.parent }); moveTip(sha, "commit (amend): " + old.msg);
      return { t: ["head"], out: [`[main ${sha}] ${old.msg} (amended)`], narr: `<b>--amend</b> replaced ${old.sha} with a <b>new</b> commit ${sha} (same parent, content = staging area ${badge(st.idx)}). The old one is orphaned. Only do this before pushing.` };
    },
    restore: () => { const lost = st.wd; st.wd = st.idx; return { t: ["wd"], out: [], narr: lost === st.wd ? "Nothing to discard." : `<b>restore</b> copied the staged ${badge(st.idx)} over your file. ${badge(lost)} is <b>gone forever</b>: it was never staged or committed.` }; },
    unstage: () => { st.idx = head().v; return { t: ["idx"], out: [], narr: `<b>restore --staged</b>: staging area back to HEAD's ${badge(st.idx)}. Your file on disk is untouched.` }; },
    stash: () => {
      if (!dirty()) return { out: ["No local changes to save"], narr: "Nothing to stash: everything matches HEAD." };
      st.stash.unshift({ wd: st.wd, idx: st.idx }); st.wd = st.idx = head().v;
      return { t: ["stash", "wd", "idx"], out: [`Saved working directory and index state WIP on main: ${st.tip} ${head().msg}`], narr: `<b>stash</b> saved your changes aside and reset both areas to HEAD. You can now switch branches safely.` };
    },
    pop: () => {
      if (!st.stash.length) return { err: true, out: ["No stash entries found."], narr: "The stash is empty." };
      if (dirty()) return { err: true, out: ["error: Your local changes to the following files would be overwritten by merge:", "\tapp.py"], narr: "Pop refuses to overwrite uncommitted changes. Commit or stash them first." };
      const s = st.stash.shift(); st.wd = s.wd; st.idx = head().v;
      return { t: ["wd", "stash"], out: ["Dropped refs/stash@{0}"], narr: `<b>stash pop</b> re-applied ${badge(s.wd)} to the working directory and removed the entry. (Staged state comes back unstaged unless you use <code>--index</code>.)` };
    },
    reset: mode => () => {
      const p = head().parent;
      if (!p) return { err: true, out: ["fatal: ambiguous argument 'HEAD~1': unknown revision"], narr: "There is no commit before the first one." };
      const from = head();
      moveTip(p, `reset: moving to HEAD~1`);
      const hv = head().v;
      if (mode !== "soft") st.idx = hv;
      if (mode === "hard") st.wd = hv;
      const t = ["head", ...(mode !== "soft" ? ["idx"] : []), ...(mode === "hard" ? ["wd"] : [])];
      const narr = {
        soft: `main moved back to ${head().sha}. Staging area and files untouched, so ${from.msg}'s changes now show as <b>staged</b>: commit again to redo it differently.`,
        mixed: `main moved back and the staging area was reset to ${badge(hv)}. Your files are untouched: everything shows as <b>modified, not staged</b>.`,
        hard: `main, staging area <b>and</b> working directory are now ${badge(hv)}. ${from.msg} is orphaned (recoverable via reflog); uncommitted edits are lost.`,
      }[mode];
      return { t, out: mode === "hard" ? [`HEAD is now at ${head().sha} ${head().msg}`] : ["Unstaged changes after reset:", "M\tapp.py"], narr };
    },
    revert: () => {
      if (dirty()) return { err: true, out: ["error: your local changes would be overwritten by revert.", "hint: commit your changes or stash them to proceed."], narr: "<b>revert</b> needs a clean tree. Stash or commit first." };
      const h = head(), p = st.commits.get(h.parent);
      if (!p) return { err: true, out: ["error: cannot revert the root commit here"], narr: "" };
      const sha = nextSha(); st.commits.set(sha, { sha, msg: `Revert "${h.msg}"`, v: p.v, parent: h.sha }); moveTip(sha, `revert: Revert "${h.msg}"`);
      st.idx = st.wd = p.v;
      return { t: ["head", "idx", "wd"], out: [`[main ${sha}] Revert "${h.msg}"`], narr: `<b>revert</b> added a <b>new</b> commit whose content is ${badge(p.v)} again. History only grows, nothing is orphaned: safe on a pushed branch.` };
    },
    reflog: () => ({ out: st.reflog.slice(0, 8).map((e, i) => `${e.sha} HEAD@{${i}}: ${e.why}`), narr: "The <b>reflog</b> lists every position HEAD had. Any of these SHAs can be restored." }),
    undoReset: () => {
      const e = st.reflog[1];
      if (!e) return { err: true, out: ["fatal: log for 'HEAD' only has 1 entries"], narr: "" };
      moveTip(e.sha, "reset: moving to HEAD@{1}"); st.idx = st.wd = head().v;
      return { t: ["head", "idx", "wd"], out: [`HEAD is now at ${e.sha} ${head().msg}`], narr: `Back to where HEAD was one move ago (${e.sha}). Orphaned commits are reachable again.` };
    },
  };
  const ROW1 = [["✎ edit app.py", "edit"], ["git add app.py", "add"], ["git commit", "commit"], ["git commit --amend", "amend"], ["git restore app.py", "restore", 1], ["git restore --staged app.py", "unstage"], ["git stash", "stash"], ["git stash pop", "pop"]];
  const ROW2 = [["git reset --soft HEAD~1", "reset:soft"], ["git reset --mixed HEAD~1", "reset:mixed"], ["git reset --hard HEAD~1", "reset:hard", 1], ["git revert HEAD", "revert"], ["git reflog", "reflog"], ["git reset --hard HEAD@{1}", "undoReset", 1]];
  function buttons() {
    const mk = r => r.map(([l, k, risky]) => `<button data-op="${k}" class="${risky ? "risky" : ""}">${esc(l)}</button>`).join("");
    $$("#un-btns1").innerHTML = '<span class="ctl-label">Work</span>' + mk(ROW1);
    $$("#un-btns2").innerHTML = '<span class="ctl-label">Undo</span>' + mk(ROW2) + '<button data-op="init">↺ reset sim</button>';
  }
  root.addEventListener("click", e => {
    const b = e.target.closest("button[data-op]"); if (!b) return;
    if (b.dataset.op === "init") { init(); $$("#un-term").innerHTML = ""; $$("#un-narr").innerHTML = "Back to the start."; render(); return; }
    const [k, arg] = b.dataset.op.split(":");
    const res = arg ? OPS[k](arg)() : OPS[k]();
    termPrint($$("#un-term"), [{ cmd: b.textContent.startsWith("✎") ? "(edit app.py)" : b.textContent }, ...res.out.map(o => ({ out: o, cls: res.err ? "err" : res.cls || "" }))]);
    $$("#un-narr").innerHTML = res.narr;
    render(res.t || []);
  });
  init(); render();
})();
