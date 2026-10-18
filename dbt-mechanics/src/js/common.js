// ---------- version switch (shared by every page) ----------
const VER_KEY = "dbt-mechanics-version";
function getVer() { return document.documentElement.dataset.ver; }
function setVer(v) {
  document.documentElement.dataset.ver = v;
  document.querySelectorAll("[data-set-ver]").forEach(b => b.classList.toggle("on", b.dataset.setVer === v));
  try { localStorage.setItem(VER_KEY, v); } catch (e) { /* storage unavailable: fine */ }
  document.dispatchEvent(new CustomEvent("verchange", { detail: v }));
}
document.querySelectorAll("[data-set-ver]").forEach(b => b.addEventListener("click", () => setVer(b.dataset.setVer)));
let savedVer = "both";
try { savedVer = localStorage.getItem(VER_KEY) || "both"; } catch (e) { /* ignore */ }
setVer(savedVer);

// ---------- small helpers ----------
function $(sel, root = document) { return root.querySelector(sel); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

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

// Render rows as a table. cols: [{key, label, cls?, fmt?}], rows carry an optional _cls and _cellCls {key: cls}
function renderTable(el, cols, rows, opts = {}) {
  const head = "<tr>" + cols.map(c => `<th>${esc(c.label)}</th>`).join("") + "</tr>";
  const body = rows.map(r => {
    const tds = cols.map(c => {
      const v = r[c.key];
      const isNull = v === null || v === undefined;
      const cls = [c.cls || "", isNull ? "null" : "", (r._cellCls && r._cellCls[c.key]) || ""].join(" ").trim();
      const shown = isNull ? "null" : (c.fmt ? c.fmt(v, r) : v);
      return `<td class="${cls}">${esc(shown)}</td>`;
    }).join("");
    return `<tr class="${r._cls || ""} ${r._flash ? "flash" : ""}">${tds}</tr>`;
  }).join("");
  el.innerHTML = `<div class="tbl-wrap"><table class="dt">${head}${body || `<tr><td colspan="${cols.length}" class="null">${opts.empty || "(empty)"}</td></tr>`}</table></div>`;
}
