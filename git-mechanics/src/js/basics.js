// =====================================================================
// Four-areas simulator: each file has a version in the working dir,
// the index and HEAD. Commits are snapshots of the index; push copies
// local commits to the remote. Chips are keyed by file+version so that
// flipRender() makes a change glide from one area to the next.
// =====================================================================
(function () {
  const root = document.getElementById("basim");
  if (!root) return;
  const $$ = s => root.querySelector(s);
  const VCOL = ["#8d8d99", "#2f7fd8", "#e8492b", "#6b4fbb", "#12946a", "#d6338a", "#c58a00"];
  let st;

  function init() {
    GIT_SEQ = 40;
    const c1 = { sha: nextSha(), msg: "Initial commit", files: ["README.md@1", "app.py@1"] };
    st = {
      files: { "README.md": { wd: 1, idx: 1, head: 1 }, "app.py": { wd: 1, idx: 1, head: 1 }, "test.py": { wd: null, idx: null, head: null } },
      commits: [c1], remote: [c1.sha], n: 1,
    };
  }

  const changed = () => Object.entries(st.files).filter(([, f]) => f.wd !== f.idx);
  const staged = () => Object.entries(st.files).filter(([, f]) => f.idx !== f.head);
  const ahead = () => st.commits.filter(c => !st.remote.includes(c.sha)).length;

  function statusLines() {
    const out = [`On branch main`];
    const a = ahead();
    out.push(a ? `Your branch is ahead of 'origin/main' by ${a} commit${a > 1 ? "s" : ""}.` : "Your branch is up to date with 'origin/main'.");
    const s = staged(), m = changed().filter(([, f]) => f.idx !== null), u = changed().filter(([, f]) => f.idx === null && f.wd !== null);
    if (s.length) { out.push("Changes to be committed:"); s.forEach(([n, f]) => out.push(`        ${f.head === null ? "new file" : "modified"}:   ${n}`)); }
    if (m.length) { out.push("Changes not staged for commit:"); m.forEach(([n]) => out.push(`        modified:   ${n}`)); }
    if (u.length) { out.push("Untracked files:"); u.forEach(([n]) => out.push(`        ${n}`)); }
    if (!s.length && !m.length && !u.length) out.push("nothing to commit, working tree clean");
    return out;
  }

  const ver = v => `<span class="ver" style="background:${VCOL[v % VCOL.length]}">v${v}</span>`;

  function render(touched = []) {
    const wdItems = Object.entries(st.files).filter(([, f]) => f.wd !== null).map(([n, f]) => {
      if (f.idx === null) return `<div class="fchip untracked" data-key="chg:${n}:${f.wd}">${n} ${ver(f.wd)}<span class="st">untracked</span></div>`;
      if (f.wd !== f.idx) return `<div class="fchip modified" data-key="chg:${n}:${f.wd}">${n} ${ver(f.wd)}<span class="st">modified</span></div>`;
      return `<div class="fchip clean" data-key="clean:${n}">${n} ${ver(f.wd)}</div>`;
    }).join("");
    const stItems = staged().map(([n, f]) => `<div class="fchip staged" data-key="chg:${n}:${f.idx}">${n} ${ver(f.idx)}<span class="st">${f.head === null ? "new file" : "staged"}</span></div>`).join("");
    const tip = st.commits[st.commits.length - 1].sha;
    const rtip = st.remote[st.remote.length - 1];
    const card = (c, local) => `<div class="ccard ${local && c.sha === tip ? "headc" : ""}" data-key="${local ? "lc" : "rc"}:${c.sha}" ${local ? "" : `data-from="lc:${c.sha}"`}>
        <span class="sha">${c.sha}</span> ${esc(c.msg)}
        ${local && c.sha === tip ? ' <span class="badge">HEAD → main</span>' : ""}${local && c.sha === rtip ? ' <span class="badge">origin/main</span>' : ""}${!local && c.sha === rtip ? ' <span class="badge">main</span>' : ""}
        <div class="files">${c.files.map(f => { const [n, v] = f.split("@"); return `<span ${local ? `data-key="chg:${n}:${v}"` : ""}>${n} v${v}</span>`; }).join("")}</div></div>`;
    const local = [...st.commits].reverse().map(c => card(c, true)).join("");
    const remote = [...st.commits].filter(c => st.remote.includes(c.sha)).reverse().map(c => card(c, false)).join("");
    const a = ahead();
    flipRender($$("#ba-zones"), () => {
      $$("#ba-zones").innerHTML = `
        <div class="zone ${touched.includes("wd") ? "touched" : ""}"><h4>📝 Working directory</h4><div class="zsub">files on disk</div><div class="zone-items">${wdItems}</div></div>
        <div class="zone ${touched.includes("idx") ? "touched" : ""}"><h4>📥 Staging area</h4><div class="zsub">.git/index</div><div class="zone-items">${stItems || '<div class="zone-empty">nothing staged</div>'}</div></div>
        <div class="zone ${touched.includes("repo") ? "touched" : ""}"><h4>🗃️ Local repo</h4><div class="zsub">.git/objects · ${a ? `ahead by ${a}` : "in sync"}</div><div class="zone-items">${local}</div></div>
        <div class="zone remote ${touched.includes("remote") ? "touched" : ""}"><h4>🦊 Remote (origin)</h4><div class="zsub">gitlab.com/team/shop</div><div class="zone-items">${remote}</div></div>`;
    });
    buttons();
  }

  function act(cmd, fn) {
    const res = fn();
    termPrint($$("#ba-term"), [{ cmd }, ...(res.out || []).map(o => ({ out: o, cls: res.cls }))]);
    $$("#ba-narr").innerHTML = res.narr;
    render(res.touched || []);
  }

  const ACTIONS = {
    edit: n => () => {
      const f = st.files[n];
      const isNew = f.wd === null;
      f.wd = isNew ? 1 : Math.max(f.wd, f.idx || 0, f.head || 0) + 1;
      return { touched: ["wd"], cls: "dim", out: [isNew ? `(created ${n})` : `(saved ${n})`],
        narr: isNew ? `<b>${n}</b> exists on disk, but git doesn't track it yet: it's <b>untracked</b>. <code>git add</code> it to include it in the next commit.`
          : `Only the <b>working directory</b> changed. git notices (the file differs from the staging area) but records nothing yet.` };
    },
    add: n => () => {
      const list = n === "." ? changed().map(([k]) => k) : [n];
      list.forEach(k => { st.files[k].idx = st.files[k].wd; });
      return { touched: ["idx"], out: [], narr: `<b>git add</b> copies the current version of ${list.map(k => `<b>${k}</b>`).join(", ")} into the <b>staging area</b>. (It also stores the content as a blob in <code>.git/objects</code>.) Later edits won't be included unless you add again.` };
    },
    restore: n => () => {
      const f = st.files[n]; f.wd = f.idx;
      return { touched: ["wd"], out: [], narr: `<b>git restore ${n}</b> overwrites the file on disk with the staged version. <b>Your unstaged edits are gone</b> (git never saved them).` };
    },
    unstage: n => () => {
      const f = st.files[n]; f.idx = f.head;
      return { touched: ["idx"], out: [], narr: `<b>git restore --staged ${n}</b> takes the file out of the staging area. Your file on disk is untouched; the change is just "modified" again.` };
    },
    commit: () => {
      const s = staged();
      if (!s.length) return { cls: "err", out: statusLines().concat(["no changes added to commit (use \"git add\")"]), narr: "Nothing is staged, so there is nothing to commit. <code>git commit</code> only records what is in the <b>staging area</b>." };
      st.n++;
      const msgs = ["Add discount rule", "Fix VAT rounding", "Add tests", "Update README", "Refactor pricing", "Handle refunds"];
      const c = { sha: nextSha(), msg: msgs[(st.n - 2) % msgs.length], files: s.map(([k, f]) => `${k}@${f.idx}`) };
      s.forEach(([, f]) => { f.head = f.idx; });
      st.commits.push(c);
      return { touched: ["idx", "repo"], out: [`[main ${c.sha}] ${c.msg}`, ` ${s.length} file${s.length > 1 ? "s" : ""} changed`],
        narr: `A new <b>commit ${c.sha}</b> is a snapshot of the staging area, with the previous commit as parent. <b>main</b> moves to it. It exists only on your machine: the remote knows nothing yet${changed().length ? ", and your unstaged changes are still in the working directory" : ""}.` };
    },
    push: () => {
      const a = ahead();
      if (!a) return { out: ["Everything up-to-date"], narr: "No local commits missing from the remote: nothing to send." };
      const from = st.remote[st.remote.length - 1], to = st.commits[st.commits.length - 1].sha;
      st.commits.forEach(c => { if (!st.remote.includes(c.sha)) st.remote.push(c.sha); });
      return { touched: ["remote"], out: ["Enumerating objects: 7, done.", `To gitlab.com:team/shop.git`, `   ${from}..${to}  main -> main`],
        narr: `<b>git push</b> sends the ${a} missing commit${a > 1 ? "s" : ""} (and their trees and blobs) to GitLab, then moves the remote's <b>main</b>. Your teammates will get them with <code>git pull</code>. On GitLab, this push is also what triggers a <a href="cicd.html">CI/CD pipeline</a>.` };
    },
    status: () => ({ out: statusLines(), narr: "<b>git status</b> compares the three local areas: working dir vs staging (\"not staged\"), staging vs HEAD (\"to be committed\"), and your branch vs <code>origin/main</code> (ahead / behind)." }),
  };

  function buttons() {
    const f = st.files;
    const b = (label, cmd, fn, dis, cls = "") => `<button ${dis ? "disabled" : ""} class="${cls}" data-cmd="${esc(cmd)}" data-fn="${fn}">${label}</button>`;
    $$("#ba-edit").innerHTML = `<span class="ctl-label">Edit files</span>` +
      b("✎ edit app.py", "(edit app.py in your editor)", "edit:app.py") +
      b("✎ edit README.md", "(edit README.md in your editor)", "edit:README.md") +
      b(f["test.py"].wd === null ? "＋ create test.py" : "✎ edit test.py", "(edit test.py in your editor)", "edit:test.py");
    const chg = changed();
    $$("#ba-git").innerHTML = `<span class="ctl-label">git</span>` +
      chg.map(([n]) => b(`git add ${n}`, `git add ${n}`, "add:" + n)).join("") +
      b("git add .", "git add .", "add:.", !chg.length) +
      b("git commit -m …", "git commit -m \"…\"", "commit") +
      b("git push", "git push", "push") +
      b("git status", "git status", "status") +
      '<span class="sep"></span>' +
      chg.filter(([, x]) => x.idx !== null).map(([n]) => b(`git restore ${n}`, `git restore ${n}`, "restore:" + n, false, "risky")).join("") +
      staged().map(([n]) => b(`git restore --staged ${n}`, `git restore --staged ${n}`, "unstage:" + n)).join("") +
      `<button data-fn="reset">↺ reset</button>`;
  }

  root.addEventListener("click", e => {
    const btn = e.target.closest("button[data-fn]"); if (!btn) return;
    const [fn, arg] = btn.dataset.fn.split(":");
    if (fn === "reset") { init(); $$("#ba-term").innerHTML = ""; termPrint($$("#ba-term"), [{ cmd: "git clone git@gitlab.com:team/shop.git && cd shop" }, { out: "Cloning into 'shop'... done.", cls: "dim" }]); $$("#ba-narr").innerHTML = "Fresh clone: all four areas hold the same snapshot."; render(); return; }
    const a = ACTIONS[fn]; act(btn.dataset.cmd, arg !== undefined ? a(arg) : a);
  });

  init();
  termPrint($$("#ba-term"), [{ cmd: "git clone git@gitlab.com:team/shop.git && cd shop" }, { out: "Cloning into 'shop'... done.", cls: "dim" }]);
  render();
})();
