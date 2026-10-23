// =====================================================================
// Cheat sheet: data + live filter with highlighting.
// Each entry: [command, description, flag] where flag is "risk" (rewrites
// history / discards work) or "safe" (worth knowing it is harmless).
// =====================================================================
(function () {
  const list = document.getElementById("cs-list");
  if (!list) return;
  const DATA = [
    ["⚙️", "Setup", [
      ["git config --global user.name \"Name\"", "Set the author name used in your commits"],
      ["git config --global user.email \"you@acme.com\"", "Set the author email (use the one linked to your GitLab account)"],
      ["git init", "Turn the current folder into a new repository"],
      ["git clone <url> [folder]", "Copy a remote repository, with its full history"],
      ["git clone --depth 1 <url>", "Shallow clone: latest snapshot only, much faster"],
      ["git config --list --show-origin", "Show every setting and which file it comes from", "safe"],
    ]],
    ["📝", "Stage & commit", [
      ["git status / git status -sb", "What's modified, staged, untracked; ahead/behind the remote", "safe"],
      ["git add <file> / git add .", "Stage a file / everything in the current folder"],
      ["git add -p", "Stage hunk by hunk, interactively: split work into clean commits"],
      ["git commit -m \"msg\"", "Record the staged snapshot as a new commit"],
      ["git commit -am \"msg\"", "Stage all tracked modified files and commit (not new files)"],
      ["git commit --amend", "Replace the last commit (new message or forgotten file)", "risk"],
      ["git rm <file> / git rm --cached <file>", "Delete and stage the deletion / stop tracking but keep the file"],
      ["git mv <old> <new>", "Rename or move a file and stage it"],
    ]],
    ["🔍", "Inspect history", [
      ["git log --oneline --graph --all", "Compact commit graph of all branches", "safe"],
      ["git log -p -- <file>", "Every change to one file, with diffs", "safe"],
      ["git log main..feature", "Commits on feature that are not on main", "safe"],
      ["git log -S \"text\"", "Commits that added or removed this text", "safe"],
      ["git diff / git diff --staged", "Unstaged changes / what will be committed", "safe"],
      ["git diff main...feature", "What feature changed since it branched off main", "safe"],
      ["git show <sha>", "One commit: metadata + diff", "safe"],
      ["git blame <file>", "Last commit and author for each line", "safe"],
      ["git bisect start / good / bad / reset", "Binary-search the commit that introduced a bug", "safe"],
      ["git shortlog -sn", "Commit count per author", "safe"],
    ]],
    ["🌿", "Branch & merge", [
      ["git branch", "List local branches (-a: include remote-tracking, -vv: upstream + ahead/behind)", "safe"],
      ["git switch <branch>", "Move to a branch (updates your files)"],
      ["git switch -c <branch>", "Create a branch here and switch to it"],
      ["git switch --detach <sha|tag>", "Look at an old commit (detached HEAD)"],
      ["git branch -d <branch> / -D", "Delete a merged branch / force-delete an unmerged one", "risk"],
      ["git branch -m <new-name>", "Rename the current branch"],
      ["git merge <branch>", "Merge a branch into the current one (fast-forward or merge commit)"],
      ["git merge --no-ff / --squash <branch>", "Always create a merge commit / squash everything into one staged change"],
      ["git merge --abort", "Give up a conflicted merge and go back", "safe"],
      ["git rebase <base>", "Replay your commits on top of base (linear history)", "risk"],
      ["git rebase -i HEAD~n", "Reorder, squash, reword or drop your last n commits", "risk"],
      ["git rebase --continue / --abort", "After fixing a conflict / give up the rebase"],
      ["git cherry-pick <sha>", "Copy one commit onto the current branch"],
    ]],
    ["🔄", "Remotes", [
      ["git remote -v", "List remotes and their URLs", "safe"],
      ["git remote add <name> <url>", "Add a remote (e.g. upstream for a fork)"],
      ["git fetch [--prune]", "Download new commits, update origin/*; never touches your files", "safe"],
      ["git pull", "fetch + merge the upstream branch into the current one"],
      ["git pull --rebase", "fetch + rebase your local commits on top"],
      ["git push", "Send your commits to the upstream branch"],
      ["git push -u origin <branch>", "First push of a branch, and remember it as upstream"],
      ["git push --force-with-lease", "Overwrite the remote branch only if nobody pushed meanwhile", "risk"],
      ["git push --force", "Overwrite the remote branch unconditionally: can delete others' work", "risk"],
      ["git push origin --delete <branch>", "Delete a branch on the remote", "risk"],
    ]],
    ["⏪", "Undo", [
      ["git restore <file>", "Discard unstaged edits to a file (they are lost)", "risk"],
      ["git restore --staged <file>", "Unstage, keep your edits", "safe"],
      ["git restore --source=<sha> <file>", "Bring a file back as it was in an older commit"],
      ["git reset --soft HEAD~1", "Uncommit, keep changes staged", "risk"],
      ["git reset HEAD~1", "Uncommit and unstage (--mixed), keep files", "risk"],
      ["git reset --hard <sha>", "Move the branch and overwrite staging + files: uncommitted work is lost", "risk"],
      ["git revert <sha>", "New commit that undoes an old one: safe on shared branches", "safe"],
      ["git reflog", "Every position HEAD had: find 'lost' commits", "safe"],
      ["git clean -n / -fd", "Preview / delete untracked files and folders", "risk"],
    ]],
    ["👝", "Stash", [
      ["git stash [push -m \"msg\"]", "Put uncommitted changes aside, clean the working tree"],
      ["git stash -u", "Include untracked files"],
      ["git stash list", "Show stashes", "safe"],
      ["git stash pop / apply", "Re-apply the latest stash (pop also drops it)"],
      ["git stash drop / clear", "Delete one stash / all stashes", "risk"],
    ]],
    ["🏷️", "Tags & releases", [
      ["git tag -a v1.4.0 -m \"msg\"", "Create an annotated tag on HEAD"],
      ["git tag -l \"v1.*\"", "List tags matching a pattern", "safe"],
      ["git push origin v1.4.0 / --follow-tags", "Push one tag / commits with their annotated tags"],
      ["git describe --tags", "Nearest tag + commits since (e.g. v1.4.0-3-g4b9e211)", "safe"],
      ["git tag -d v1.4.0", "Delete a local tag", "risk"],
    ]],
    ["🦊", "GitLab specifics", [
      ["git push -o merge_request.create -o merge_request.target=main", "Push and open an MR in one command"],
      ["git push -o ci.skip", "Push without triggering a pipeline (or [skip ci] in the commit message)"],
      ["git push -o ci.variable=\"DEPLOY=true\"", "Pass a CI variable to the pipeline created by this push"],
      ["glab mr create --fill --draft", "Create a draft MR from the current branch (GitLab CLI)"],
      ["glab mr checkout 87", "Fetch and switch to the branch of MR !87"],
      ["glab ci status / glab ci view", "Pipeline status of the current branch / interactive view", "safe"],
      ["glab ci lint", "Validate .gitlab-ci.yml with the GitLab API", "safe"],
    ]],
  ];

  const q = document.getElementById("cs-q"), count = document.getElementById("cs-count");
  const hl = (s, words) => {
    let out = esc(s);
    words.forEach(w => { if (w) out = out.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>"); });
    return out;
  };
  function render() {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0, total = 0;
    list.innerHTML = DATA.map(([icon, title, rows]) => {
      total += rows.length;
      const hit = rows.filter(([c, d]) => words.every(w => (title + " " + c + " " + d).toLowerCase().includes(w)));
      n += hit.length;
      if (!hit.length) return "";
      return `<div class="cs-group"><h3>${icon} ${title}</h3><div class="card" style="padding:4px 6px">${hit.map(([c, d, f]) =>
        `<div class="cs-row"><div><code>${hl(c, words)}</code></div><div class="d">${hl(d, words)}${f === "risk" ? '<span class="risk">rewrites</span>' : f === "safe" ? '<span class="safe">safe</span>' : ""}</div></div>`).join("")}</div></div>`;
    }).join("") || '<p class="muted">No command matches.</p>';
    count.textContent = words.length ? `${n} of ${total} commands` : `${total} commands`;
  }
  q.addEventListener("input", render);
  render();
})();
