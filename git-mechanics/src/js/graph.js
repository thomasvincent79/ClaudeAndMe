// =====================================================================
// Tiny in-memory git model + animated commit-graph view.
// Used by the branches, remotes and gitlab pages.
//  - Repo: commits (id, parents, msg), local refs, remote-tracking refs, HEAD
//  - GraphView: lays commits out in lanes (first-parent chains, one per ref)
//    and keeps SVG elements keyed so nodes and labels glide when they move.
// =====================================================================

class Repo {
  constructor(name = "repo") {
    this.name = name;
    this.commits = new Map();
    this.refs = {};        // local branches: name -> id
    this.remoteRefs = {};  // "origin/main" -> id
    this.head = { ref: "main" };
    this.reflog = [];
  }
  clone() {
    const r = new Repo(this.name);
    this.commits.forEach((c, id) => r.commits.set(id, { ...c, parents: [...c.parents] }));
    r.refs = { ...this.refs }; r.remoteRefs = { ...this.remoteRefs }; r.head = { ...this.head }; r.reflog = [...this.reflog];
    return r;
  }
  headId() { return this.head.ref ? this.refs[this.head.ref] : this.head.detached; }
  branch() { return this.head.ref || null; }
  get(id) { return this.commits.get(id); }

  addCommit(parents, msg, extra = {}) {
    const c = { id: nextSha(), parents: parents.filter(Boolean), msg, order: GIT_SEQ, ...extra };
    this.commits.set(c.id, c);
    return c;
  }
  // import commits (and their ancestors) from another repo, keeping ids
  importFrom(other, id) {
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || this.commits.has(cur)) continue;
      const c = other.get(cur);
      this.commits.set(cur, { ...c, parents: [...c.parents] });
      stack.push(...c.parents);
    }
  }
  moveHead(id, why) {
    const prev = this.headId();
    if (this.head.ref) this.refs[this.head.ref] = id; else this.head.detached = id;
    this.reflog.unshift({ id, prev, why });
  }
  ancestors(id) {
    const seen = new Set(), stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur)) continue;
      seen.add(cur);
      const c = this.get(cur); if (c) stack.push(...c.parents);
    }
    return seen;
  }
  isAncestor(a, b) { return this.ancestors(b).has(a); }
  // commits reachable from b but not from a, oldest first, first-parent only (what rebase replays)
  range(a, b) {
    const base = this.ancestors(a), out = [];
    let cur = b;
    while (cur && !base.has(cur)) {
      const c = this.get(cur);
      if (c.parents.length < 2) out.unshift(c); // rebase drops merge commits by default
      cur = c.parents[0];
    }
    return out;
  }
  resolve(rev) {
    if (!rev) return null;
    const m = rev.match(/^(.+?)((?:[~^]\d*)*)$/);
    let base = m[1], suffix = m[2];
    let id = base === "HEAD" || base === "@" ? this.headId()
      : this.refs[base] || this.remoteRefs[base]
      || [...this.commits.keys()].find(k => base.length >= 4 && k.startsWith(base))
      || [...this.commits.values()].find(c => c.msg.toLowerCase() === base.toLowerCase())?.id;
    if (!id) return null;
    for (const s of suffix.match(/[~^]\d*/g) || []) {
      const n = s.length > 1 ? +s.slice(1) : 1;
      if (s[0] === "~") for (let i = 0; i < n && id; i++) id = this.get(id).parents[0];
      else id = this.get(id).parents[n - 1];
      if (!id) return null;
    }
    return id;
  }
  reachable() {
    const s = new Set();
    [...Object.values(this.refs), ...Object.values(this.remoteRefs), this.headId()].forEach(id => id && this.ancestors(id).forEach(x => s.add(x)));
    return s;
  }
}

// ---------- git porcelain on top of Repo (returns {ok, out[], narr}) ----------
const Git = {
  commit(r, msg) {
    const c = r.addCommit([r.headId()], msg);
    r.moveHead(c.id, "commit: " + msg);
    return { ok: true, out: [`[${r.branch() || "detached HEAD"} ${c.id}] ${msg}`], narr: `New commit <b>${msg}</b> whose parent is the previous HEAD. ${r.branch() ? `The branch <b>${r.branch()}</b> moves forward with it.` : "HEAD is detached: <b>no branch</b> moves. Create one or this commit becomes orphaned when you switch away."}`, focus: c.id };
  },
  amend(r, msg) {
    const old = r.get(r.headId());
    const c = r.addCommit(old.parents, msg || old.msg + "*");
    r.moveHead(c.id, "commit (amend)");
    return { ok: true, out: [`[${r.branch()} ${c.id}] ${c.msg}`], narr: `<b>--amend</b> does not modify ${old.msg}: it creates a <b>new</b> commit with the same parent and moves the branch to it. The old one is still in the reflog. Never amend a commit you already pushed.`, focus: c.id };
  },
  branch(r, name) {
    if (r.refs[name]) return { ok: false, out: [`fatal: a branch named '${name}' already exists`] };
    r.refs[name] = r.headId();
    return { ok: true, out: [], narr: `Branch <b>${name}</b> created: a 41-byte file pointing at <b>${r.get(r.headId()).msg}</b>. Nothing else is copied. HEAD stays where it was.` };
  },
  deleteBranch(r, name, force) {
    if (!r.refs[name]) return { ok: false, out: [`error: branch '${name}' not found.`] };
    if (r.head.ref === name) return { ok: false, out: [`error: Cannot delete branch '${name}' checked out`] };
    if (!force && !r.isAncestor(r.refs[name], r.headId()) && !Object.values(r.remoteRefs).some(id => r.isAncestor(r.refs[name], id)))
      return { ok: false, out: [`error: The branch '${name}' is not fully merged.`, `If you are sure you want to delete it, run 'git branch -D ${name}'.`] };
    const id = r.refs[name]; delete r.refs[name];
    return { ok: true, out: [`Deleted branch ${name} (was ${id}).`], narr: `Only the <b>pointer</b> is deleted. Commits that are still reachable stay; the others survive only through the reflog (30 days by default for unreachable entries).` };
  },
  switch(r, name, create) {
    if (create) {
      const res = Git.branch(r, name); if (!res.ok) return res;
      r.head = { ref: name }; r.reflog.unshift({ id: r.headId(), why: "checkout: moving to " + name });
      return { ok: true, out: [`Switched to a new branch '${name}'`], narr: `<b>switch -c</b> = create the branch here + move HEAD onto it. Your next commits will move <b>${name}</b>, not main.` };
    }
    if (r.refs[name]) {
      r.head = { ref: name }; r.reflog.unshift({ id: r.headId(), why: "checkout: moving to " + name });
      return { ok: true, out: [`Switched to branch '${name}'`], narr: `HEAD now points to <b>${name}</b>. git rewrote your working directory to match <b>${r.get(r.refs[name]).msg}</b>.` };
    }
    const id = r.resolve(name);
    if (!id) return { ok: false, out: [`fatal: invalid reference: ${name}`] };
    r.head = { detached: id };
    return { ok: true, out: [`HEAD is now at ${id} ${r.get(id).msg}`], narr: `<b>Detached HEAD</b>: HEAD points directly at a commit, not a branch. Fine to look around; to keep work, run <code>git switch -c new-branch</code>.` };
  },
  merge(r, name, noff) {
    const other = r.resolve(name), cur = r.headId();
    if (!other) return { ok: false, out: [`merge: ${name} - not something we can merge`] };
    if (r.isAncestor(other, cur)) return { ok: true, out: ["Already up to date."], narr: `<b>${name}</b> is already contained in your branch: nothing to do.` };
    if (r.isAncestor(cur, other) && !noff) {
      r.moveHead(other, "merge " + name + ": Fast-forward");
      return { ok: true, out: [`Updating ${cur}..${other}`, "Fast-forward"], narr: `<b>Fast-forward</b>: your branch had no commits of its own, so git just slides the pointer forward to <b>${r.get(other).msg}</b>. No new commit, linear history.`, focus: other };
    }
    const merges = [...r.commits.values()].filter(x => x.parents.length > 1).length;
    const c = r.addCommit([cur, other], "M" + (merges + 1), { merge: name });
    r.moveHead(c.id, "merge " + name);
    return { ok: true, out: [`Merge made by the 'ort' strategy.`], narr: `${noff ? "<b>--no-ff</b> forces" : "Both branches moved, so git creates"} a <b>merge commit</b> ${c.msg} with <b>two parents</b>. History keeps the shape of the branch. (Conflicts would stop here until you fix files, <code>git add</code> and <code>git commit</code>.)`, focus: c.id };
  },
  rebase(r, onto) {
    const target = r.resolve(onto), cur = r.headId();
    if (!target) return { ok: false, out: [`fatal: invalid upstream '${onto}'`] };
    if (r.isAncestor(target, cur)) return { ok: true, out: [`Current branch ${r.branch()} is up to date.`], narr: `Your branch already starts from the tip of <b>${onto}</b>.` };
    if (r.isAncestor(cur, target)) { r.moveHead(target, "rebase (finish)"); return { ok: true, out: [`Successfully rebased and updated refs/heads/${r.branch()}.`], narr: "Nothing to replay: the branch simply fast-forwards.", focus: target }; }
    const todo = r.range(target, cur);
    let base = target, last;
    todo.forEach(c => { last = r.addCommit([base], c.msg.replace(/'*$/, m => m + "'"), { copyOf: c.id }); base = last.id; });
    r.moveHead(base, "rebase (finish)");
    return { ok: true, out: [`Successfully rebased and updated refs/heads/${r.branch()}.`], narr: `git <b>replays</b> ${todo.map(c => c.msg).join(", ")} on top of <b>${onto}</b>: new commits (${todo.map(c => c.msg + "'").join(", ")}) with new SHAs. The originals are now orphaned (faded). Linear history, but <b>never rebase commits others already pulled</b>.`, focus: base };
  },
  cherryPick(r, rev) {
    const id = r.resolve(rev);
    if (!id) return { ok: false, out: [`fatal: bad revision '${rev}'`] };
    const src = r.get(id);
    const c = r.addCommit([r.headId()], src.msg.replace(/'*$/, m => m + "'"), { copyOf: id });
    r.moveHead(c.id, "cherry-pick");
    return { ok: true, out: [`[${r.branch()} ${c.id}] ${src.msg}`], narr: `<b>cherry-pick</b> copies the <em>changes</em> of ${src.msg} into a new commit on your branch. Same diff, different SHA.`, focus: c.id };
  },
  reset(r, rev, mode = "mixed") {
    const id = r.resolve(rev);
    if (!id) return { ok: false, out: [`fatal: ambiguous argument '${rev}'`] };
    r.moveHead(id, "reset: moving to " + rev);
    const what = { soft: "index and files untouched: the undone changes are staged", mixed: "files untouched, index reset: the changes are unstaged", hard: "files overwritten: uncommitted work is <b>lost</b>" }[mode];
    return { ok: true, out: [mode === "hard" ? `HEAD is now at ${id} ${r.get(id).msg}` : "Unstaged changes after reset:"], narr: `<b>reset --${mode}</b> moves the branch pointer back to <b>${r.get(id).msg}</b> (${what}). The commits after it are no longer on any branch.`, focus: id };
  },
  revert(r, rev) {
    const id = r.resolve(rev);
    if (!id) return { ok: false, out: [`fatal: bad revision '${rev}'`] };
    const src = r.get(id);
    const c = r.addCommit([r.headId()], "¬" + src.msg, { revertOf: id });
    r.moveHead(c.id, "revert");
    return { ok: true, out: [`[${r.branch()} ${c.id}] Revert "${src.msg}"`], narr: `<b>revert</b> adds a <b>new</b> commit that applies the inverse of ${src.msg}. History is not rewritten, so it is safe on shared branches.`, focus: c.id };
  },
  log(r) {
    const all = [...r.ancestors(r.headId())].map(id => r.get(id)).sort((a, b) => b.order - a.order);
    return all.map(c => {
      const names = [];
      if (c.id === r.headId()) names.push(r.head.ref ? `HEAD -> ${r.head.ref}` : "HEAD");
      Object.entries(r.refs).forEach(([n, id]) => { if (id === c.id && n !== r.head.ref) names.push(n); });
      Object.entries(r.remoteRefs).forEach(([n, id]) => { if (id === c.id) names.push(n); });
      return `${c.id}${names.length ? " (" + names.join(", ") + ")" : ""} ${c.msg}`;
    });
  },
};

// Parse a typed command line and run it on a repo. msgFor() gives the next default message.
function runGitCommand(r, line, msgFor) {
  const t = (line.match(/"[^"]*"|'[^']*'|\S+/g) || []).map(s => s.replace(/^["']|["']$/g, ""));
  if (t[0] !== "git") return { ok: false, out: ["Commands start with git (try: git commit, git switch -c feature, git merge feature)"] };
  const [cmd, ...a] = t.slice(1);
  const flag = f => a.includes(f);
  const pos = a.filter(x => !x.startsWith("-"));
  const mIdx = a.indexOf("-m");
  const msg = mIdx >= 0 ? a[mIdx + 1] : null;
  switch (cmd) {
    case "commit": return flag("--amend") ? Git.amend(r, msg) : Git.commit(r, msg || msgFor());
    case "branch":
      if (flag("-d") || flag("-D")) return Git.deleteBranch(r, pos[0], flag("-D"));
      if (!pos.length) return { ok: true, out: Object.keys(r.refs).map(n => (n === r.head.ref ? "* " : "  ") + n) };
      return Git.branch(r, pos[0]);
    case "switch": case "checkout":
      if (flag("-c") || flag("-b")) return Git.switch(r, a[a.indexOf(flag("-c") ? "-c" : "-b") + 1], true);
      return Git.switch(r, pos[0]);
    case "merge": return Git.merge(r, pos[0], flag("--no-ff"));
    case "rebase": return Git.rebase(r, pos[0]);
    case "cherry-pick": return Git.cherryPick(r, pos[0]);
    case "reset": return Git.reset(r, pos[0] || "HEAD", flag("--hard") ? "hard" : flag("--soft") ? "soft" : "mixed");
    case "revert": return Git.revert(r, pos[0] || "HEAD");
    case "log": return { ok: true, out: Git.log(r) };
    case "status": return { ok: true, out: [r.head.ref ? `On branch ${r.head.ref}` : `HEAD detached at ${r.head.detached}`, "nothing to commit, working tree clean"] };
    case "reflog": return { ok: true, out: r.reflog.slice(0, 8).map((e, i) => `${e.id} HEAD@{${i}}: ${e.why}`) };
    default: return { ok: false, out: [`git: '${cmd || ""}' is not supported in this sandbox. Try commit, branch, switch, merge, rebase, cherry-pick, reset, revert, log, reflog.`] };
  }
}

// ---------- view ----------
const LANE_COLORS = ["#e8492b", "#6b4fbb", "#2f7fd8", "#12946a", "#d6338a", "#c58a00"];

class GraphView {
  constructor(el, repo, opts = {}) {
    this.el = el; this.repo = repo; this.opts = { dx: 66, dy: 78, showOrphans: true, ...opts };
    el.classList.add("graph-wrap");
    this.svg = svgEl("svg", { class: "graph-svg" });
    this.gEdges = svgEl("g"); this.gNodes = svgEl("g"); this.gLabels = svgEl("g");
    this.svg.append(this.gEdges, this.gNodes, this.gLabels);
    el.appendChild(this.svg);
    this.nodes = new Map(); this.edges = new Map(); this.labels = new Map();
    this.lastLane = new Map();
  }
  setRepo(r) { this.repo = r; }
  reset() { this.gEdges.innerHTML = this.gNodes.innerHTML = this.gLabels.innerHTML = ""; this.nodes.clear(); this.edges.clear(); this.labels.clear(); this.lastLane.clear(); }

  layout() {
    const r = this.repo, reach = r.reachable();
    const all = [...r.commits.values()].filter(c => this.opts.showOrphans || reach.has(c.id)).sort((a, b) => a.order - b.order);
    const lane = new Map(); let n = 0;
    const claim = start => {
      let cur = start, got = false;
      while (cur && r.get(cur) && !lane.has(cur) && all.some(c => c.id === cur)) { lane.set(cur, n); got = true; cur = r.get(cur).parents[0]; }
      if (got) n++;
    };
    const order = [r.refs.main ? "main" : null, ...Object.keys(r.refs).filter(k => k !== "main")].filter(Boolean);
    if (r.head.ref) { order.splice(order.indexOf(r.head.ref), 1); order.splice(r.head.ref === "main" || !r.refs.main ? 0 : 1, 0, r.head.ref); }
    order.forEach(k => claim(r.refs[k]));
    Object.values(r.remoteRefs).forEach(claim);
    if (r.head.detached) claim(r.head.detached);
    // side chains reachable only through merge parents, then orphans (newest first)
    for (let changed = true; changed;) {
      changed = false;
      all.forEach(c => { if (lane.has(c.id)) c.parents.slice(1).forEach(p => { if (!lane.has(p) && r.get(p)) { claim(p); changed = true; } }); });
    }
    [...all].reverse().forEach(c => { if (!lane.has(c.id)) claim(c.id); });
    const rank = new Map(all.map((c, i) => [c.id, i]));
    return { all, lane, rank, reach, lanes: Math.max(n, 1) };
  }

  render({ focus } = {}) {
    const r = this.repo, { dx, dy } = this.opts;
    const L = this.layout();
    const head = r.headId();
    // labels per commit
    const labelsAt = new Map();
    const pushLabel = (id, l) => { if (!id) return; if (!labelsAt.has(id)) labelsAt.set(id, []); labelsAt.get(id).push(l); };
    Object.entries(r.refs).forEach(([name, id]) => {
      pushLabel(id, { key: "b:" + name, text: name, kind: "branch", lane: L.lane.get(id) });
      if (r.head.ref === name) pushLabel(id, { key: "HEAD", text: "HEAD", kind: "head" });
    });
    Object.entries(r.remoteRefs).forEach(([name, id]) => pushLabel(id, { key: "r:" + name, text: name, kind: "remote" }));
    if (r.head.detached) pushLabel(r.head.detached, { key: "HEAD", text: "HEAD (detached)", kind: "head" });
    const maxStack = Math.max(1, ...[...labelsAt.values()].filter((_, i) => true).map(v => v.length));
    const top = 34 + maxStack * 21;
    const pos = id => ({ x: 34 + L.rank.get(id) * dx, y: top + L.lane.get(id) * dy });
    const W = Math.max(this.opts.minWidth || 560, 34 + L.all.length * dx + 90), H = top + (L.lanes - 1) * dy + 40;
    this.svg.setAttribute("viewBox", `0 0 ${W} ${H}`); this.svg.setAttribute("width", W); this.svg.setAttribute("height", H);

    // edges
    const seenE = new Set();
    L.all.forEach(c => c.parents.forEach((p, pi) => {
      if (!L.rank.has(p)) return;
      const k = p + ">" + c.id; seenE.add(k);
      const a = pos(p), b = pos(c.id);
      let d;
      if (a.y === b.y) d = `M${a.x} ${a.y} L${b.x} ${b.y}`;
      else if (pi === 0) d = `M${a.x} ${a.y} C${a.x + dx * .6} ${a.y} ${a.x + dx * .4} ${b.y} ${a.x + dx} ${b.y} L${b.x} ${b.y}`;
      else d = `M${a.x} ${a.y} L${b.x - dx} ${a.y} C${b.x - dx * .4} ${a.y} ${b.x - dx * .6} ${b.y} ${b.x} ${b.y}`;
      let e = this.edges.get(k);
      const orphan = !L.reach.has(c.id);
      if (!e) { e = svgEl("path", { class: "g-edge new" }); this.gEdges.appendChild(e); this.edges.set(k, e); }
      e.setAttribute("d", d); e.style.d = `path("${d}")`;
      e.style.stroke = LANE_COLORS[L.lane.get(pi > 0 ? p : c.id) % LANE_COLORS.length]; // merge lines keep the merged branch's color
      e.classList.toggle("orphan", orphan);
      if (pi > 0) e.classList.add("mergeline");
    }));
    this.edges.forEach((e, k) => { if (!seenE.has(k)) { e.remove(); this.edges.delete(k); } });

    // nodes
    const seenN = new Set();
    L.all.forEach(c => {
      seenN.add(c.id);
      const p = pos(c.id), col = LANE_COLORS[L.lane.get(c.id) % LANE_COLORS.length];
      let g = this.nodes.get(c.id);
      if (!g) {
        g = svgEl("g", { class: "g-node" });
        const inner = svgEl("g", { class: "g-in" + (this.nodes.size ? " new" : "") });
        inner.append(svgEl("circle", { r: 17, class: "g-ring" }), svgEl("circle", { r: 15, class: "g-dot" }),
          svgEl("text", { class: "g-msg", "text-anchor": "middle", y: 4 }), svgEl("text", { class: "g-sha", "text-anchor": "middle", y: 32 }));
        const title = svgEl("title"); inner.appendChild(title);
        g.appendChild(inner); this.gNodes.appendChild(g); this.nodes.set(c.id, g);
        g.style.transform = `translate(${p.x}px, ${p.y}px)`;
        if (c.copyOf && this.nodes.get(c.copyOf)) { // copies (rebase / cherry-pick) fly out of their original
          g.style.transition = "none"; g.style.transform = this.nodes.get(c.copyOf).style.transform;
          g.getBoundingClientRect(); g.style.transition = "";
        }
      }
      const inner = g.firstChild;
      inner.querySelector(".g-msg").textContent = c.msg;
      inner.querySelector(".g-sha").textContent = c.id.slice(0, 7);
      inner.querySelector("title").textContent = `${c.id} ${c.msg}${c.parents.length ? "\nparents: " + c.parents.join(", ") : "\nroot commit"}`;
      inner.querySelector(".g-dot").style.stroke = col;
      inner.querySelector(".g-ring").style.stroke = col;
      g.classList.toggle("orphan", !L.reach.has(c.id));
      g.classList.toggle("head", c.id === head);
      g.classList.toggle("merge", c.parents.length > 1);
      requestAnimationFrame(() => { g.style.transform = `translate(${p.x}px, ${p.y}px)`; });
    });
    this.nodes.forEach((g, k) => { if (!seenN.has(k)) { g.remove(); this.nodes.delete(k); } });

    // labels
    const seenL = new Set();
    labelsAt.forEach((ls, id) => {
      const p = pos(id);
      ls.forEach((l, i) => {
        seenL.add(l.key);
        const w = l.text.length * 7.4 + 16, y = p.y - 30 - i * 21;
        let g = this.labels.get(l.key);
        if (!g) {
          g = svgEl("g", { class: "g-label " + l.kind });
          g.append(svgEl("rect", { height: 18, rx: 6, y: -13 }), svgEl("text", { "text-anchor": "middle", y: 0 }));
          this.gLabels.appendChild(g); this.labels.set(l.key, g);
          g.style.transform = `translate(${p.x}px, ${y}px)`;
          g.firstChild.nextSibling.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        }
        const rect = g.querySelector("rect");
        rect.setAttribute("width", w); rect.setAttribute("x", -w / 2);
        if (l.kind === "branch") rect.style.fill = LANE_COLORS[(l.lane ?? 0) % LANE_COLORS.length];
        g.querySelector("text").textContent = l.text;
        g.classList.toggle("current", l.kind === "branch" && r.head.ref === l.text);
        requestAnimationFrame(() => { g.style.transform = `translate(${p.x}px, ${y}px)`; });
      });
    });
    this.labels.forEach((g, k) => { if (!seenL.has(k)) { g.remove(); this.labels.delete(k); } });

    if (focus && L.rank.has(focus)) {
      const x = pos(focus).x;
      if (x > this.el.scrollLeft + this.el.clientWidth - 80 || x < this.el.scrollLeft) this.el.scrollTo({ left: x - this.el.clientWidth / 2, behavior: "smooth" });
    }
  }
}
