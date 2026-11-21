/* ¡Vamos! — moteur du jeu : progression, répétition espacée, exercices, récompenses. */
(function () {
  'use strict';
  const C = window.VAMOS_CONTENT;
  const ART = window.VAMOS_ART, AV = ART.avatar, CH = ART.CHARS;
  const DAY = 864e5;
  const INT = [0, 1, 3, 7, 16, 35, 90];           // intervalles (jours) par boîte de Leitner
  const KEY = 'vamos-espanol-v1';
  const NEW_CAP = 10;                              // nouveaux éléments max par séance
  const TRAIN = ['lesson', 'review', 'culture', 'bonus'];
  const PERS_ES = ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ellas / ustedes'];
  const PERS_FR = ['je', 'tu', 'il / elle / vous (usted)', 'nous', 'vous (vosotros)', 'ils / elles / vous (ustedes)'];
  const PRAISE = ['¡Muy bien!', '¡Genial!', '¡Perfecto!', '¡Eso es!', '¡Olé!', '¡Estupendo!', '¡Fenomenal!', '¡Bravo!', '¡Exacto!', '¡Qué bien!'];
  const OOPS = ['Casi…', '¡Ay!', 'No exactamente…', '¡Uy!'];
  /* ---------- les répliques de Don Ramón (en espagnol) */
  const SAY = {
    ok: ['¡Muy bien! Nada que añadir.', '¡Eso es! ¿Ves? Ya lo tienes.', 'Impecable. Ni yo lo habría dicho mejor.', '¡Perfecto! Bien visto.', 'Exacto. ¡Así se hace!', '¡Correcto! Seguimos.', '¡Olé! Eso es hablar bien.', 'Muy bien, sigue así.'],
    note: ['Bien… pero ojo con el detalle.', 'Te lo acepto, pero cuidado con la ortografía.', 'Casi perfecto: lee mi comentario.'],
    c3: ['¡{n} seguidas! Vas cogiendo ritmo.', '{n} seguidas, ¡qué racha!', '{n} seguidas… Empiezo a estar orgulloso de ti.'],
    c5: ['¡Increíble! ¡{n} seguidas!', '¡Fenomenal! {n} sin fallos: hablas como un madrileño.', '{n} seguidas… ¡Voy a tener que ponerte ejercicios más difíciles!'],
    c8: ['¡OLÉ, OLÉ Y OLÉ! ¡{n} seguidas!', '¡Madre mía, qué nivel! {n} sin un solo fallo…', '¡{n} seguidas! Saco el jamón para celebrarlo.', '¡Espectacular! Me emociono y todo.'],
    redeem: ['¡Por fin! « {w} » ya no se te resiste.', '¡Ahhh, « {w} »! Sabía que lo conseguirías.', '¡Ya era hora! « {w} » por fin ha entrado.'],
    first: ['No pasa nada, de los errores se aprende.', 'Casi… Mira bien la corrección.', 'Pues no. La próxima vez seguro que sí.', 'No es eso, pero no andabas lejos.', 'Un error lo tiene cualquiera.'],
    again: ['¿Otra vez « {w} »? ¡Concéntrate un poco!', 'Hmm… « {w} » ya lo hemos visto, ¿eh?', 'Segunda vez con « {w} »… Estoy frunciendo el ceño.', '« {w} »… ¡Me estás dando la lata!'],
    angry: ['¡Por Dios! ¡{n} veces que « {w} » se te resiste!', '¡Madre mía! « {w} », ¡¿OTRA VEZ?! ¡Escríbelo cien veces en la pizarra!', '¡Caramba! {n} fallos con « {w} »… ¡Me voy a enfadar!', '¡No puede ser! « {w} », ¡{n} veces! Te quito el café con leche.'],
    streak: ['Tres fallos seguidos… Respira y concéntrate.', '¡Ay, ay, ay! ¿Estás cansado? ¿Un cafecito?', 'Esto se complica… Mira la pista 💡 si hace falta.'],
    dunno: ['Gracias por ser sincero: mejor eso que adivinar.', 'No pasa nada, quédate con la respuesta.'],
  };
  const VISIT = [['¿Te acuerdas de esto?', 'Tu te souviens de ça ?'], ['¡Hola otra vez! Una pregunta…', 'Re-bonjour ! Une question…'], ['¡Cuánto tiempo! A ver…', 'Ça fait longtemps ! Voyons voir…'], ['Pasaba por aquí… ¿y esto?', 'Je passais par là… et ça ?'], ['¡Sorpresa! Un repaso rápido.', 'Surprise ! Une petite révision.']];
  const HOMEV = [['Vamos a repasar.', 'On révise.'], ['¿Te acuerdas?', 'Tu te souviens ?'], ['A ver si te acuerdas…', 'Voyons si tu te souviens…']];
  const RANKS = [[0, 'Turista', 'Touriste'], [60, 'Mochilero', 'Routard'], [200, 'Viajero', 'Voyageur'], [450, 'Explorador', 'Explorateur'], [800, 'Aventurero', 'Aventurier'], [1300, 'Hispanista', 'Hispaniste']];
  const BADGES = [
    { id: 'first', e: '👣', n: 'Primer paso', d: 'Terminer une première séance' },
    { id: 'placement', e: '🧭', n: 'Brújula', d: 'Passer le test de niveau' },
    { id: 'perfect', e: '💯', n: 'Sin errores', d: 'Une séance d’au moins 5 exercices sans faute' },
    { id: 'stamp1', e: '🛂', n: 'Primer sello', d: 'Obtenir un premier tampon de passeport' },
    { id: 'stamp3', e: '🌍', n: 'Trotamundos', d: 'Obtenir les 3 tampons de la démo' },
    { id: 'streak3', e: '🔥', n: 'Racha de 3', d: 'Jouer 3 jours d’affilée' },
    { id: 'streak7', e: '🌶️', n: 'Racha de 7', d: 'Jouer 7 jours d’affilée' },
    { id: 'known50', e: '📗', n: '50 palabras', d: '50 éléments bien ancrés en mémoire' },
    { id: 'known150', e: '📚', n: '150 palabras', d: '150 éléments bien ancrés en mémoire' },
    { id: 'cards5', e: '🃏', n: 'Coleccionista', d: 'Réunir 5 cromos' },
    { id: 'cardsAll', e: '🏆', n: 'Álbum completo', d: 'Réunir tous les cromos, dorés compris' },
    { id: 'review5', e: '🔁', n: 'Fiel al repaso', d: 'Faire 5 séances de révision' },
    { id: 'night', e: '🌙', n: 'Cena a las diez', d: 'Jouer après 22 h, à l’heure du dîner espagnol' },
    { id: 'xp500', e: '⭐', n: 'Quinientos', d: 'Cumuler 500 XP' },
  ];

  /* ============================================================ utilitaires */
  const $ = (s) => document.querySelector(s);
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stripAcc = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const norm = (s) => String(s).normalize('NFC').toLowerCase().replace(/[’‘`´ʼ]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const slug = (s) => stripAcc(String(s)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const toks = (s) => s.replace(/[¿?¡!.,;:…«»"]/g, ' ').split(/\s+/).filter(Boolean);
  const asArr = (v) => (Array.isArray(v) ? v : [v]);
  const dayStr = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const today = () => dayStr(Date.now());
  const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j), pp = prev;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1); // inversion de 2 lettres
      }
      pp = prev; prev = cur;
    }
    return prev[n];
  }

  /* ---------- nombres */
  const UNITS_N = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const TENS = { 30: 'treinta', 40: 'cuarenta', 50: 'cincuenta', 60: 'sesenta', 70: 'setenta', 80: 'ochenta', 90: 'noventa' };
  function numEs(n) { if (n < 30) return UNITS_N[n]; if (n === 100) return 'cien'; const t = Math.floor(n / 10) * 10, u = n % 10; return TENS[t] + (u ? ' y ' + UNITS_N[u] : ''); }
  // devant un nom masculin : uno → un, veintiuno → veintiún
  function numNoun(n) { return numEs(n).replace(/^uno$/, 'un').replace(/veintiuno$/, 'veintiún').replace(/ y uno$/, ' y un'); }
  function numDistract(n, k) {
    const sw = (n % 10) * 10 + Math.floor(n / 10);
    const c = [n + 1, n - 1, n + 10, n - 10, sw, n + 2, n - 2, n + 20, n - 20, n + 11];
    const out = [];
    for (const x of shuffle(c.slice(0, 6)).concat(c.slice(6))) { if (x >= 0 && x <= 100 && x !== n && !out.includes(x)) out.push(x); if (out.length >= k) break; }
    return out;
  }

  /* ============================================================ état */
  function blank() {
    return { v: 1, started: false, xp: 0, streak: 0, lastDay: null, day: { d: null, xp: 0 }, goal: 30, items: {}, levels: {}, units: {}, cards: {}, badges: {}, placement: null, sessions: 0, reviews: 0, acc: [] };
  }
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && o.v === 1) return Object.assign(blank(), o); } catch (e) { /* stockage indisponible */ } return blank(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage indisponible */ } }
  let S = load();
  const lv = (id) => S.levels[id] || (S.levels[id] = { ok: 0, tot: 0 });
  const un = (id) => S.units[id] || (S.units[id] = {});

  /* ============================================================ index du contenu */
  const ITEMS = {}, LEVELS = {}, UNITS = C.units, CARDS = {};
  UNITS.forEach((u, ui) => {
    u.ui = ui;
    u.levels.forEach((l, li) => {
      l.unit = u; l.li = li; LEVELS[l.id] = l;
      (l.items || []).forEach((it) => {
        const base = l.id + '.' + it.k + '.' + slug(it.es || it.s || it.npc || it.verb || (it.min + '-' + it.max));
        let id = base, k = 2; while (ITEMS[id]) id = base + '-' + k++;
        it.id = id; it.level = l; it.unit = u; ITEMS[id] = it;
      });
      if (l.reading) { const r = l.reading; r.k = 'r'; r.id = l.id + '.r'; r.level = l; r.unit = u; ITEMS[r.id] = r; }
    });
  });
  C.cards.forEach((c) => { c.k = 'card'; c.unit = UNITS.find((u) => u.id === c.u); CARDS[c.id] = c; ITEMS[c.id] = c; });
  const ALLW = Object.values(ITEMS).filter((i) => i.k === 'w');
  const unitItems = (u) => u.levels.flatMap((l) => l.items || []);

  /* ============================================================ progression */
  const seen = (id) => !!(S.items[id] && S.items[id].n);
  const isDue = (id) => { const s = S.items[id]; return !!(s && s.n && s.due <= Date.now()); };
  const dueIds = () => Object.keys(S.items).filter((id) => ITEMS[id] && isDue(id)).sort((a, b) => S.items[a].due - S.items[b].due);
  const nextDue = (ids) => { let m = Infinity; (ids || Object.keys(S.items)).forEach((id) => { const s = S.items[id]; if (ITEMS[id] && s && s.n && s.due > Date.now() && s.due < m) m = s.due; }); return m === Infinity ? null : m; };
  const seenCount = (l) => l.items.filter((it) => seen(it.id)).length;
  const levelComplete = (l) => !!(S.levels[l.id] && (S.levels[l.id].done || S.levels[l.id].tested));
  const unitComplete = (u) => { const b = u.levels[u.levels.length - 1]; return !!((S.levels[b.id] && S.levels[b.id].done) || (S.units[u.id] && S.units[u.id].tested)); };
  const unitOpen = (ui) => ui === 0 || unitComplete(UNITS[ui - 1]) || !!(S.units[UNITS[ui].id] && S.units[UNITS[ui].id].tested);
  const levelOpen = (l) => unitOpen(l.unit.ui) && (l.li === 0 || levelComplete(l.unit.levels[l.li - 1]) || !!(S.units[l.unit.id] && S.units[l.unit.id].tested));
  const levelItemIds = (l) => (l.type === 'culture' ? l.cards.concat(l.reading ? [l.reading.id] : []) : (l.items || []).map((i) => i.id));
  const starsOf = (acc) => (acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : 1);
  const adaptiveHard = () => S.acc.length >= 3 && S.acc.slice(-3).reduce((a, b) => a + b, 0) / 3 >= 0.9;
  const knownCount = () => Object.keys(S.items).filter((id) => ITEMS[id] && ITEMS[id].k !== 'card' && ITEMS[id].k !== 'r' && S.items[id].box >= 2 && S.items[id].ok > 0).length;
  const streakNow = () => { const y = dayStr(Date.now() - DAY); return S.lastDay === today() || S.lastDay === y ? S.streak : 0; };
  const dayXp = () => (S.day.d === today() ? S.day.xp : 0);
  function rankOf(xp) { let r = RANKS[0], nx = null; for (let i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i][0]) { r = RANKS[i]; nx = RANKS[i + 1] || null; } } return { r, nx }; }
  function addXP(n) { S.xp += n; if (S.day.d !== today()) S.day = { d: today(), xp: 0 }; S.day.xp += n; }
  function bumpStreak() { const t = today(); if (S.lastDay === t) return; S.streak = S.lastDay === dayStr(Date.now() - DAY) ? S.streak + 1 : 1; S.lastDay = t; }

  /* ---------- répétition espacée */
  function srs(id, ok, fmt, mode, qkey) {
    const s = S.items[id] || (S.items[id] = { box: 0, n: 0, ok: 0, ko: 0 });
    const now = Date.now();
    s.n++; s.last = now; s.f = fmt; if (qkey !== undefined && qkey !== null) s.q = qkey;
    if (mode === 'bonus') { if (ok) s.ok++; else { s.ko++; s.box = 1; s.due = now; } return; }
    if (ok && ITEMS[id] && ITEMS[id].b && s.n === 1) { s.ok++; s.box = 6; s.due = now + 3650 * DAY; return; }
    if (ok) {
      s.ok++;
      const productive = /type|write/.test(fmt) || fmt === 'conj_type' || fmt === 'gap_type';
      s.box = Math.min(6, s.box + (productive && s.box >= 1 ? 2 : 1));
      s.due = now + INT[s.box] * DAY - 4 * 3600e3;
    } else { s.ko++; s.box = 1; s.due = now; }
  }
  // éléments déjà connus (test réussi) : ancrés, à vérifier légèrement plus tard, étalés dans le temps
  function markKnown(ids) {
    const now = Date.now();
    ids.forEach((id) => { const s = S.items[id] || (S.items[id] = { box: 0, n: 0, ok: 0, ko: 0 }); if (s.box < 2) { s.box = 2; s.n = Math.max(1, s.n); s.due = now + (2 + rnd(8)) * DAY; s.last = now; } });
  }
  function markLevelTested(l) { lv(l.id).tested = true; markKnown(l.items.map((i) => i.id)); }
  function markUnitTested(u) { un(u.id).tested = true; u.levels.filter((l) => l.type === 'lesson').forEach(markLevelTested); }

  /* ============================================================ construction des exercices */
  // B1 par défaut : production d'emblée (du français vers l'espagnol)
  const LAD = {
    w: [['mcq_fr2es'], ['type_fr2es', 'mcq_fr2es'], ['type_fr2es', 'mcq_fr2es']],
    p: [['tiles_fr2es'], ['type_fr2es', 'tiles_fr2es'], ['type_fr2es', 'tiles_fr2es']],
    t: [['tiles_fr2es'], ['type_fr2es', 'tiles_fr2es'], ['type_fr2es', 'tiles_fr2es']],
    g: [['gap_mcq'], ['gap_type', 'gap_mcq'], ['gap_type', 'gap_mcq']],
    c: [['conj_mcq'], ['conj_type', 'conj_mcq'], ['conj_type']],
    n: [['num_read'], ['num_write', 'num_read'], ['num_write', 'num_read']],
    d: [['dialog'], ['dialog'], ['dialog']],
    card: [['card_q'], ['card_q'], ['card_q']],
    r: [['read_q'], ['read_q'], ['read_q']],
  };
  // les bases (b) : une seule fois, en reconnaissance rapide
  const BASIC_FMT = { w: 'mcq_es2fr', p: 'tiles_es2fr', t: 'tiles_es2fr', g: 'gap_mcq', c: 'conj_mcq', n: 'num_mcq', d: 'dialog' };
  const retired = (id) => !!(ITEMS[id] && ITEMS[id].b && S.items[id] && S.items[id].box >= 6);
  function pickFmt(it, mode) {
    const s = S.items[it.id];
    if (it.b && (!s || !s.n) && mode !== 'hard') return BASIC_FMT[it.k];
    let l = !s || !s.n ? 0 : s.box <= 1 ? 1 : 2;
    let c;
    if (mode === 'hard') l = 2;
    else if (mode === 'easy') c = [...new Set(LAD[it.k][0].concat(LAD[it.k][1]))]; // rattrapage : sous une autre forme
    else if (l === 1 && adaptiveHard()) l = 2;
    c = c || LAD[it.k][l];
    if (c.length > 1 && s && s.f) { const f = c.filter((x) => x !== s.f); if (f.length) c = f; }
    return pick(c);
  }
  function distract(it, field, n) {
    const lvl = (it.level.items || []).filter((x) => x.k === 'w' && x !== it);
    const unit = unitItems(it.unit).filter((x) => x.k === 'w' && x.level !== it.level);
    const all = ALLW.filter((x) => x.unit !== it.unit);
    const out = [], used = new Set([norm(it[field])]);
    for (const x of shuffle(lvl).concat(shuffle(unit), shuffle(all))) {
      const v = x[field], nv = norm(v); if (used.has(nv)) continue; used.add(nv); out.push(v); if (out.length >= n) break;
    }
    return out;
  }
  function tileDistract(target, lang, it, n) {
    const tset = new Set(toks(target).map(norm));
    const out = [];
    const pool = shuffle(unitItems(it.unit).filter((x) => (x.k === 'p' || x.k === 'w') && x !== it)).flatMap((x) => toks(x[lang]));
    for (const w of pool) { const nw = norm(w); if (tset.has(nw)) continue; tset.add(nw); out.push(w); if (out.length >= n) break; }
    return out;
  }
  // gabarit → une combinaison différente de la précédente
  function genT(it, avoid) {
    const keys = Object.keys(it.slots);
    let ch, key, tries = 0;
    do {
      ch = {};
      keys.forEach((k) => {
        const sl = it.slots[k];
        if (sl.num) { const n = sl.num[0] + rnd(sl.num[1] - sl.num[0] + 1); ch[k] = { es: [numNoun(n)], fr: [String(n)] }; }
        else { const v = pick(sl); ch[k] = { es: asArr(v[0]), fr: asArr(v[1]) }; }
      });
      key = keys.map((k) => ch[k].es[0]).join('|');
    } while (key === avoid && ++tries < 8);
    const fill = (tpl, lang, alt) => cap(tpl.replace(/\{(\w+)\}/g, (m, k) => (alt && alt.k === k ? alt.v : ch[k][lang][0])));
    const r = { es: fill(it.es, 'es'), fr: fill(it.fr, 'fr'), esAlts: [], frAlts: [], key };
    keys.forEach((k) => {
      ch[k].es.slice(1).forEach((v) => r.esAlts.push(fill(it.es, 'es', { k, v })));
      ch[k].fr.slice(1).forEach((v) => r.frAlts.push(fill(it.fr, 'fr', { k, v })));
    });
    return r;
  }
  const phrase = (it, s) => (it.k === 't' ? genT(it, s.q) : { es: it.es, fr: it.fr, esAlts: it.alt || [], frAlts: it.frAlt || [], key: null });
  const hint = (it) => (it.h ? `<div class="hint">💡 ${esc(it.h)}</div>` : '');
  const qfr = (q) => (q.fr ? `<details class="qfr"><summary>FR</summary>${esc(q.fr)}</details>` : '');
  function pickQ(n, last, not) {
    let c = []; for (let i = 0; i < n; i++) if (i !== last && !(not && not.has(i))) c.push(i);
    if (!c.length) for (let i = 0; i < n; i++) if (!(not && not.has(i))) c.push(i);
    return c.length ? pick(c) : rnd(n);
  }
  function dialogHTML(ctx, npc, fr, showFr, who) {
    const c = CH[who] || CH.prof;
    return `${ctx ? `<div class="ctx">${esc(ctx)}</div>` : ''}<div class="bubble"><span class="npc">${AV(who, 'happy', 78)}<small>${esc(c.name)}</small></span><div class="bt"><div class="es">${esc(npc)}</div>` +
      (showFr ? `<div class="tr">${esc(fr)}</div>` : `<div class="tr hid">${esc(fr)}</div><button type="button" class="trbtn" data-act="tr">👁 traduction</button>`) + '</div></div>';
  }
  const info = (label, html, btn) => ({ kind: 'info', label, html, btn: btn || 'Continuer', ids: [] });

  function build(it, fmt, o) {
    o = o || {};
    const s = S.items[it.id] || {};
    const isNew = !s.n;
    const ex = { fmt, ids: [it.id] };
    const emo = it.e ? `<span class="emo">${it.e}</span>` : '';
    switch (fmt) {
      case 'mcq_es2fr':
        return Object.assign(ex, { kind: 'choice', label: it.b && isNew ? 'Échauffement' : 'Que signifie… ?', prompt: `<div class="big es">${isNew ? emo : ''}${esc(it.es)}</div>`, options: shuffle([it.fr].concat(distract(it, 'fr', 3))), answer: it.fr, x: it.x });
      case 'mcq_fr2es':
        return Object.assign(ex, { kind: 'choice', label: isNew ? 'Nouveau · comment dit-on… ?' : 'Comment dit-on… ?', prompt: `<div class="big">${emo}${esc(it.fr)}</div>`, options: shuffle([it.es].concat(distract(it, 'es', 3))), answer: it.es, x: it.x, esOpts: true });
      case 'type_fr2es': {
        if (it.k === 'w') return Object.assign(ex, { kind: 'type', label: 'Écris en espagnol', prompt: `<div class="big">${emo}${esc(it.fr)}</div>`, accept: [it.es].concat(it.alt || []), sol: it.es, word: true, x: it.x });
        const t = phrase(it, s);
        return Object.assign(ex, { kind: 'type', label: 'Traduis en espagnol', prompt: `<div class="big">${esc(t.fr)}</div>`, accept: [t.es].concat(t.esAlts), sol: t.es, qkey: t.key });
      }
      case 'tiles_es2fr': {
        const t = phrase(it, s);
        return Object.assign(ex, { kind: 'tiles', label: it.b && isNew ? 'Échauffement · traduis' : 'Traduis en français', prompt: `<div class="big es">${esc(t.es)}</div>${hint(it)}`, bank: shuffle(toks(t.fr).concat(tileDistract(t.fr, 'fr', it, 3))), accept: [t.fr].concat(t.frAlts), sol: t.fr, qkey: t.key });
      }
      case 'tiles_fr2es': {
        const t = phrase(it, s);
        return Object.assign(ex, { kind: 'tiles', label: 'Traduis en espagnol', prompt: `<div class="big">${esc(t.fr)}</div>`, bank: shuffle(toks(t.es).concat(tileDistract(t.es, 'es', it, 3))), accept: [t.es].concat(t.esAlts), sol: t.es, qkey: t.key, esTiles: true });
      }
      case 'gap_mcq':
        return Object.assign(ex, { kind: 'choice', label: 'Complète', prompt: `<div class="big es">${esc(it.s).replace('___', '<span class="blank">____</span>')}${it.h ? ` <span class="muted">${esc(it.h)}</span>` : ''}</div>`, sub: it.fr, options: shuffle([it.a].concat(it.o)), answer: it.a, x: it.x, esOpts: true });
      case 'gap_type': {
        const [b, a] = it.s.split('___');
        return Object.assign(ex, { kind: 'type', label: 'Complète (au clavier)', inline: true, prompt: `<div class="big es gapline">${esc(b)}<input id="ans" class="inl" autocomplete="off" autocapitalize="off" spellcheck="false" size="${Math.max(4, it.a.length + 1)}">${esc(a)}${it.h ? ` <span class="muted">${esc(it.h)}</span>` : ''}</div>`, sub: it.fr, accept: [it.a].concat(it.alt || []), sol: it.a, x: it.x, strict: true });
      }
      case 'conj_mcq': case 'conj_type': {
        const V = C.verbs[it.verb];
        let p = rnd(6); if (p === s.q) p = (p + 1 + rnd(5)) % 6;
        const prompt = `<div class="conj"><b class="es">${esc(it.verb)}</b> <span class="muted">(${esc(V.fr)})</span></div><div class="big es">${PERS_ES[p]} <span class="blank">…</span></div>`;
        if (fmt === 'conj_mcq') {
          const others = shuffle([...new Set(V.f.filter((f) => f !== V.f[p]))]).slice(0, 3);
          return Object.assign(ex, { kind: 'choice', label: 'Conjugue au présent', prompt, sub: PERS_FR[p], options: shuffle([V.f[p]].concat(others)), answer: V.f[p], qkey: p, esOpts: true });
        }
        return Object.assign(ex, { kind: 'type', label: 'Conjugue au présent (au clavier)', prompt, sub: PERS_FR[p], accept: [V.f[p]], sol: V.f[p], qkey: p, strict: true });
      }
      case 'num_mcq': case 'num_read': case 'num_write': {
        let n = it.min + rnd(it.max - it.min + 1); if (n === s.q && it.max > it.min) n = n === it.max ? it.min : n + 1;
        if (fmt === 'num_mcq') return Object.assign(ex, { kind: 'choice', label: 'Ce nombre en espagnol ?', prompt: `<div class="big num">${n}</div>`, options: shuffle([numEs(n)].concat(numDistract(n, 3).map(numEs))), answer: numEs(n), qkey: n, esOpts: true });
        if (fmt === 'num_read') return Object.assign(ex, { kind: 'type', label: 'Écris ce nombre en chiffres', prompt: `<div class="big es">${numEs(n)}</div>`, accept: [String(n)], sol: String(n), numeric: true, qkey: n });
        return Object.assign(ex, { kind: 'type', label: 'Écris ce nombre en lettres', prompt: `<div class="big num">${n}</div>`, accept: [numEs(n)], sol: numEs(n), qkey: n });
      }
      case 'dialog':
        return Object.assign(ex, { kind: 'choice', label: 'Que réponds-tu ?', prompt: dialogHTML(it.ctx, it.npc, it.fr, false, it.who || it.unit.guide), options: shuffle([it.a].concat(it.o)), answer: it.a, x: it.x, esOpts: true, long: true });
      case 'card_q': {
        const qi = pickQ(it.qs.length, s.q, o.not); const q = it.qs[qi];
        return Object.assign(ex, {
          kind: 'choice', label: 'Cultura', qkey: qi, long: true, x: q.x, esOpts: true,
          prompt: `<div class="cardmini" style="--uc:${it.unit.color}">${it.e} ${esc(it.name)}</div><div class="q es">${q.tf ? '¿Verdadero o falso?<br>« ' + esc(q.tf) + ' »' : esc(q.q)}</div>${qfr(q)}`,
          options: q.tf ? ['Verdadero', 'Falso'] : shuffle([q.a].concat(q.o)), answer: q.tf ? (q.v ? 'Verdadero' : 'Falso') : q.a,
        });
      }
      case 'read_q': {
        const qi = pickQ(it.qs.length, s.q, o.not); const q = it.qs[qi];
        return Object.assign(ex, {
          kind: 'choice', label: 'Lectura', qkey: qi, long: true, esOpts: true,
          prompt: `<div class="reading"><div class="rtitle">📖 ${esc(it.title)}</div><p class="es">${esc(it.text)}</p><details><summary>Voir la traduction</summary><p class="muted">${esc(it.fr)}</p></details></div><div class="q es">${esc(q.q)}</div>${qfr(q)}`,
          options: shuffle([q.a].concat(q.o)), answer: q.a,
        });
      }
    }
    throw new Error('format inconnu ' + fmt);
  }
  const buildAuto = (it, mode) => build(it, pickFmt(it, mode));
  function buildMatch(items, cons, basic) {
    return { kind: 'match', fmt: 'match', cons, label: basic ? 'Échauffement · associe les paires' : cons ? 'Associe les paires' : 'Associe les paires (révision)', ids: cons ? [] : items.map((i) => i.id), pairs: items.map((i) => ({ id: i.id, es: i.es, fr: i.fr })) };
  }
  function cardInfo(c) { return info(c.gold ? 'Cromo dorado' : 'Nouveau cromo · lis l’espagnol, le français est à côté', `<div class="cromo big-cromo ${c.gold ? 'gold' : ''}" style="--uc:${c.unit.color}">${cromoInner(c, true)}</div>`, 'J’ai lu, continuer'); }
  const bil = (es, fr) => `<div class="bil"><div class="bes"><span class="lang">ES</span>${es}</div><div class="bfr"><span class="lang">FR</span>${fr}</div></div>`;
  function readingInfo(r) { return info('Lecture en espagnol', `<div class="readbox"><h3 class="es">📖 ${esc(r.title)}</h3>${bil(esc(r.text), esc(r.fr))}<p class="muted small">Lis d’abord l’espagnol ; jette un œil au français seulement si tu bloques. Des questions suivent.</p></div>`, 'J’ai lu, continuer'); }
  function tipInfo(l) { return info('💡 Pista', `<div class="tip">${l.tip}</div>`, 'Compris, on y va !'); }

  function buildStep(st0, boss) {
    const st = st0.v ? pick(st0.v) : st0;
    const av = boss.npc || boss.unit.guide;
    if (st.say) return { kind: 'type', label: 'À toi de parler', prompt: `<div class="q">${esc(st.say)}</div>`, accept: st.acc, sol: st.sol, x: st.x, ids: [], lenient: st.lenient };
    if (st.num) {
      const n = st.num[0] + rnd(st.num[1] - st.num[0] + 1);
      const f = (x) => (st.fmt || '{d}').replace('{d}', x);
      return { kind: 'choice', label: 'Comprends', long: true, ids: [], prompt: dialogHTML('', st.npc.replace('{n}', st.apoc ? numNoun(n) : numEs(n)), st.fr.replace('{d}', n), false, av) + `<div class="q">${esc(st.q)}</div>`, options: shuffle([f(n)].concat(numDistract(n, 3).map(f))), answer: f(n) };
    }
    if (st.q) return { kind: 'choice', label: 'Comprends', long: true, ids: [], prompt: dialogHTML('', st.npc, st.fr, false, av) + `<div class="q">${esc(st.q)}</div>`, options: shuffle([st.a].concat(st.o)), answer: st.a, x: st.x };
    return { kind: 'choice', label: 'Que réponds-tu ?', long: true, esOpts: true, ids: [], prompt: dialogHTML('', st.npc, st.fr, false, av), options: shuffle([st.a].concat(st.o)), answer: st.a, x: st.x };
  }
  function buildPQ(q) {
    if (q.say) return { kind: 'type', label: 'Test de niveau', prompt: `<div class="q">${esc(q.say)}</div>`, accept: q.acc, sol: q.sol, dunno: true, strict: true, ids: [] };
    return { kind: 'choice', label: 'Test de niveau', prompt: `<div class="q big-q">${esc(q.q)}</div>`, options: shuffle([q.a].concat(q.o)), answer: q.a, dunno: true, ids: [] };
  }

  /* ============================================================ construction des séances */
  function reviewQueue(items, mode) {
    let ws = items.filter((i) => i.k === 'w');
    const q = [];
    if (ws.length >= 4 && Math.random() < 0.6) {
      const grp = shuffle(ws).slice(0, 5);
      q.push(buildMatch(grp, false));
      items = items.filter((i) => !grp.includes(i));
    }
    items.forEach((it) => q.push(buildAuto(it, mode)));
    return shuffle(q);
  }
  function playLesson(l) {
    const unseen = l.items.filter((it) => !seen(it.id));
    if (unseen.length) {
      const ub = unseen.filter((it) => it.b), un = unseen.filter((it) => !it.b);
      const q = [];
      // échauffement : les bases, vues une seule fois, en paires et en QCM rapides
      const bw = ub.filter((it) => it.k === 'w').slice(0, 15), bo = ub.filter((it) => it.k !== 'w').slice(0, 6);
      for (let i = 0; i < bw.length; i += 5) { const g = bw.slice(i, i + 5); if (g.length >= 3) q.push(buildMatch(g, false, true)); else g.forEach((it) => q.push(buildAuto(it))); }
      bo.forEach((it) => q.push(buildAuto(it)));
      // éléments B1 (séances équilibrées, pas de petit reliquat)
      let nNew = un.length <= NEW_CAP + 3 ? un.length : un.length <= 2 * NEW_CAP ? Math.ceil(un.length / 2) : NEW_CAP;
      if (ub.length) nNew = Math.min(nNew, 6);
      const fresh = un.slice(0, nNew);
      const main = fresh.map((it) => buildAuto(it));
      const rev = dueIds().map((id) => ITEMS[id]).filter((it) => it.level !== l && it.k !== 'r').slice(0, 3);
      rev.forEach((it, i) => main.splice(Math.min(main.length, 2 + i * 3), 0, buildAuto(it)));
      const ws = fresh.filter((it) => it.k === 'w');
      if (ws.length >= 4) main.push(buildMatch(shuffle(ws).slice(0, 5), true));
      q.push(...main);
      if (seenCount(l) === 0 && l.tip) q.unshift(tipInfo(l));
      return startSession('lesson', q, { level: l });
    }
    const due = l.items.filter((it) => isDue(it.id));
    if (due.length) return startSession('lesson', reviewQueue(due.slice(0, adaptiveHard() ? 8 : 12)), { level: l, review: true });
    offerBonus(l.items, `Tout est ancré dans « ${l.title} ».`, nextDue(levelItemIds(l)), l);
  }
  function playCulture(l) {
    const L = S.levels[l.id];
    if (!L || !L.done) {
      const cards = l.cards.map((id) => CARDS[id]);
      const q = cards.map(cardInfo);
      q.push(readingInfo(l.reading));
      const qs = cards.map((c) => build(c, 'card_q'));
      const r1 = build(l.reading, 'read_q');
      const r2 = build(l.reading, 'read_q', { not: new Set([r1.qkey]) });
      return startSession('culture', q.concat(shuffle(qs.concat([r1, r2]))), { level: l });
    }
    const due = levelItemIds(l).filter(isDue).map((id) => ITEMS[id]);
    if (due.length) return startSession('culture', due.map((it) => build(it, it.k === 'r' ? 'read_q' : 'card_q')), { level: l, review: true });
    offerBonus(levelItemIds(l).map((id) => ITEMS[id]), 'Tous ces cromos sont bien en mémoire.', nextDue(levelItemIds(l)), l);
  }
  function playBoss(l) { const c = CH[l.npc]; startSession('boss', [info('Desafío', `<div class="bossintro"><div class="bossav">${AV(l.npc, 'happy', 150)}</div><div class="bossname"><b>${esc(c.name)}</b> · ${esc(c.role)}</div><h2 class="es">${esc(l.title)}</h2><p>${l.intro}</p><p class="muted">Astuce : le bouton « 👁 traduction » est gratuit.</p></div>`, '¡Vamos!')].concat(l.steps.map((st) => buildStep(st, l))), { level: l }); }
  function playLevel(l) { closeModal(); if (l.type === 'lesson') playLesson(l); else if (l.type === 'culture') playCulture(l); else playBoss(l); }
  function playReview() {
    const ids = dueIds();
    if (!ids.length) return offerBonus(null, 'Rien à réviser pour l’instant.', nextDue());
    const items = ids.slice(0, adaptiveHard() ? 8 : 12).map((id) => ITEMS[id]);
    const q = items.filter((it) => it.k !== 'card' && it.k !== 'r');
    const cul = items.filter((it) => it.k === 'card' || it.k === 'r').map((it) => build(it, it.k === 'r' ? 'read_q' : 'card_q'));
    startSession('review', shuffle(reviewQueue(q).concat(cul)), {});
  }
  function playBonus(items) {
    closeModal();
    const pool = (items || Object.keys(S.items).filter((id) => ITEMS[id] && seen(id)).map((id) => ITEMS[id])).filter((it) => seen(it.id) && !retired(it.id));
    const pickd = pool.slice().sort((a, b) => (S.items[a.id].last || 0) - (S.items[b.id].last || 0)).slice(0, 8);
    if (!pickd.length) return toast('Joue d’abord quelques niveaux !');
    startSession('bonus', shuffle(pickd).map((it) => build(it, it.k === 'card' ? 'card_q' : it.k === 'r' ? 'read_q' : pickFmt(it, 'hard'))), {});
  }
  function playTestLevel(l) {
    closeModal();
    const q = shuffle(l.items).slice(0, 8).map((it) => buildAuto(it, 'hard'));
    q.forEach((e) => (e.dunno = true));
    startSession('testlevel', [info('Test rapide', `<div class="tip"><h3>Valider « ${esc(l.title)} » sans tout refaire</h3><p>${q.length} questions difficiles, sans aide. Il faut au moins ${Math.ceil(q.length * 0.85)} bonnes réponses.</p><p class="muted">Les éléments réussis ne te seront pas reproposés comme nouveaux.</p></div>`, 'Commencer')].concat(q), { level: l });
  }
  function playJump(ui) {
    const items = UNITS.slice(0, ui).flatMap((u) => u.levels.filter((l) => l.type === 'lesson' && !levelComplete(l)).flatMap((l) => l.items));
    const q = shuffle(items).slice(0, 10).map((it) => buildAuto(it, 'hard'));
    q.forEach((e) => (e.dunno = true));
    if (!q.length) return;
    startSession('jump', [info('Test de passage', `<div class="tip"><h3>Sauter jusqu’à l’unité ${ui + 1}</h3><p>${q.length} questions tirées des unités précédentes. Il faut au moins ${Math.ceil(q.length * 0.8)} bonnes réponses.</p></div>`, 'Commencer')].concat(q), { ui });
  }
  function playPlacement() {
    S.started = true; save();
    const q = shuffle(C.placement.filter((p) => p.t === 1)).map(buildPQ);
    startSession('placement', [info('Test de niveau', '<div class="tip"><h3>🧭 Où en es-tu ?</h3><p>Le test s’adapte : 4 questions par palier, et on monte tant que tu réussis. Environ 5 minutes.</p><p><b>Ne devine pas</b> : le bouton « Je ne sais pas » rend le résultat plus juste.</p><p class="muted">Ce que tu sais déjà sera validé et ne te sera pas répété inutilement.</p></div>', 'Commencer')].concat(q), { tier: 1, okTier: 0, passed: 0 });
  }
  function offerBonus(items, msg, nd, l) {
    openModal(`<div class="mkick">Rien à répéter</div><h2>¡Todo en orden! 🎉</h2><p>${esc(msg)}</p>${nd ? `<p class="muted">Prochaine révision prévue : <b>${fmtDate(nd)}</b>.</p>` : ''}
      <p>Plutôt que de te faire répéter ce que tu sais, voici un <b>défi bonus</b> : les éléments que tu n’as pas vus depuis le plus longtemps, en version difficile (au clavier).</p>
      <div class="mbtns"><button class="btn primary" data-act="bonus" data-v="${l ? l.id : ''}">Défi bonus</button><button class="btn" data-act="close">Plus tard</button></div>`);
  }

  /* ============================================================ déroulement d'une séance */
  let SES = null, RES = null, VIEW = 'path', ALBUM_TAB = 'cromos';
  const V = () => $('#view');
  const cur = () => SES.queue[SES.i];
  function startSession(mode, queue, meta) {
    if (!queue.length) return;
    SES = { mode, queue, i: 0, ok: 0, tot: 0, mist: 0, meta: meta || {}, combo: 0, best: 0, koRun: 0, said: '', mr: {} };
    SES.here = SES.meta.level ? SES.meta.level.unit : posUnit();
    resetEx(); go('session');
  }
  // la ville où l'on se trouve : la plus avancée des étapes ouvertes
  function posUnit() { let u = UNITS[0]; UNITS.forEach((x, i) => { if (unitOpen(i)) u = x; }); return u; }
  function sayPick(list, vars) {
    let c = list.filter((t) => t !== SES.said); if (!c.length) c = list;
    const t = pick(c); SES.said = t;
    return t.replace(/\{(\w)\}/g, (m, k) => esc(vars && vars[k] != null ? vars[k] : ''));
  }
  const shortName = (it) => (it.k === 'c' ? 'conjuguer ' + it.verb : it.k === 'n' ? 'les nombres' : it.k === 'card' ? it.name : it.k === 'r' ? it.title : it.es || it.s || it.npc || '');
  // humeur et réplique de Don Ramón après une réponse
  function react(ex, r) {
    const id = ex.ids && ex.ids.length === 1 ? ex.ids[0] : null;
    const w = id && ITEMS[id] ? shortName(ITEMS[id]) : '';
    if (r.ok) {
      SES.combo++; SES.best = Math.max(SES.best, SES.combo); SES.koRun = 0;
      const n = SES.combo;
      if (r.redeem >= 2 && w) return { mood: 'joy', text: sayPick(SAY.redeem, { w }) };
      if (n >= 8) return { mood: 'joy', text: sayPick(SAY.c8, { n }), party: n % 4 === 0 };
      if (n >= 5) return { mood: 'joy', text: sayPick(SAY.c5, { n }), party: n === 5 };
      if (n >= 3) return { mood: 'happy', text: sayPick(SAY.c3, { n }) };
      if (r.note) return { mood: 'happy', text: sayPick(SAY.note) };
      return { mood: 'happy', text: sayPick(SAY.ok) };
    }
    SES.combo = 0; SES.koRun++;
    if (r.dunno) return { mood: 'neutral', text: sayPick(SAY.dunno) };
    const miss = r.miss || 1;
    if (miss >= 3 && w) return { mood: 'angry', text: sayPick(SAY.angry, { n: miss, w }), shake: true };
    if (miss === 2 && w) return { mood: 'annoyed', text: sayPick(SAY.again, { w }) };
    if (SES.koRun >= 3) return { mood: 'sad', text: sayPick(SAY.streak) };
    return { mood: 'sad', text: sayPick(SAY.first) };
  }
  // qui pose la question : l'habitant de la ville d'origine de l'élément, éventuellement « de passage »
  function whoChip(ex) {
    if (!ex.ids || ex.ids.length !== 1 || !TRAIN.includes(SES.mode)) return '';
    const it = ITEMS[ex.ids[0]]; if (!it || !it.unit || it.k === 'd') return '';
    const u = it.unit, here = SES.here, c = CH[u.guide];
    if (u === here && !['review', 'bonus'].includes(SES.mode) && !ex.retry) return '';
    if (!ex._line) ex._line = pick(u === here ? HOMEV : VISIT);
    const lead = u === here ? `<b>${esc(c.name)}</b> te fait réviser` : `<b>${esc(c.name)}</b> <span class="muted">(${esc(c.role)})</span>, de passage à ${esc(here.cityFr)} depuis ${esc(u.cityFr)}`;
    return `<div class="visit ${u === here ? 'home' : ''}" style="--uc:${u.color}">${AV(u.guide, 'happy', 54)}<div><div>${lead} :</div><div class="es vline">« ${esc(ex._line[0])} »</div><div class="muted small">${esc(ex._line[1])}</div></div></div>`;
  }
  function confetti(n) {
    const box = document.createElement('div'); box.className = 'confetti';
    const col = ['#c8102e', '#f1bf00', '#2f8f46', '#1f6fb2', '#e76f51', '#ffffff'];
    for (let i = 0; i < (n || 70); i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = pick(col); s.style.animationDelay = Math.random() * 0.6 + 's'; s.style.animationDuration = 1.8 + Math.random() * 1.6 + 's'; s.style.transform = `rotate(${rnd(360)}deg)`; box.appendChild(s); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
  }
  function resetEx() { SES.sel = null; SES.pick = []; SES.fb = null; SES.react = null; SES.m = { l: null, r: null, done: new Set(), err: new Set(), bad: null }; }

  function renderSession() {
    const ex = cur();
    const pct = Math.round((SES.i / SES.queue.length) * 100);
    const lvlTip = SES.meta.level && SES.meta.level.tip && ['lesson', 'testlevel'].includes(SES.mode);
    V().innerHTML = `<div class="ses">
      <div class="ses-top"><button class="icon" data-act="quit" title="Quitter">✕</button><div class="bar ${SES.combo >= 3 ? 'hot' : ''}"><i style="width:${pct}%"></i></div>${SES.combo >= 2 ? `<span class="combo" title="Bonnes réponses d’affilée">🔥 ${SES.combo}</span>` : ''}${lvlTip ? '<button class="icon" data-act="tip" title="Pista (grammaire)">💡</button>' : ''}</div>
      <div class="ex ${ex.kind}">${whoChip(ex)}<div class="label">${esc(ex.label || '')}</div>${ex.kind === 'info' ? ex.html : ex.prompt || ''}${ex.sub ? `<div class="sub">${esc(ex.sub)}</div>` : ''}<div id="area"></div></div>
      <div class="foot" id="foot"></div></div>`;
    renderArea(); renderFoot();
    const inp = $('#ans'); if (inp) { inp.addEventListener('input', renderFoot); setTimeout(() => inp.focus(), 30); }
  }
  function renderArea() {
    const ex = cur(), a = $('#area'); if (!a) return;
    const fb = SES.fb;
    if (ex.kind === 'choice') {
      a.innerHTML = `<div class="opts ${ex.long ? 'long' : ''}">${ex.options.map((o, i) => {
        let c = ''; if (fb) { if (o === ex.answer) c = 'right'; else if (i === SES.sel) c = 'wrong'; else c = 'dim'; } else if (i === SES.sel) c = 'sel';
        return `<button class="opt ${ex.esOpts ? 'es' : ''} ${c}" data-act="opt" data-v="${i}" ${fb ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${esc(o)}</span></button>`;
      }).join('')}</div>`;
    } else if (ex.kind === 'type') {
      if (!ex.inline && !$('#ans')) a.innerHTML = `<input id="ans" class="ans es" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ex.numeric ? 'En chiffres…' : 'Écris ta réponse…'}">`;
      if (!ex.numeric && !$('#acc')) a.insertAdjacentHTML('beforeend', `<div class="accents" id="acc">${['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'].map((c) => `<button type="button" data-act="acc" data-v="${c}" tabindex="-1">${c}</button>`).join('')}</div>`);
      const inp = $('#ans'); if (fb && inp) { inp.disabled = true; inp.classList.add(fb.ok ? 'right' : 'wrong'); }
    } else if (ex.kind === 'tiles') {
      a.innerHTML = `<div class="line ${fb ? (fb.ok ? 'right' : 'wrong') : ''}">${SES.pick.map((bi, k) => `<button class="tile ${ex.esTiles ? 'es' : ''}" data-act="trm" data-v="${k}" ${fb ? 'disabled' : ''}>${esc(ex.bank[bi])}</button>`).join('') || '<span class="ph">Touche les mots dans l’ordre…</span>'}</div>
        <div class="bank">${ex.bank.map((w, i) => { const u = SES.pick.includes(i); return `<button class="tile ${ex.esTiles ? 'es' : ''} ${u ? 'used' : ''}" data-act="tadd" data-v="${i}" ${u || fb ? 'disabled' : ''}>${esc(w)}</button>`; }).join('')}</div>`;
    } else if (ex.kind === 'match') {
      if (!ex._L) { ex._L = shuffle(ex.pairs.map((p, i) => i)); ex._R = shuffle(ex.pairs.map((p, i) => i)); }
      const m = SES.m;
      const cls = (side, i) => (m.done.has(i) ? 'done' : m.bad && m.bad[side] === i ? 'bad' : m[side] === i ? 'sel' : '');
      a.innerHTML = `<div class="pairs">${ex._L.map((li, k) => { const ri = ex._R[k];
        return `<button class="mt es ${cls('l', li)}" data-act="ml" data-v="${li}" ${m.done.has(li) ? 'disabled' : ''}>${esc(ex.pairs[li].es)}</button><button class="mt ${cls('r', ri)}" data-act="mr" data-v="${ri}" ${m.done.has(ri) ? 'disabled' : ''}>${esc(ex.pairs[ri].fr)}</button>`; }).join('')}</div>`;
    }
  }
  function canCheck() {
    const ex = cur();
    if (ex.kind === 'choice') return SES.sel != null;
    if (ex.kind === 'type') { const i = $('#ans'); return !!(i && i.value.trim()); }
    if (ex.kind === 'tiles') return SES.pick.length > 0;
    return false;
  }
  function renderFoot() {
    const ex = cur(), f = $('#foot'); if (!f) return;
    const fb = SES.fb;
    const idle = SES.combo >= 5 ? 'joy' : SES.combo >= 2 ? 'happy' : SES.koRun >= 2 ? 'sad' : 'neutral';
    const prof = (mood, cls) => `<div class="prof ${cls || ''}">${AV('prof', mood, 76)}</div>`;
    if (ex.kind === 'info') { f.className = 'foot'; f.innerHTML = `${prof('happy', 'idle')}<button class="btn primary big" data-act="cont">${esc(ex.btn)}</button>`; return; }
    if (!fb) {
      f.className = 'foot';
      if (ex.kind === 'match') { f.innerHTML = `${prof(idle, 'idle')}<span class="muted">Touche un mot espagnol puis sa traduction.</span>`; return; }
      f.innerHTML = `${prof(idle, 'idle')}${ex.dunno ? '<button class="btn ghost" data-act="dunno">Je ne sais pas</button>' : ''}<button class="btn primary big" data-act="check" ${canCheck() ? '' : 'disabled'}>Vérifier</button>`;
      return;
    }
    const rc = SES.react || { mood: fb.ok ? 'happy' : 'sad', text: '' };
    f.className = 'foot fb ' + (fb.ok ? 'ok' : 'ko') + (rc.mood === 'angry' ? ' angry' : '');
    let h = `${prof(rc.mood, rc.shake ? 'shake' : rc.mood === 'joy' ? 'hop' : '')}<div class="fbtxt"><div class="say">${rc.text || (fb.ok ? pick(PRAISE) : pick(OOPS))}</div>`;
    if (fb.note) h += `<div>${fb.note}</div>`;
    if (!fb.ok && fb.sol) h += `<div>Bonne réponse : <b class="es">${esc(fb.sol)}</b></div>`;
    if (ex.x && (!fb.ok || ex.kind === 'choice')) h += `<div class="xp">${esc(ex.x)}</div>`;
    if (fb.matchErr) h += `<div>${fb.matchErr}</div>`;
    if (!fb.ok && TRAIN.includes(SES.mode) && !ex.retry && ex.ids.length) h += '<div class="muted">Il reviendra aussi en fin de séance, sous une autre forme.</div>';
    const redo = !fb.ok && TRAIN.includes(SES.mode) && ex.kind !== 'info';
    h += `</div><div class="fbtns">${redo ? '<button class="btn redo" data-act="again">↺ Refaire</button>' : ''}<button class="btn ${fb.ok ? 'go' : 'stop'} big" data-act="cont">Continuer</button></div>`;
    f.innerHTML = h;
    const b = f.querySelector('[data-act=cont]'); if (b) setTimeout(() => b.focus(), 20);
  }
  function check() {
    const ex = cur(); if (SES.fb || !canCheck()) return;
    let r;
    if (ex.kind === 'choice') r = { ok: ex.options[SES.sel] === ex.answer, sol: ex.answer };
    else if (ex.kind === 'type') r = gradeText($('#ans').value, ex);
    else if (ex.kind === 'tiles') { const u = SES.pick.map((i) => ex.bank[i]).join(' '); r = { ok: ex.accept.some((a) => norm(a) === norm(u)), sol: ex.sol }; }
    applyResult(ex, r);
  }
  function applyResult(ex, r, perId) {
    SES.fb = r;
    // erreurs répétées sur un même élément (même d'une séance à l'autre) → Don Ramón s'énerve
    if (ex.ids.length === 1 && !ex.cons) {
      const id = ex.ids[0];
      if (TRAIN.includes(SES.mode) && !S.items[id]) S.items[id] = { box: 0, n: 0, ok: 0, ko: 0 };
      const st = S.items[id] || (SES.mr[id] = SES.mr[id] || {});
      if (r.ok) { r.redeem = st.mr || 0; st.mr = 0; } else if (!r.dunno) { st.mr = (st.mr || 0) + 1; r.miss = st.mr; }
    }
    SES.react = react(ex, r);
    if (SES.react.party) confetti(60);
    if (!ex.retry && !ex.cons) { SES.tot++; if (r.ok) SES.ok++; else SES.mist++; }
    if (TRAIN.includes(SES.mode) && !ex.retry) ex.ids.forEach((id) => srs(id, perId ? perId[id] : r.ok, ex.fmt, SES.mode, ex.qkey));
    if (SES.mode === 'lesson' && !SES.meta.review && !ex.retry && !ex.cons && ex.ids.length && ITEMS[ex.ids[0]].level === SES.meta.level) { const L = lv(SES.meta.level.id); L.tot++; if (r.ok) L.ok++; }
    if (SES.mode === 'placement' && r.ok) SES.meta.okTier++;
    if (!r.ok && TRAIN.includes(SES.mode) && !ex.retry) {
      const wrongIds = perId ? Object.keys(perId).filter((id) => !perId[id]) : ex.ids;
      wrongIds.slice(0, 2).forEach((id) => { const it = ITEMS[id]; const nx = build(it, it.k === 'card' ? 'card_q' : it.k === 'r' ? 'read_q' : pickFmt(it, 'easy')); nx.retry = true; nx.label = '🔁 ' + nx.label; SES.queue.push(nx); });
    }
    save();
    renderArea(); renderFoot();
  }
  const PRON = /^(yo|tu|tú|el|él|ella|usted|nosotros|nosotras|vosotros|vosotras|ellos|ellas|ustedes) /;
  const ARTC = /^(el|la|los|las|un|una) /;
  function typoOk(su, sa) {
    const A = su.split(' '), B = sa.split(' ');
    if (A.length !== B.length) return false;
    let diff = 0;
    for (let i = 0; i < A.length; i++) {
      if (A[i] === B[i]) continue;
      if (++diff > 1) return false;
      const a = A[i], b = B[i];
      if (b.length < 5 || lev(a, b) > 1) return false;
      // une différence dans les 2 dernières lettres = terminaison (genre, nombre, personne) : vraie faute
      let k = 0; while (k < a.length && a[k] === b[k]) k++;
      if (k >= Math.min(a.length, b.length) - 2) return false;
    }
    return diff === 1;
  }
  function gradeText(val, ex) {
    const LEN = (x) => (ex.lenient ? x.replace(/(^| )(por favor|perdone|disculpe|perdona|oiga|hola|gracias|mire|buenas noches|buenos días|buenas tardes)(?= |$)/g, ' ').replace(/\s+/g, ' ').trim() : x);
    const u = LEN(norm(val));
    if (ex.numeric) return { ok: parseInt(u.replace(/\D/g, ''), 10) === parseInt(ex.accept[0], 10), sol: ex.sol };
    const dp = (x) => x.replace(PRON, '');
    for (const a of ex.accept) { const na = LEN(norm(a)); if (u === na || dp(u) === dp(na)) return { ok: true }; }
    const su = stripAcc(u);
    for (const a of ex.accept) { const sa = stripAcc(LEN(norm(a))); if (su === sa || dp(su) === dp(sa)) return { ok: true, note: `Attention aux accents : <b class="es">${esc(a)}</b>` }; }
    if (ex.word) {
      for (const a of ex.accept) {
        const sa = stripAcc(norm(a)); if (!ARTC.test(sa)) continue;
        const bare = sa.replace(ARTC, '');
        if (su === bare) return { ok: true, note: `N’oublie pas l’article : <b class="es">${esc(a)}</b>` };
        if (ARTC.test(su) && su.replace(ARTC, '') === bare) return { ok: false, sol: a, note: 'Attention au genre du mot !' };
      }
    }
    if (!ex.strict) for (const a of ex.accept) { if (typoOk(dp(su), dp(stripAcc(LEN(norm(a)))))) return { ok: true, note: `Petite faute de frappe : <b class="es">${esc(a)}</b>` }; }
    return { ok: false, sol: ex.sol };
  }
  function matchClick(side, i) {
    const m = SES.m, ex = cur(); if (SES.fb || m.done.has(i)) return;
    m[side] = i; m.bad = null;
    if (m.l != null && m.r != null) {
      if (m.l === m.r) m.done.add(m.l);
      else { m.err.add(m.l); m.err.add(m.r); m.bad = { l: m.l, r: m.r }; setTimeout(() => { if (SES && SES.m === m) { m.bad = null; renderArea(); } }, 550); }
      m.l = null; m.r = null;
    }
    renderArea();
    if (m.done.size === ex.pairs.length) {
      const per = {}; ex.pairs.forEach((p, k) => (per[p.id] = !m.err.has(k)));
      applyResult(ex, { ok: m.err.size === 0, matchErr: m.err.size ? `${m.err.size} paire(s) à revoir.` : '' }, ex.cons ? null : per);
    }
  }
  function next() {
    if (!SES) return;
    if (SES.mode === 'placement' && SES.i === SES.queue.length - 1) {
      const M = SES.meta;
      if (M.okTier >= 3) { M.passed = M.tier; if (M.tier < 5) { M.tier++; M.okTier = 0; SES.queue.push(...shuffle(C.placement.filter((p) => p.t === M.tier)).map(buildPQ)); } }
    }
    SES.i++;
    if (SES.i >= SES.queue.length) return finish();
    resetEx(); renderSession();
  }

  /* ---------- fin de séance et récompenses */
  function finish() {
    const m = SES.mode, acc = SES.tot ? SES.ok / SES.tot : 1;
    const res = { title: '¡Muy bien!', emoji: '🎉', lines: [], cards: [], badges: [], chest: null, acc, tot: SES.tot, mode: m };
    let xp = SES.ok;
    const l = SES.meta.level;
    if (m === 'lesson') {
      const L = lv(l.id); const allSeen = l.items.every((it) => seen(it.id));
      if (SES.meta.review) { res.title = 'Repaso hecho'; res.emoji = '🔁'; }
      else if (allSeen && !L.done) { L.done = true; L.stars = starsOf(L.tot ? L.ok / L.tot : 1); xp += 10; res.title = '¡Nivel completado!'; res.stars = L.stars; res.lines.push(`« ${l.title} » terminé.`); }
      else if (!allSeen) { xp += 5; res.lines.push(`Niveau « ${l.title} » : ${seenCount(l)} / ${l.items.length} éléments découverts. La suite au prochain passage, avec de nouveaux éléments.`); }
    } else if (m === 'culture') {
      const L = lv(l.id);
      if (!L.done) { L.done = true; L.stars = starsOf(acc); res.stars = L.stars; xp += 10; l.cards.forEach((id) => { if (!S.cards[id]) { S.cards[id] = Date.now(); res.cards.push(id); } }); res.title = '¡Cromos nuevos!'; res.emoji = '🃏'; }
    } else if (m === 'boss') {
      if (SES.mist <= 2) {
        const L = lv(l.id); const first = !L.done; L.done = true; L.stars = Math.max(L.stars || 0, 3 - SES.mist); res.stars = 3 - SES.mist;
        res.title = '¡Desafío superado!'; res.emoji = '🏆'; xp += 15;
        if (first) {
          const U = un(l.unit.id); U.stamp = U.stamp || Date.now(); xp += 30;
          res.lines.push(`Nouveau tampon dans ton passeport : <b>${esc(l.unit.title)}</b>.`);
          const gold = C.cards.find((c) => c.gold && c.u === l.unit.id);
          if (gold && !S.cards[gold.id]) { S.cards[gold.id] = Date.now(); res.chest = gold.id; }
        }
      } else { res.title = 'Casi…'; res.emoji = '💪'; res.lines.push(`${SES.mist} erreurs (2 maximum). Réessaie : certaines répliques changent d’une fois à l’autre.`); xp = Math.floor(xp / 2); }
    } else if (m === 'review') { S.reviews++; res.title = '¡Repaso terminado!'; res.emoji = '🔁'; }
    else if (m === 'bonus') { res.title = '¡Desafío extra!'; res.emoji = '🌶️'; }
    else if (m === 'testlevel') {
      if (SES.ok >= Math.ceil(SES.tot * 0.85)) { markLevelTested(l); res.title = 'Niveau validé !'; res.emoji = '✅'; xp += 5; res.lines.push('Les éléments de ce niveau sont marqués comme connus ; quelques vérifications légères arriveront dans les révisions.'); }
      else { res.title = 'Pas encore…'; res.emoji = '📘'; res.lines.push(`${SES.ok} / ${SES.tot}. Fais le niveau normalement : ça ira vite.`); }
    } else if (m === 'jump') {
      const ui = SES.meta.ui;
      if (SES.ok >= Math.ceil(SES.tot * 0.8)) { UNITS.slice(0, ui).forEach(markUnitTested); res.title = '¡Salto conseguido!'; res.emoji = '🦘'; res.lines.push(`Unités 1 à ${ui} validées : l’unité ${ui + 1} est ouverte.`); }
      else { res.title = 'Pas encore…'; res.emoji = '📘'; res.lines.push(`${SES.ok} / ${SES.tot} (il en fallait ${Math.ceil(SES.tot * 0.8)}).`); }
    } else if (m === 'placement') {
      const p = SES.meta.passed;
      for (let t = 1; t <= Math.min(p, UNITS.length); t++) markUnitTested(UNITS[t - 1]);
      S.placement = { tier: p, date: Date.now() };
      const L = C.levelsText.find((x) => x.t === p) || C.levelsText[0];
      res.title = 'Niveau : ' + L.n; res.emoji = '🧭'; res.lines.push(L.d); xp = 10;
      if (p >= 1) res.lines.push(`Validé par le test : ${UNITS.slice(0, Math.min(p, UNITS.length)).map((u) => '<b>' + esc(u.title) + '</b>').join(', ')}.`);
    }
    if (acc === 1 && SES.tot >= 5 && m !== 'placement') { xp += 5; res.lines.push('Aucune faute : +5 XP bonus.'); }
    addXP(xp); res.xp = xp;
    if (SES.tot > 0) { bumpStreak(); S.sessions++; if (TRAIN.includes(m)) { S.acc.push(acc); S.acc = S.acc.slice(-5); } }
    res.badges = checkBadges({ perfect: acc === 1 && SES.tot >= 5 && m !== 'placement', night: new Date().getHours() >= 22 && SES.tot > 0 });
    let pm;
    if (m === 'placement') pm = ['happy', 'Perfecto, ya sé por dónde empezar. ¡Nos vamos de viaje!'];
    else if (m === 'boss' && SES.mist > 2) pm = ['annoyed', '¡Venga, otra vez! Esta vez tómate tu tiempo con cada frase.'];
    else if (!SES.tot) pm = ['happy', '¡Bien leído!'];
    else if (acc >= 0.95) pm = ['joy', pick(['¡Olé! Una sesión perfecta, no tengo nada que decir.', '¡Qué maravilla! Estoy orgulloso de ti.', '¡Sin un fallo! Se lo voy a contar a toda la plaza.'])];
    else if (acc >= 0.8) pm = ['happy', pick(['¡Muy bien! Algunos detalles que repasar, nada grave.', '¡Buena sesión! Los errores volverán en el momento oportuno.'])];
    else if (acc >= 0.6) pm = ['neutral', pick(['No está mal… pero se puede mejorar, ¿eh?', 'Poco a poco. Los errores volverán en tus repasos.'])];
    else pm = ['sad', pick(['Sesión difícil… Ánimo: mañana será otro día.', 'Muchos errores… Lee la pista 💡 antes de volver a empezar.'])];
    res.prof = pm;
    if (SES.best >= 5) res.lines.push(`Meilleure série : ${SES.best} bonnes réponses d’affilée 🔥`);
    res.party = res.stars === 3 || (m === 'boss' && SES.mist <= 2) || res.title === '¡Nivel completado!' || (acc === 1 && SES.tot >= 5);
    save(); SES = null; RES = res; go('result');
    if (res.party) confetti(90);
  }
  function checkBadges(ctx) {
    const stamps = UNITS.filter((u) => S.units[u.id] && S.units[u.id].stamp).length;
    const cc = Object.keys(S.cards).filter((id) => CARDS[id]).length;
    const cond = {
      first: S.sessions >= 1, placement: !!S.placement, perfect: !!ctx.perfect, stamp1: stamps >= 1, stamp3: stamps >= UNITS.length,
      streak3: streakNow() >= 3, streak7: streakNow() >= 7, known50: knownCount() >= 50, known150: knownCount() >= 150,
      cards5: cc >= 5, cardsAll: cc >= C.cards.length, review5: S.reviews >= 5, night: !!ctx.night, xp500: S.xp >= 500,
    };
    const got = [];
    BADGES.forEach((b) => { if (!S.badges[b.id] && cond[b.id]) { S.badges[b.id] = Date.now(); got.push(b); } });
    return got;
  }

  /* ============================================================ vues */
  function go(v) { VIEW = v; render(); window.scrollTo(0, 0); }
  function render() {
    $('#top').innerHTML = topHTML();
    const tabs = $('#tabs'); const show = VIEW !== 'session' && VIEW !== 'result';
    tabs.hidden = !show; if (show) tabs.innerHTML = tabsHTML();
    document.body.classList.toggle('in-session', !show);
    ({ path: vPath, review: vReview, album: vAlbum, passport: vPassport, badges: vBadges, settings: vSettings, session: renderSession, result: vResult })[VIEW]();
  }
  function topHTML() {
    const g = Math.min(1, dayXp() / S.goal);
    return `<div class="brand" data-act="tab" data-v="path">¡Vamos!<span>espagnol</span></div>
      <div class="stats"><span class="st" title="Série de jours (racha)">🔥 <b>${streakNow()}</b></span><span class="st" title="Points d’expérience">⭐ <b>${S.xp}</b></span>
      <span class="st goal" title="Objectif du jour : ${dayXp()} / ${S.goal} XP"><svg viewBox="0 0 36 36" width="26" height="26"><circle cx="18" cy="18" r="15" class="gtrack"/><circle cx="18" cy="18" r="15" class="gfill" stroke-dasharray="${(g * 94.2).toFixed(1)} 94.2" transform="rotate(-90 18 18)"/></svg><small>${dayXp()}/${S.goal}</small></span></div>`;
  }
  function tabsHTML() {
    const due = dueIds().length;
    const t = [['path', '🗺️', 'Camino'], ['review', '🔁', 'Repaso', due], ['album', '🃏', 'Álbum'], ['passport', '🛂', 'Pasaporte'], ['badges', '🏅', 'Logros'], ['settings', '⚙️', 'Ajustes']];
    return t.map(([v, e, n, b]) => `<button class="tab ${VIEW === v ? 'on' : ''}" data-act="tab" data-v="${v}"><span class="te">${e}</span><span class="tn">${n}</span>${b ? `<i class="badge">${b}</i>` : ''}</button>`).join('');
  }

  let SELU = null;
  const listFr = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]);
  function mapSVG(pos, sel) {
    const stops = UNITS.map((u) => ({ lon: u.lon, lat: u.lat })).concat(C.soon.map((x) => ({ lon: x.lon, lat: x.lat })));
    let s = `<svg viewBox="0 0 ${ART.W} ${ART.H}" class="mapsvg" role="img" aria-label="Carte du voyage en Espagne">${ART.mapBase()}<path d="${ART.route(stops)}" class="route"/>`;
    if (pos.ui > 0) s += `<path d="${ART.route(stops.slice(0, pos.ui + 1))}" class="route done"/>`;
    C.soon.forEach((st, i) => {
      const [x, y] = ART.P(st.lon, st.lat);
      s += `<g class="city soon" data-act="soon" data-v="${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="25" class="disc"/>${AV(st.char, 'neutral', 48, { x: -24, y: -27, crop: true })}<text y="42" class="cname">${esc(st.city)}</text><text y="55" class="creg">bientôt</text></g>`;
    });
    UNITS.forEach((u, ui) => {
      const [x, y] = ART.P(u.lon, u.lat), open = unitOpen(ui), comp = unitComplete(u);
      s += `<g class="city ${open ? 'open' : 'lock'} ${ui === sel ? 'sel' : ''}" data-act="city" data-v="${ui}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" style="--uc:${u.color}">
        <circle r="35" class="halo"/><circle r="27" class="disc"/>${AV(u.guide, comp ? 'joy' : 'happy', 52, { x: -26, y: -29, crop: true })}
        ${comp ? '<g class="tick" transform="translate(21 -21)"><circle r="9"/><path d="M-4.5 0 l3 3 l5.5 -6"/></g>' : ''}${!open ? '<g class="lk" transform="translate(21 -21)"><circle r="9"/><text y="4" text-anchor="middle">🔒</text></g>' : ''}
        <text y="46" class="cname">${esc(u.city)}</text><text y="59" class="creg">${esc(u.region)}</text>
        ${u === pos ? '<g transform="translate(0 -36)"><g class="pin"><path d="M0 0 C-11 -12 -12 -28 0 -28 C12 -28 11 -12 0 0Z"/><text y="-13" text-anchor="middle">Tú</text></g></g>' : ''}</g>`;
    });
    return s + '</svg>';
  }
  function vPath() {
    if (!S.started) return vWelcome();
    const { r, nx } = rankOf(S.xp);
    let firstOpen = null;
    for (const u of UNITS) for (const l of u.levels) if (!firstOpen && levelOpen(l) && !levelComplete(l)) firstOpen = l;
    const pos = posUnit();
    if (SELU == null) SELU = (firstOpen ? firstOpen.unit : pos).ui;
    const due = dueIds();
    let say, mood = 'happy';
    if (S.sessions === 0) say = '¡Bienvenido! El viaje empieza en Madrid: Lola te está esperando en la Puerta del Sol.';
    else if (due.length) {
      const who = [...new Set(due.map((id) => ITEMS[id].unit).filter(Boolean))].map((x) => CH[x.guide].name);
      const wl = who.length <= 1 ? who.join('') : who.slice(0, -1).join(', ') + ' y ' + who[who.length - 1];
      say = `${wl || 'Tus amigos'} ${who.length > 1 ? 'tienen' : 'tiene'} ${due.length} pregunta${due.length > 1 ? 's' : ''} para ti en el Repaso. ¡Pasarán a verte estés donde estés!`; mood = 'neutral';
    } else if (firstOpen) say = `Próxima etapa: «${firstOpen.title}», en ${firstOpen.unit.city}. ¡Vamos!`;
    else { say = '¡Enhorabuena! Has terminado la demo. Pronto, ¡rumbo a Bilbao!'; mood = 'joy'; }
    let h = `<div class="hello"><div class="prof">${AV('prof', mood, 96)}</div><div class="hb"><div class="hname">Don Ramón <span>· ton professeur</span></div><div class="hsay">${esc(say)}</div>
      <div class="hbtns">${!S.placement ? '<button class="btn small" data-act="placement">🧭 Test de niveau</button>' : ''}${due.length ? `<button class="btn small go" data-act="review">🔁 Réviser (${due.length})</button>` : ''}</div>
      <div class="rank"><span class="rk">Rang</span> <b class="es">${r[1]}</b> <span class="muted small">${r[2]}</span>${nx ? `<div class="rkbar"><i style="width:${Math.round(((S.xp - r[0]) / (nx[0] - r[0])) * 100)}%"></i></div><span class="muted small">${nx[0] - S.xp} XP → ${nx[1]}</span>` : ''}</div></div></div>`;
    h += `<div class="mapcard">${mapSVG(pos, SELU)}<div class="maphint">Touche une ville pour voir son étape · les villes grisées arrivent bientôt</div></div>`;
    const u = UNITS[SELU], ui = SELU, open = unitOpen(ui), us = S.units[u.id] || {}, g = CH[u.guide];
    h += `<section class="unit ${open ? '' : 'locked'}" id="unitsec" style="--uc:${u.color};--ucd:${u.dark}">
      <div class="ubanner"><div class="utext"><div class="ukick">Étape ${ui + 1} · ${esc(u.region)}${us.stamp ? ' · 🛂 tampon obtenu' : us.tested ? ' · validée par le test' : ''}</div><h2 class="es">${esc(u.title)}</h2><p>${esc(u.fr)}</p></div><div class="uguide">${AV(u.guide, open ? 'happy' : 'neutral', 124)}</div></div>
      <div class="guide-say"><div><b>${esc(g.name)}</b> <span class="muted small">· ${esc(g.role)}</span></div><div class="es gline">« ${esc(u.hello.es)} »</div><div class="muted small">${esc(u.hello.fr)}</div><div class="costume">🎭 ${esc(u.costume)}</div></div>
      ${!open ? `<button class="btn jump" data-act="jump" data-v="${ui}">🔓 Je connais déjà : test pour sauter ici</button>` : ''}
      <div class="path">${u.levels.map((l, li) => nodeHTML(l, li, ui, l === firstOpen)).join('')}</div>
      <div class="unav">${ui > 0 ? `<button class="btn small" data-act="city" data-v="${ui - 1}">← ${esc(UNITS[ui - 1].cityFr)}</button>` : '<span></span>'}${ui < UNITS.length - 1 ? `<button class="btn small" data-act="city" data-v="${ui + 1}">${esc(UNITS[ui + 1].cityFr)} →</button>` : `<button class="btn small" data-act="soon" data-v="0">${esc(C.soon[0].cityFr)} (bientôt) →</button>`}</div></section>`;
    V().innerHTML = h;
  }
  function nodeHTML(l, li, ui, current) {
    const open = levelOpen(l), L = S.levels[l.id] || {}, done = levelComplete(l);
    const offs = [0, 62, 88, 62, 0, -62, -88, -62];
    const off = offs[(li + (ui % 2) * 4) % 8];
    let prog = 0, icon;
    if (l.type === 'lesson') { prog = seenCount(l) / l.items.length; icon = done ? '✓' : '★'; }
    else if (l.type === 'culture') { prog = L.done ? 1 : 0; icon = '🏛️'; }
    else { prog = L.done ? 1 : 0; icon = '🏆'; }
    const st = !open ? 'lock' : done ? 'done' : 'open';
    const stars = L.stars ? `<div class="stars">${'★'.repeat(L.stars)}<span>${'★'.repeat(3 - L.stars)}</span></div>` : L.tested ? '<div class="stars t">✓ test</div>' : '';
    return `<div class="nwrap" style="transform:translateX(${off}px)">${current ? '<div class="go-bubble">¡Vamos!</div>' : ''}
      <button class="node ${st} ${l.type} ${current ? 'cur' : ''}" data-act="level" data-v="${l.id}" style="--p:${Math.round(prog * 100)}" aria-label="${esc(l.title)}"><span>${!open ? '🔒' : icon}</span></button>
      <div class="nlabel es">${esc(l.title)}</div>${stars}</div>`;
  }
  function openLevel(l) {
    if (!levelOpen(l)) return toast(l.li === 0 ? 'Termine l’unité précédente (ou passe le test pour sauter ici).' : 'Termine d’abord le niveau précédent.');
    const L = S.levels[l.id] || {};
    const tn = { lesson: 'Leçon', culture: 'Cultura', boss: 'Desafío' }[l.type];
    let body = `<div class="mkick" style="color:${l.unit.color}">${tn} · Unidad ${l.unit.ui + 1}</div><h2 class="es">${esc(l.title)}</h2><p>${esc(l.fr)}</p>`;
    let btn = 'Commencer';
    if (l.type === 'lesson') {
      const k = seenCount(l), n = l.items.length, due = l.items.filter((it) => isDue(it.id)).length;
      body += `<div class="pbar"><i style="width:${Math.round((k / n) * 100)}%;background:${l.unit.color}"></i></div><p class="muted small">${k} / ${n} éléments découverts</p>`;
      if (k > 0 && k < n) btn = 'Continuer (nouveaux éléments)';
      if (k === n) { btn = due ? `Réviser (${due})` : 'Défi bonus'; body += due ? `<p>${due} élément(s) à revoir ici.</p>` : `<p>Tout est ancré. ${nextDue(levelItemIds(l)) ? 'Prochaine révision : ' + fmtDate(nextDue(levelItemIds(l))) + '.' : ''}</p>`; }
    } else if (l.type === 'culture') {
      btn = L.done ? 'Réviser les cromos' : 'Découvrir (5 cromos + une lecture)';
    } else { btn = L.done ? 'Rejouer le défi' : 'Relever le défi'; body += '<p class="muted small">Une conversation complète, 2 erreurs maximum. Récompense : tampon + coffre.</p>'; }
    if (L.stars) body += `<p class="stars big">${'★'.repeat(L.stars)}<span>${'★'.repeat(3 - L.stars)}</span></p>`;
    if (L.tested) body += '<p class="muted small">✓ Validé par un test : ses éléments reviendront de temps en temps dans tes révisions.</p>';
    body += `<div class="mbtns"><button class="btn primary" data-act="start" data-v="${l.id}">${btn}</button>`;
    if (l.tip) body += `<button class="btn" data-act="tip" data-v="${l.id}">💡 Pista</button>`;
    if (l.type === 'lesson' && !levelComplete(l)) body += `<button class="btn ghost" data-act="testlevel" data-v="${l.id}">Je connais déjà : test rapide</button>`;
    body += '</div>';
    openModal(body);
  }

  function castHTML() {
    const by = {}; dueIds().forEach((id) => { const u = ITEMS[id].unit; if (u) by[u.id] = (by[u.id] || 0) + 1; });
    const us = UNITS.filter((u) => by[u.id]);
    return us.length ? `<div class="cast">${us.map((u) => `<div class="castc" style="--uc:${u.color}">${AV(u.guide, 'happy', 62)}<div><b>${esc(CH[u.guide].name)}</b><div class="muted small">de ${esc(u.cityFr)} · ${by[u.id]} question${by[u.id] > 1 ? 's' : ''}</div></div></div>`).join('')}</div>` : '';
  }
  function vReview() {
    const due = dueIds().length, nd = nextDue();
    const ids = Object.keys(S.items).filter((id) => ITEMS[id] && seen(id) && ITEMS[id].k !== 'card' && ITEMS[id].k !== 'r');
    const B = [['Fragile', (b) => b <= 1, '#d9534f'], ['En progrès', (b) => b === 2 || b === 3, '#e0a100'], ['Solide', (b) => b === 4 || b === 5, '#4a9b3c'], ['Maîtrisé', (b) => b >= 6, '#1f6fb2']];
    const counts = B.map(([, f]) => ids.filter((id) => f(S.items[id].box)).length);
    const max = Math.max(1, ...counts);
    const weak = ids.filter((id) => S.items[id].ko >= 2).sort((a, b) => S.items[b].ko - S.items[a].ko).slice(0, 8);
    V().innerHTML = `<h1 class="es">Repaso</h1>
      <p class="lead">La révision ne te propose <b>que</b> ce qui arrive à échéance : un élément bien su s’espace (1 j → 3 j → 7 j → 16 j → 35 j → 90 j) ; une erreur le fait revenir vite.</p>
      <div class="bigcard">${due ? `<div class="bignum">${due}</div><div>élément${due > 1 ? 's' : ''} à réviser maintenant</div>${castHTML()}<button class="btn primary big" data-act="review">Réviser (${Math.min(due, adaptiveHard() ? 8 : 12)} exercices)</button>`
        : `<div class="bignum">✓</div><div>Rien à réviser pour l’instant.</div>${nd ? `<p class="muted">Prochaine échéance : ${fmtDate(nd)}</p>` : ''}`}
        ${ids.length >= 4 ? '<button class="btn" data-act="bonus">🌶️ Défi bonus (version difficile)</button>' : ''}</div>
      <h2>Ta mémoire</h2>
      <div class="bars">${B.map(([n, , c], i) => `<div class="brow"><span>${n}</span><div class="btrack"><i style="width:${(counts[i] / max) * 100}%;background:${c}"></i></div><b>${counts[i]}</b></div>`).join('')}</div>
      <p class="muted small">${ids.length} éléments rencontrés au total. ${adaptiveHard() ? 'Tu réussis plus de 90 % ces derniers temps : séances plus courtes et exercices plus exigeants.' : ''}</p>
      ${weak.length ? `<h2>Tes points faibles</h2><div class="weak">${weak.map((id) => { const it = ITEMS[id]; return `<span class="chip es">${esc(it.es || it.s || it.npc || it.verb || 'nombres')}</span>`; }).join('')}</div>` : ''}`;
  }

  function cromoInner(c, full) {
    return `<div class="cr-top"><span class="cat">${esc(c.cat)}</span>${c.gold ? '<span class="cat g">dorado</span>' : ''}</div><div class="cr-e">${c.e}</div><div class="cr-n">${esc(c.name)}</div><div class="cr-s">${esc(c.sub)}</div>${full ? `<div class="cr-t">${c.es ? bil(c.es, c.text) : c.text}</div>` : ''}`;
  }
  function vAlbum() {
    let h = `<h1 class="es">Álbum</h1><div class="seg"><button class="${ALBUM_TAB === 'cromos' ? 'on' : ''}" data-act="atab" data-v="cromos">🃏 Cromos (${Object.keys(S.cards).filter((id) => CARDS[id]).length}/${C.cards.length})</button><button class="${ALBUM_TAB === 'carnet' ? 'on' : ''}" data-act="atab" data-v="carnet">📒 Carnet de grammaire</button></div>`;
    if (ALBUM_TAB === 'cromos') {
      UNITS.forEach((u) => {
        const cs = C.cards.filter((c) => c.u === u.id);
        h += `<h2 class="es">${u.e} ${esc(u.title)}</h2><div class="cromos">${cs.map((c) => S.cards[c.id]
          ? `<button class="cromo ${c.gold ? 'gold' : ''}" style="--uc:${u.color}" data-act="card" data-v="${c.id}">${cromoInner(c, false)}</button>`
          : `<div class="cromo empty"><div class="cr-e">?</div><div class="cr-s">${c.gold ? 'Coffre du défi' : 'Niveau Cultura'}</div></div>`).join('')}</div>`;
      });
    } else {
      const ls = Object.values(LEVELS).filter((l) => l.tip && (seenCount(l) > 0 || levelComplete(l)));
      h += ls.length ? ls.map((l) => `<details class="carnet"><summary><b class="es">${esc(l.title)}</b> <span class="muted">· ${esc(l.fr)}</span></summary><div class="tip">${l.tip}</div></details>`).join('') : '<p class="muted">Les fiches de grammaire apparaissent ici au fur et à mesure des leçons.</p>';
    }
    V().innerHTML = h;
  }
  function vPassport() {
    V().innerHTML = `<h1 class="es">Pasaporte</h1><p class="lead">Un tampon par voyage réussi (défi final de chaque unité).</p>
      <div class="passport"><div class="pp-head"><span>REINO DE ESPAÑA · PASAPORTE DEL VIAJERO</span><b>${rankOf(S.xp).r[1]}</b></div><div class="stamps">
      ${UNITS.map((u, i) => { const us = S.units[u.id] || {}; return us.stamp
        ? `<div class="stamp" style="--uc:${u.color};transform:rotate(${[-8, 6, -3][i % 3]}deg)"><div class="s-e">${AV(u.guide, 'happy', 50, { crop: true })}</div><div class="s-n es">${esc(u.city)}</div><div class="s-d">${fmtShort(us.stamp)}</div></div>`
        : `<div class="stamp empty"><div class="s-e">?</div><div class="s-n">Unidad ${i + 1}</div><div class="s-d">${us.tested ? 'validée par test : passe le défi !' : 'à venir'}</div></div>`; }).join('')}
      ${C.soon.map((s) => `<div class="stamp empty soon"><div class="s-e">${AV(s.char, 'neutral', 44, { crop: true })}</div><div class="s-n es">${esc(s.city)}</div><div class="s-d">bientôt</div></div>`).join('')}</div></div>`;
  }
  function vBadges() {
    V().innerHTML = `<h1 class="es">Logros</h1><div class="badges">${BADGES.map((b) => `<div class="bdg ${S.badges[b.id] ? 'got' : ''}"><div class="be">${b.e}</div><b class="es">${esc(b.n)}</b><div class="muted small">${esc(b.d)}</div>${S.badges[b.id] ? `<div class="small bd">${fmtShort(S.badges[b.id])}</div>` : ''}</div>`).join('')}</div>`;
  }
  function vSettings() {
    V().innerHTML = `<h1 class="es">Ajustes</h1>
      <div class="set"><h2>Objectif quotidien</h2><div class="seg">${[20, 30, 50].map((g) => `<button class="${S.goal === g ? 'on' : ''}" data-act="goal" data-v="${g}">${g} XP${g === 20 ? ' · tranquille' : g === 30 ? ' · régulier' : ' · intensif'}</button>`).join('')}</div></div>
      <div class="set"><h2>Sauvegarde</h2><p class="muted">Ta progression est enregistrée dans ce navigateur. Exporte-la de temps en temps (ou pour la transférer sur un autre PC).</p>
        <div class="mbtns"><button class="btn" data-act="export">⬇️ Exporter ma progression</button><button class="btn" data-act="import">⬆️ Importer</button><input type="file" id="impf" accept=".json,application/json" hidden></div></div>
      <div class="set"><h2>Test de niveau</h2><p class="muted">${S.placement ? 'Dernier test : ' + fmtShort(S.placement.date) + ' — ' + esc((C.levelsText.find((x) => x.t === S.placement.tier) || {}).n || '') : 'Pas encore passé.'}</p><button class="btn" data-act="placement">🧭 ${S.placement ? 'Refaire' : 'Passer'} le test</button></div>
      <div class="set"><h2>Comment ça marche ?</h2>
        <ul><li><b>Les révisions</b> : chaque mot, phrase ou règle a sa propre échéance de révision. Une séance mélange des éléments <i>nouveaux</i> et seulement ceux qui arrivent à échéance.</li>
        <li><b>Jamais deux fois pareil</b> : un même élément change de forme à chaque passage (QCM, tuiles, clavier, conjugaison…), les gabarits génèrent de nouvelles phrases et les nombres sont tirés au hasard.</li>
        <li><b>Tu sais déjà ?</b> Le test de niveau, les tests rapides de niveau et le test de passage d’unité valident d’un coup ce que tu maîtrises.</li>
        <li><b>Adaptation</b> : au-delà de 90 % de réussite, les séances raccourcissent et passent en mode exigeant.</li>
        <li>Raccourcis : <kbd>Entrée</kbd> pour vérifier / continuer, <kbd>1</kbd>–<kbd>4</kbd> pour choisir une réponse.</li></ul></div>
      <div class="set danger"><h2>Recommencer</h2><button class="btn stop" data-act="reset">Effacer toute ma progression</button></div>`;
  }
  function vWelcome() {
    V().innerHTML = `<div class="welcome"><div class="wtop"><div class="prof hop">${AV('prof', 'joy', 160)}</div><div class="wbubble"><div class="hname es">¡Hola! Soy <b>Don Ramón</b>.</div>
      <p class="es">Voy a ser tu profesor de español. Vamos a dar la vuelta a España: <b>Madrid</b>, <b>Valencia</b>, <b>Barcelona</b>… y pronto Bilbao, Santiago y Sevilla. En cada ciudad te recibirá un vecino con su traje típico. Y ojo: les encanta pasar a verte más tarde para comprobar que no has olvidado nada.</p>
      <details><summary>Voir la traduction</summary><p class="muted">Je serai ton professeur d’espagnol. Nous allons faire le tour de l’Espagne : Madrid, Valence, Barcelone… et bientôt Bilbao, Saint-Jacques et Séville. Dans chaque ville, un habitant en costume local t’accueillera. Et attention : ils adorent passer te voir plus tard pour vérifier que tu n’as rien oublié.</p></details></div></div>
      <div class="wcast">${['lola', 'amparo', 'jordi', 'inaki', 'xose', 'rocio'].map((id) => `<div>${AV(id, 'happy', 78)}<b>${esc(CH[id].name)}</b><span>${esc(CH[id].city)}</span></div>`).join('')}</div>
      <div class="wcards"><div><b>🗺️ Un voyage</b><span>une ville = des leçons, un niveau culture et un défi</span></div><div><b>🎭 Des personnages</b><span>Lola, Amparo, Jordi… et Don Ramón</span></div><div><b>🏆 Des récompenses</b><span>XP, étoiles, tampons, cromos, badges</span></div></div>
      <div class="mbtns center"><button class="btn primary big" data-act="zero">¡Vamos! Commencer à Madrid</button><button class="btn" data-act="placement">🧭 Test de niveau (facultatif)</button></div></div>`;
  }
  function vResult() {
    const r = RES;
    const pm = r.prof || ['happy', ''];
    let h = `<div class="result"><div class="rprof"><div class="prof ${pm[0] === 'joy' ? 'hop' : pm[0] === 'annoyed' ? 'shake' : ''}">${AV('prof', pm[0], 132)}</div><div class="rbubble">${esc(pm[1])}</div></div><h1 class="es">${r.emoji} ${esc(r.title)}</h1>
      <div class="rstats"><div><b>+${r.xp}</b><span>XP</span></div>${r.tot ? `<div><b>${Math.round(r.acc * 100)} %</b><span>réussite</span></div>` : ''}${r.stars ? `<div><b class="stars">${'★'.repeat(r.stars)}<span>${'★'.repeat(3 - r.stars)}</span></b><span>étoiles</span></div>` : ''}</div>
      ${r.lines.map((x) => `<p>${x}</p>`).join('')}`;
    if (r.chest) h += `<div class="chest" id="chest"><button class="chestbtn" data-act="chest">🎁</button><div class="muted">Un coffre ! Touche-le pour l’ouvrir.</div></div>`;
    if (r.cards.length) h += `<h2>Nouveaux cromos dans ton album</h2><div class="cromos">${r.cards.map((id) => { const c = CARDS[id]; return `<button class="cromo" style="--uc:${c.unit.color}" data-act="card" data-v="${id}">${cromoInner(c, false)}</button>`; }).join('')}</div>`;
    if (r.badges.length) h += `<h2>Badges débloqués</h2><div class="badges">${r.badges.map((b) => `<div class="bdg got"><div class="be">${b.e}</div><b class="es">${esc(b.n)}</b><div class="muted small">${esc(b.d)}</div></div>`).join('')}</div>`;
    h += `<div class="mbtns center"><button class="btn primary big" data-act="tab" data-v="path">Continuer</button></div></div>`;
    V().innerHTML = h;
  }

  /* ---------- modale & toast */
  function openModal(html, cls) { const m = $('#modal'); m.innerHTML = `<div class="mback" data-act="close"></div><div class="mbox ${cls || ''}" role="dialog" aria-modal="true"><button class="icon mclose" data-act="close" title="Fermer">✕</button>${html}</div>`; m.hidden = false; }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
  let toastT = null;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

  /* ============================================================ actions */
  const ACT = {
    tab: (v) => { closeModal(); RES = null; go(v); },
    city: (v) => { closeModal(); SELU = +v; VIEW = 'path'; render(); const el = $('#unitsec'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    soon: (v) => { const x = C.soon[+v], c = CH[x.char]; openModal(`<div class="soonm"><div class="prof">${AV(x.char, 'happy', 150)}</div><div class="mkick">Prochainement · ${esc(x.region)}</div><h2 class="es">${esc(x.t)}</h2><p><b>${esc(c.name)}</b>, ${esc(c.role)}, t’attendra à ${esc(x.cityFr)}.</p><p>${esc(x.d)}</p><p class="muted small">🎭 ${esc(x.costume)}</p></div>`); },
    level: (v) => openLevel(LEVELS[v]),
    start: (v) => playLevel(LEVELS[v]),
    tip: (v) => { const l = v ? LEVELS[v] : SES && SES.meta.level; if (l && l.tip) openModal(`<div class="tip">${l.tip}</div>`); },
    testlevel: (v) => playTestLevel(LEVELS[v]),
    jump: (v) => playJump(+v),
    review: () => playReview(),
    bonus: (v) => playBonus(v && LEVELS[v] ? levelItemIds(LEVELS[v]).map((id) => ITEMS[id]) : null),
    placement: () => { closeModal(); playPlacement(); },
    zero: () => { S.started = true; save(); go('path'); },
    card: (v) => { const c = CARDS[v]; openModal(`<div class="cromo big-cromo ${c.gold ? 'gold' : ''}" style="--uc:${c.unit.color}">${cromoInner(c, true)}</div>`, 'wide'); },
    atab: (v) => { ALBUM_TAB = v; render(); },
    goal: (v) => { S.goal = +v; save(); render(); },
    close: () => closeModal(),
    chest: () => { const c = CARDS[RES.chest]; $('#chest').innerHTML = `<div class="muted">Cromo dorado !</div><button class="cromo gold pop" style="--uc:${c.unit.color}" data-act="card" data-v="${c.id}">${cromoInner(c, false)}</button>`; },
    export: () => {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vamos-progression-' + today() + '.json';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    import: () => $('#impf').click(),
    reset: () => openModal(`<h2>Tout effacer ?</h2><p>XP, niveaux, cromos et révisions seront supprimés. Pense à exporter avant si tu veux garder une copie.</p><div class="mbtns"><button class="btn stop" data-act="resetok">Oui, tout effacer</button><button class="btn" data-act="close">Annuler</button></div>`),
    resetok: () => { S = blank(); save(); closeModal(); go('path'); },
    quit: () => openModal(`<h2>Quitter la séance ?</h2><p>Les réponses déjà données sont enregistrées.</p><div class="mbtns"><button class="btn stop" data-act="quitok">Quitter</button><button class="btn" data-act="close">Continuer la séance</button></div>`),
    quitok: () => { closeModal(); SES = null; save(); go('path'); },
    check: () => check(),
    cont: () => next(),
    // refaire tout de suite le même exercice (même forme), sans recompter les points
    again: () => {
      const ex = cur(); if (!SES.fb || SES.fb.ok) return;
      const nx = Object.assign({}, ex, { retry: true, _L: null, _R: null });
      if (!/^🔁/.test(nx.label || '')) nx.label = '🔁 ' + (nx.label || '');
      if (nx.options) nx.options = shuffle(nx.options);
      if (nx.bank) nx.bank = shuffle(nx.bank);
      SES.queue.splice(SES.i + 1, 0, nx); next();
    },
    dunno: () => { const ex = cur(); if (!SES.fb) applyResult(ex, { ok: false, sol: ex.sol || ex.answer, dunno: true }); },
    opt: (v) => { if (SES.fb) return; SES.sel = +v; renderArea(); renderFoot(); },
    tadd: (v) => { if (SES.fb) return; SES.pick.push(+v); renderArea(); renderFoot(); },
    trm: (v) => { if (SES.fb) return; SES.pick.splice(+v, 1); renderArea(); renderFoot(); },
    ml: (v) => matchClick('l', +v),
    mr: (v) => matchClick('r', +v),
    acc: (v) => { const i = $('#ans'); if (!i || i.disabled) return; const s = i.selectionStart ?? i.value.length, e = i.selectionEnd ?? s; i.value = i.value.slice(0, s) + v + i.value.slice(e); i.focus(); i.setSelectionRange(s + v.length, s + v.length); renderFoot(); },
    tr: (v, b) => { const t = b.parentElement.querySelector('.tr'); if (t) t.classList.remove('hid'); b.remove(); },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const f = ACT[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset.v, b, e); }
  });
  document.addEventListener('mousedown', (e) => { if (e.target.closest('.accents')) e.preventDefault(); }); // garde le focus dans le champ
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'impf' || !e.target.files[0]) return;
    const fr = new FileReader();
    fr.onload = () => {
      try { const o = JSON.parse(fr.result); if (!o || o.v !== 1 || typeof o.items !== 'object') throw new Error('format'); S = Object.assign(blank(), o); save(); toast('Progression importée ✔'); go('path'); }
      catch (err) { toast('Fichier invalide : ce n’est pas une sauvegarde ¡Vamos!'); }
    };
    fr.readAsText(e.target.files[0]);
  });
  document.addEventListener('keydown', (e) => {
    if (!$('#modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (VIEW !== 'session' || !SES) return;
    const ex = cur();
    if (e.key === 'Enter') { e.preventDefault(); if (SES.fb || ex.kind === 'info') next(); else check(); return; }
    if (ex.kind === 'choice' && !SES.fb && /^[1-9]$/.test(e.key) && document.activeElement.tagName !== 'INPUT') { const i = +e.key - 1; if (i < ex.options.length) { SES.sel = i; renderArea(); renderFoot(); } }
  });

  // exposé pour le débogage dans la console
  window.VAMOS = { get state() { return S; }, get session() { return SES; }, ITEMS, LEVELS, LAD, numEs, genT, gradeText, build, buildStep, buildPQ };
  render();
})();
