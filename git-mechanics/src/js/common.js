// ---------- theme toggle ----------
(function () {
  const btn = document.getElementById("theme-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("git-mechanics-theme", next); } catch (e) { /* ignore */ }
  });
})();

// keep the current page's nav link visible when the nav scrolls sideways
(function () {
  const nav = document.querySelector(".nav"), on = nav && nav.querySelector("a.on");
  if (on) nav.scrollLeft += on.getBoundingClientRect().left - nav.getBoundingClientRect().left - (nav.clientWidth - on.offsetWidth) / 2;
})();

// ---------- scroll progress + reveal ----------
(function () {
  const bar = document.getElementById("progress");
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll("main h2, main .card, main .diagram, main .callout, main .flag, main .where, main .sim")
    .forEach(el => { if (!el.closest(".hero")) { el.classList.add("reveal"); io.observe(el); } });
})();

// ---------- small helpers ----------
function $(sel, root = document) { return root.querySelector(sel); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
const SVGNS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs = {}) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Deterministic fake SHAs: reset GIT_SEQ to replay the same ids.
let GIT_SEQ = 0;
function nextSha() {
  GIT_SEQ++;
  return ((GIT_SEQ * 2654435761 + 0x5bd1e995) >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

// Build a segmented control. options: [{value, label, disabled, title}]
function segmented(container, options, value, onChange) {
  container.innerHTML = "";
  container.classList.add("seg");
  options.forEach(o => {
    const b = document.createElement("button");
    b.textContent = o.label; b.dataset.value = o.value;
    if (o.title) b.title = o.title;
    b.disabled = !!o.disabled;
    b.classList.toggle("on", o.value === value);
    b.addEventListener("click", () => {
      container.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      onChange(o.value);
    });
    container.appendChild(b);
  });
}

// FLIP animation for HTML: elements carrying data-key keep their identity across a re-render
// and glide from their old position to the new one. A new element with data-from="<key>" flies
// out of the element that had that key before (e.g. a commit copied to the remote); data-from may
// list several candidate keys separated by spaces, the first one present before the render wins.
function flipRender(root, render) {
  const before = {};
  root.querySelectorAll("[data-key]").forEach(el => { before[el.dataset.key] = el.getBoundingClientRect(); });
  render();
  if (REDUCED) return;
  root.querySelectorAll("[data-key]").forEach(el => {
    const from = (el.dataset.from || "").split(" ").find(k => before[k]);
    const old = before[el.dataset.key] || (from && before[from]);
    if (!old) { el.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" }); return; }
    const now = el.getBoundingClientRect();
    const dx = old.left - now.left, dy = old.top - now.top;
    if (!dx && !dy) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" });
  });
}

// Fake terminal: print lines with a prompt. lines: [{cmd} | {out, cls}]
function termPrint(el, lines, { clear = false } = {}) {
  if (clear) el.innerHTML = "";
  lines.forEach(l => {
    const d = document.createElement("div");
    if (l.cmd !== undefined) d.innerHTML = `<span class="p">$</span>${esc(l.cmd)}`;
    else { d.className = "o " + (l.cls || ""); d.textContent = l.out; }
    el.appendChild(d);
  });
  el.scrollTop = el.scrollHeight;
}

// Simple step-through player: steps[i] is called with i; buttons get .on/.done
function stepper(btnRow, steps, onStep, { auto = 1800 } = {}) {
  let cur = -1, timer = null;
  const btns = [...btnRow.querySelectorAll("[data-step]")];
  function go(i) {
    cur = Math.max(0, Math.min(steps - 1, i));
    btns.forEach((b, j) => { b.classList.toggle("on", j === cur); b.classList.toggle("done", j < cur); });
    onStep(cur);
  }
  btns.forEach((b, j) => b.addEventListener("click", () => { stop(); go(j); }));
  function stop() { clearInterval(timer); timer = null; }
  function play() {
    stop(); if (cur >= steps - 1) go(0);
    timer = setInterval(() => { if (cur >= steps - 1) stop(); else go(cur + 1); }, auto);
  }
  return { go, play, stop, next: () => go(cur + 1), prev: () => go(cur - 1), get cur() { return cur; }, get playing() { return !!timer; } };
}
