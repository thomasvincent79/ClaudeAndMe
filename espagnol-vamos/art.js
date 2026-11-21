/* ¡Vamos! — dessins : personnages (SVG paramétrés) et carte de l'Espagne. */
(function () {
  'use strict';
  const SKIN = { light: ['#f8d6b8', '#e7b893'], mid: ['#eab58e', '#cf956c'], tan: ['#c98f64', '#a9714a'], dark: ['#8e5b3c', '#70442a'] };
  const GOLD = '#d4a514';

  /* ---------- la galerie de personnages */
  const CHARS = {
    prof:   { name: 'Don Ramón', role: 'ton professeur', skin: 'mid', hair: 'profside', hairC: '#e6e1d8', browC: '#8d8578', glasses: 1, mustache: '#ece7de', clothes: '#7a5534', lapel: '#5b3d22', collar: 'shirt', neck: 'bowtie', neckC: '#c8102e' },
    lola:   { name: 'Lola', city: 'Madrid', role: 'chulapa madrileña', skin: 'light', hair: 'long', hairC: '#2a1a12', head: 'panuelo', clothes: '#262626', pattern: 'flowers', earrings: GOLD, lips: 1 },
    sofia:  { name: 'Sofía', city: 'Madrid', role: 'réceptionniste de l’hôtel Sol', skin: 'tan', hair: 'bob', hairC: '#3b2416', clothes: '#1f3b63', lapel: '#152c4b', collar: 'shirt', badge: 1, lips: 1 },
    amparo: { name: 'Amparo', city: 'Valencia', role: 'fallera valenciana', skin: 'light', hair: 'fallera', hairC: '#4a2c17', clothes: '#e8c25a', pattern: 'brocade', collar: 'lace', earrings: GOLD, lips: 1 },
    vicent: { name: 'Vicent', city: 'Valencia', role: 'huertano, marchand du Mercado Central', skin: 'tan', hair: 'short', hairC: '#2e2118', head: 'mocador', mustache: '#2e2118', clothes: '#20252c', neck: 'kerchief', neckC: '#b3261e' },
    jordi:  { name: 'Jordi', city: 'Barcelona', role: 'Barcelonais à barretina', skin: 'light', hair: 'short', hairC: '#6b4423', head: 'barretina', beard: '#6b4423', clothes: '#f4f1ea', neck: 'kerchief', neckC: '#c8102e' },
    marta:  { name: 'Marta', city: 'Barcelona', role: 'serveuse dans un bar à tapas du Born', skin: 'mid', hair: 'ponytail', hairC: '#1c1410', clothes: '#f4f1ea', apron: '#1d1d1d', lips: 1 },
    rocio:  { name: 'Rocío', city: 'Sevilla', role: 'flamenca sévillane', skin: 'tan', hair: 'bun', hairC: '#160e0a', flower: '#d62828', clothes: '#c8102e', pattern: 'dots', earrings: GOLD, lips: 1 },
    inaki:  { name: 'Iñaki', city: 'Bilbao', role: 'Basque à txapela', skin: 'light', hair: 'short', hairC: '#3a2a1e', head: 'txapela', clothes: '#f4f1ea', neck: 'kerchief', neckC: '#c8102e', beard: '#3a2a1e' },
    xose:   { name: 'Xosé', city: 'Santiago', role: 'pèlerin de Compostelle', skin: 'mid', hair: 'short', hairC: '#5a4030', head: 'pilgrim', clothes: '#7a5a3a', beard: '#5a4030', neck: 'shell' },
  };

  let uid = 0;
  const BROWS = {
    neutral: ['M37 37.5 Q41.5 36 46 37.5', 'M54 37.5 Q58.5 36 63 37.5'],
    happy:   ['M37 36.5 Q41.5 34.5 46 36.5', 'M54 36.5 Q58.5 34.5 63 36.5'],
    joy:     ['M37 34.5 Q41.5 31.5 46 34.5', 'M54 34.5 Q58.5 31.5 63 34.5'],
    sad:     ['M37 37.5 L46 34', 'M54 34 L63 37.5'],
    annoyed: ['M37 36 L46 38.5', 'M54 38.5 L63 36'],
    angry:   ['M36 34.5 L47 40', 'M53 40 L64 34.5'],
  };

  function avatar(id, mood, size, opt) {
    const c = CHARS[id] || CHARS.prof; mood = BROWS[mood] ? mood : 'neutral'; opt = opt || {};
    const [sk, skd] = SKIN[c.skin]; const u = 'av' + (++uid);
    let defs = '', s = '';
    let cf = c.clothes;
    if (c.pattern === 'dots') { defs += `<pattern id="${u}p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${c.clothes}"/><circle cx="4" cy="4" r="1.8" fill="#fff"/></pattern>`; cf = `url(#${u}p)`; }
    if (c.pattern === 'flowers') { defs += `<pattern id="${u}p" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${c.clothes}"/><circle cx="3" cy="3" r="1.7" fill="#d6455d"/><circle cx="8" cy="8" r="1.3" fill="#e9c46a"/></pattern>`; cf = `url(#${u}p)`; }
    if (c.pattern === 'brocade') { defs += `<pattern id="${u}p" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="${c.clothes}"/><path d="M4.5 1 Q7 4.5 4.5 8 Q2 4.5 4.5 1Z" fill="#fff3c4" stroke="#b8860b" stroke-width=".4"/></pattern>`; cf = `url(#${u}p)`; }
    const hc = c.hairC;
    // cheveux de derrière
    if (c.hair === 'long') s += `<path d="M27 44 C24 18 76 18 73 44 L75 74 C66 70 63 60 62 54 L38 54 C37 60 34 70 25 74Z" fill="${hc}"/>`;
    if (c.hair === 'bob') s += `<path d="M26 47 C24 17 76 17 74 47 L74 60 C67 61 66 54 66 50 L34 50 C34 54 33 61 26 60Z" fill="${hc}"/>`;
    if (c.hair === 'ponytail') s += `<path d="M64 28 C86 26 88 54 78 68 C77 55 74 44 64 36Z" fill="${hc}"/>`;
    if (c.hair === 'bun') s += `<circle cx="61" cy="22" r="9" fill="${hc}"/>`;
    if (c.hair === 'fallera') s += `<ellipse cx="50" cy="21" rx="11" ry="8" fill="${hc}" stroke="${GOLD}" stroke-width="1.5"/>`;
    // cou, corps, vêtements
    s += `<path d="M43 58 L57 58 L57 74 Q50 78 43 74Z" fill="${skd}"/>`;
    s += `<path d="M13 100 C15 80 30 73 50 73 C70 73 85 80 87 100Z" fill="${cf}"/>`;
    if (c.collar === 'shirt') s += '<path d="M42 73 L50 86 L58 73 L54 72 L50 79 L46 72Z" fill="#fff"/>';
    if (c.lapel) s += `<path d="M41 73 L50 88 L44 100 L32 100 C33 88 36 78 41 73Z M59 73 L50 88 L56 100 L68 100 C67 88 64 78 59 73Z" fill="${c.lapel}"/>`;
    if (c.collar === 'lace') s += '<path d="M37 74 Q50 85 63 74 L65 78 Q50 91 35 78Z" fill="#fffaf0" stroke="#e0d6c0" stroke-width=".6"/>';
    if (c.apron) s += `<path d="M37 83 L63 83 L66 100 L34 100Z" fill="${c.apron}"/><path d="M38 83 L42 74 M62 83 L58 74" stroke="${c.apron}" stroke-width="2.4"/>`;
    if (c.badge) s += `<rect x="60" y="85" width="9" height="5" rx="1" fill="${GOLD}"/>`;
    if (c.neck === 'bowtie') s += `<path d="M43.5 74 L50 77.5 L43.5 81Z M56.5 74 L50 77.5 L56.5 81Z" fill="${c.neckC}"/><circle cx="50" cy="77.5" r="1.8" fill="${c.neckC}"/>`;
    if (c.neck === 'kerchief') s += `<path d="M40 72 L60 72 L50 85Z" fill="${c.neckC}"/>`;
    if (c.neck === 'shell') s += '<path d="M54 92 Q59.5 82 65 92Z" fill="#f3e9d2" stroke="#b08850" stroke-width=".7"/><path d="M59.5 84 L59.5 92 M57 86 L56 92 M62 86 L63 92" stroke="#b08850" stroke-width=".5"/>';
    // tête
    s += `<circle cx="29" cy="47" r="4.5" fill="${sk}"/><circle cx="71" cy="47" r="4.5" fill="${sk}"/><ellipse cx="50" cy="45" rx="21" ry="23" fill="${sk}"/>`;
    if (mood === 'angry') s += '<ellipse class="tint" cx="50" cy="45" rx="21" ry="23" fill="#e63946" opacity=".45"/>';
    if (c.beard) s += `<path d="M30 49 C31 64 40 70.5 50 70.5 C60 70.5 69 64 70 49 C66 57 60 61.5 50 61.5 C40 61.5 34 57 30 49Z" fill="${c.beard}"/>`;
    // cheveux de devant
    if (c.hair === 'short') s += `<path d="M29 42 C27 22 40 19 50 19 C62 19 74 23 71 42 C68 33 62 29 55 31 C48 27 38 30 29 42Z" fill="${hc}"/>`;
    if (['long', 'bob', 'ponytail'].includes(c.hair)) s += `<path d="M29 41 C29 23 40 20 50 20 C61 20 72 23 71 41 C66 31 58 28 50 29 C42 28 33 32 29 41Z" fill="${hc}"/>`;
    if (c.hair === 'bun') s += `<path d="M29 40 C30 23 40 21 50 21 C60 21 70 23 71 40 C64 30 57 27.5 50 27.5 C43 27.5 36 30 29 40Z" fill="${hc}"/>`;
    if (c.hair === 'fallera') s += `<path d="M29 42 C29 24 40 21 50 21 C60 21 71 24 71 42 C66 31 56 27 50 31 C44 27 34 31 29 42Z" fill="${hc}"/><circle cx="26" cy="45" r="8" fill="${hc}" stroke="${GOLD}" stroke-width="2"/><circle cx="74" cy="45" r="8" fill="${hc}" stroke="${GOLD}" stroke-width="2"/><circle cx="26" cy="45" r="3" fill="${GOLD}"/><circle cx="74" cy="45" r="3" fill="${GOLD}"/><path d="M37 21 Q50 4 63 21" fill="none" stroke="${GOLD}" stroke-width="3"/><path d="M41 17 L40 12 M50 13 L50 7 M59 17 L60 12" stroke="${GOLD}" stroke-width="2"/>`;
    if (c.hair === 'profside') s += `<path d="M29 51 C26 40 28 33 33 31 L36 48Z M71 51 C74 40 72 33 67 31 L64 48Z" fill="${hc}"/>`;
    // couvre-chefs
    if (c.head === 'panuelo') s += '<path d="M26 47 C21 15 79 15 74 47 C72 32 62 26.5 50 26.5 C38 26.5 28 32 26 47Z" fill="#fbfbf7" stroke="#d9d6cc" stroke-width=".8"/><path d="M27 49 Q29 62 37 67 M73 49 Q71 62 63 67" stroke="#ecebe4" stroke-width="3" fill="none"/><circle cx="66" cy="24" r="5" fill="#d62828"/><circle cx="62.5" cy="21.5" r="3.2" fill="#e63946"/><circle cx="69.5" cy="21" r="3.2" fill="#b5172a"/><path d="M68 28 L72 33" stroke="#2f7d32" stroke-width="1.6"/>';
    if (c.head === 'mocador') s += '<path d="M27 40 C25 17 75 17 73 40 C66 30 58 27.5 50 27.5 C42 27.5 34 30 27 40Z" fill="#b3261e"/><path d="M33 30 L37 30 M44 25 L48 25 M53 24 L57 24 M62 27 L66 27 M38 35 L41 33" stroke="#f2e6d9" stroke-width="1.4"/><circle cx="73" cy="35" r="3.6" fill="#8f1d16"/><path d="M73 37 L80 46 L75.5 46.5Z M74 37 L81 40 L79 43Z" fill="#b3261e"/>';
    if (c.head === 'barretina') s += '<path d="M28 37 C34 28 66 28 72 37 L72 31.5 C66 23 34 23 28 31.5Z" fill="#7d0a1c"/><path d="M29 31.5 C30 11 58 5 72 15 C81 22 85 35 80 43 C76 41 77 31 70 26 C60 21 44 22 29 31.5Z" fill="#c8102e"/>';
    if (c.head === 'txapela') s += '<path d="M26 33 C28 18 72 18 74 33Z" fill="#1d1d1d"/><ellipse cx="50" cy="29" rx="27.5" ry="7" fill="#262626"/><rect x="48.8" y="16.5" width="2.4" height="5" rx="1" fill="#1d1d1d"/>';
    if (c.head === 'pilgrim') s += '<path d="M32 28 C32 10 68 10 68 28Z" fill="#7d5935"/><ellipse cx="50" cy="28" rx="37" ry="8" fill="#6b4a2b"/><path d="M44.5 27 Q50 15 55.5 27Z" fill="#f3e9d2" stroke="#b08850" stroke-width=".7"/><path d="M50 18 L50 27 M47.5 20 L46.5 27 M52.5 20 L53.5 27" stroke="#b08850" stroke-width=".5"/>';
    if (c.flower) s += `<g transform="translate(35 23)"><circle r="6.5" fill="${c.flower}"/><circle cx="-4.5" cy="-3" r="4.2" fill="#e63946"/><circle cx="4.5" cy="-3" r="4.2" fill="#b5172a"/><circle cx="0" cy="4" r="4" fill="#e63946"/><circle r="2.2" fill="#ffd166"/></g>`;
    // visage selon l'humeur
    const bc = c.browC || hc;
    if (mood === 'joy') s += '<path d="M38.5 46.5 Q42 41.5 45.5 46.5 M54.5 46.5 Q58 41.5 61.5 46.5" stroke="#2a1d16" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    else if (mood === 'happy') s += '<path d="M38.8 46 Q42 42.5 45.2 46 M54.8 46 Q58 42.5 61.2 46" stroke="#2a1d16" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    else {
      const ry = mood === 'annoyed' ? 1.9 : mood === 'angry' ? 2.5 : 3.1;
      s += `<ellipse cx="42" cy="45.5" rx="2.6" ry="${ry}" fill="#2a1d16"/><ellipse cx="58" cy="45.5" rx="2.6" ry="${ry}" fill="#2a1d16"/>`;
      if (mood !== 'angry') s += '<circle cx="43" cy="44.2" r=".9" fill="#fff"/><circle cx="59" cy="44.2" r=".9" fill="#fff"/>';
    }
    s += `<path d="${BROWS[mood][0]} M${BROWS[mood][1].slice(1)}" stroke="${bc}" stroke-width="${mood === 'angry' || mood === 'annoyed' ? 3.6 : 3}" fill="none" stroke-linecap="round"/>`;
    if (c.glasses) s += '<circle cx="42" cy="45.5" r="6.6" fill="rgba(255,255,255,.18)" stroke="#3b2f25" stroke-width="1.7"/><circle cx="58" cy="45.5" r="6.6" fill="rgba(255,255,255,.18)" stroke="#3b2f25" stroke-width="1.7"/><path d="M48.6 45 Q50 43.6 51.4 45 M35.4 44.5 L30 43 M64.6 44.5 L70 43" stroke="#3b2f25" stroke-width="1.5" fill="none"/>';
    const my = c.mustache ? 4.5 : 0, lc = c.lips ? '#b5172a' : '#5a2a1e';
    if (mood === 'joy') s += `<path d="M41 ${53 + my} Q50 ${68 + my} 59 ${53 + my}Z" fill="#7a2a22"/><path d="M46 ${60 + my} Q50 ${63.5 + my} 54 ${60 + my} Q50 ${58 + my} 46 ${60 + my}Z" fill="#e07a6f"/>`;
    else if (mood === 'angry') s += `<path d="M41.5 ${62 + my} Q50 ${51 + my} 58.5 ${62 + my}Z" fill="#5a1e18"/><path d="M44 ${57.5 + my} L56 ${57.5 + my}" stroke="#fff" stroke-width="2"/>`;
    else {
      const d = { neutral: `M45 ${57 + my} Q50 ${59 + my} 55 ${57 + my}`, happy: `M43 ${55 + my} Q50 ${62 + my} 57 ${55 + my}`, sad: `M44.5 ${59.5 + my} Q50 ${55 + my} 55.5 ${59.5 + my}`, annoyed: `M45 ${58 + my} L55 ${56.8 + my}` }[mood];
      s += `<path d="${d}" stroke="${lc}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    }
    if (c.mustache) s += `<path d="M39.5 54.5 C44 49.5 48 50.5 50 53 C52 50.5 56 49.5 60.5 54.5 C56 57 53 56 50 54.8 C47 56 44 57 39.5 54.5Z" fill="${c.mustache}"/>`;
    if (mood === 'happy' || mood === 'joy') s += '<circle cx="35.5" cy="53" r="3.6" fill="#ff6b6b" opacity=".33"/><circle cx="64.5" cy="53" r="3.6" fill="#ff6b6b" opacity=".33"/>';
    if (c.earrings) s += `<circle cx="29" cy="55.5" r="3" fill="none" stroke="${c.earrings}" stroke-width="1.4"/><circle cx="71" cy="55.5" r="3" fill="none" stroke="${c.earrings}" stroke-width="1.4"/>`;
    if (mood === 'annoyed') s += '<path d="M73 25 Q78 33 73 37 Q68 33 73 25Z" fill="#5fb0e8"/>';
    if (mood === 'sad') s += '<path d="M37 51 Q39.5 56 37 58.5 Q34.5 56 37 51Z" fill="#5fb0e8"/>';
    if (mood === 'angry') s += '<g class="steam" fill="#f4f4f4" stroke="#bdbdbd" stroke-width="1"><circle cx="21" cy="25" r="6"/><circle cx="14" cy="15" r="4.5"/><circle cx="9" cy="6" r="3"/><circle cx="79" cy="25" r="6"/><circle cx="86" cy="15" r="4.5"/><circle cx="91" cy="6" r="3"/></g><path d="M64 24 q4 3 0 6 M72 24 q-4 3 0 6 M64 24 q3 4 8 0 M64 30 q3 -4 8 0" stroke="#d62828" stroke-width="2" fill="none" stroke-linecap="round"/>';
    if (mood === 'joy') s += `<g fill="${GOLD}"><path d="M16 30 l1.6 3.4 3.6.4 -2.7 2.4.8 3.6 -3.3-1.9 -3.3 1.9.8-3.6 -2.7-2.4 3.6-.4Z"/><path d="M83 22 l1.2 2.6 2.8.3 -2.1 1.9.6 2.8 -2.5-1.5 -2.5 1.5.6-2.8 -2.1-1.9 2.8-.3Z"/></g>`;
    const vb = opt.crop ? '16 6 68 68' : '0 0 100 100';
    const pos = opt.x != null ? ` x="${opt.x}" y="${opt.y}"` : '';
    return `<svg class="av mood-${mood}${opt.cls ? ' ' + opt.cls : ''}" viewBox="${vb}" width="${size}" height="${size}"${pos} aria-hidden="true" overflow="visible">${defs ? '<defs>' + defs + '</defs>' : ''}${s}</svg>`;
  }

  /* ---------- la carte (projection équirectangulaire simple) */
  const K = 60, CL = Math.cos((40 * Math.PI) / 180), LON0 = -9.9, LAT0 = 44.0;
  const W = Math.round((4.6 - LON0) * CL * K), H = Math.round((LAT0 - 35.0) * K);
  const P = (lon, lat) => [(lon - LON0) * CL * K, (LAT0 - lat) * K];
  const path = (pts) => pts.map((p, i) => { const [x, y] = P(p[0], p[1]); return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join('') + 'Z';
  const PYR = [[3.17, 42.43], [2.9, 42.47], [2.65, 42.35], [2.1, 42.42], [1.73, 42.5], [1.45, 42.6], [1.0, 42.7], [0.67, 42.84], [0.0, 42.69], [-0.55, 42.79], [-0.9, 42.95], [-1.39, 43.04], [-1.47, 43.27], [-1.78, 43.37]];
  const PTB = [[-8.6, 42.05], [-8.2, 42.12], [-7.9, 41.88], [-7.4, 41.85], [-6.95, 41.95], [-6.6, 41.95], [-6.3, 41.65], [-6.55, 41.25], [-6.9, 41.0], [-6.85, 40.6], [-6.95, 40.25], [-7.0, 39.67], [-7.5, 39.65], [-7.25, 39.25], [-7.05, 38.85], [-7.25, 38.7], [-7.0, 38.2], [-7.3, 37.95], [-7.5, 37.55], [-7.42, 37.18]];
  const SPAIN = PYR.concat(
    [[-2.0, 43.32], [-2.5, 43.38], [-2.95, 43.42], [-3.45, 43.47], [-3.8, 43.48], [-4.5, 43.4], [-5.0, 43.47], [-5.66, 43.56], [-5.85, 43.66], [-6.3, 43.57], [-7.04, 43.56], [-7.68, 43.79], [-7.87, 43.77], [-8.3, 43.55], [-8.42, 43.38], [-8.95, 43.24], [-9.3, 42.92], [-9.27, 42.88], [-8.95, 42.6], [-8.85, 42.3], [-8.88, 41.87]],
    PTB,
    [[-7.0, 37.2], [-6.45, 36.85], [-6.3, 36.55], [-6.15, 36.3], [-5.95, 36.15], [-5.6, 36.01], [-5.4, 36.15], [-5.0, 36.45], [-4.42, 36.72], [-3.8, 36.74], [-3.25, 36.75], [-2.55, 36.83], [-2.19, 36.72], [-1.9, 36.95], [-1.6, 37.4], [-1.0, 37.58], [-0.7, 37.62], [-0.78, 37.85], [-0.5, 38.2], [-0.48, 38.35], [-0.05, 38.6], [0.23, 38.73], [-0.05, 38.95], [-0.3, 39.35], [-0.33, 39.5], [-0.1, 39.95], [0.25, 40.25], [0.55, 40.55], [0.87, 40.72], [0.7, 40.8], [1.25, 41.1], [1.75, 41.22], [2.17, 41.38], [2.6, 41.6], [3.0, 41.85], [3.2, 42.05], [3.15, 42.25], [3.32, 42.32]]);
  const PORTUGAL = [[-8.88, 41.87], [-8.8, 41.5], [-8.67, 41.15], [-8.75, 40.64], [-8.85, 40.2], [-9.05, 39.75], [-9.38, 39.36], [-9.2, 39.05], [-9.5, 38.78], [-9.15, 38.68], [-9.2, 38.42], [-8.8, 38.4], [-8.87, 37.95], [-8.8, 37.4], [-8.99, 37.02], [-8.6, 37.1], [-7.93, 37.0]].concat(PTB.slice().reverse());
  const FRANCE = [[-1.78, 43.37], [-1.55, 43.5], [-1.4, 44.0], [-1.3, 44.6], [5, 44.6], [5, 43.4], [4.4, 43.45], [3.9, 43.5], [3.4, 43.28], [3.05, 43.0], [3.05, 42.55]].concat(PYR);
  const AFRICA = [[-10, 34], [-6.6, 34.0], [-6.3, 34.6], [-6.15, 35.2], [-5.92, 35.78], [-5.4, 35.92], [-5.3, 35.88], [-5.35, 35.6], [-4.8, 35.2], [-3.93, 35.25], [-2.93, 35.17], [-2.2, 35.1], [-1.3, 35.3], [-0.64, 35.72], [0.5, 36.1], [1.5, 36.55], [3.0, 36.8], [5, 36.9], [5, 34]];
  const ISLES = [
    [[2.35, 39.58], [2.6, 39.95], [3.2, 39.95], [3.47, 39.72], [3.25, 39.35], [2.95, 39.37], [2.7, 39.5]],
    [[3.8, 40.05], [4.3, 39.98], [4.3, 39.82], [3.9, 39.93]],
    [[1.2, 38.95], [1.45, 39.1], [1.6, 39.05], [1.45, 38.85]],
  ];
  // frontières (approximatives) des communautés autonomes
  const RBORDERS = [
    [[-7.04, 43.55], [-6.95, 43.3], [-6.85, 43.1], [-6.85, 42.9]],                                   // Galicia | Asturias
    [[-6.85, 42.9], [-6.85, 42.6], [-6.95, 42.4], [-7.05, 42.15], [-6.95, 41.95]],                   // Galicia | Castilla y León
    [[-6.85, 42.9], [-6.4, 42.95], [-5.8, 42.97], [-5.3, 43.08], [-4.75, 43.05]],                    // Asturias | CyL
    [[-4.5, 43.4], [-4.6, 43.22], [-4.75, 43.05]],                                                   // Asturias | Cantabria
    [[-4.75, 43.05], [-4.4, 42.95], [-4.2, 42.85], [-3.9, 42.75], [-3.65, 42.8], [-3.75, 43.0], [-3.45, 43.1], [-3.3, 43.15]], // Cantabria | CyL
    [[-3.15, 43.44], [-3.22, 43.25], [-3.3, 43.15]],                                                 // Cantabria | País Vasco
    [[-3.3, 43.15], [-3.15, 43.0], [-3.1, 42.8], [-2.95, 42.62]],                                    // País Vasco | CyL
    [[-2.95, 42.62], [-2.7, 42.6], [-2.45, 42.5], [-2.35, 42.55]],                                   // País Vasco | La Rioja
    [[-2.35, 42.55], [-2.25, 42.75], [-2.1, 42.9], [-2.05, 43.05], [-1.9, 43.2], [-1.7, 43.34]],     // País Vasco | Navarra
    [[-2.95, 42.62], [-3.1, 42.4], [-3.0, 42.15], [-2.6, 41.98], [-2.2, 41.97], [-1.9, 41.93]],      // La Rioja | CyL
    [[-2.35, 42.55], [-2.0, 42.45], [-1.75, 42.17], [-1.8, 42.05], [-1.9, 41.93]],                   // La Rioja | Navarra, Aragón
    [[-1.8, 42.05], [-1.55, 41.95], [-1.3, 42.15], [-1.1, 42.4], [-1.0, 42.65], [-0.8, 42.9]],       // Navarra | Aragón
    [[0.67, 42.84], [0.65, 42.5], [0.75, 42.0], [0.6, 41.6], [0.35, 41.35], [0.25, 41.0], [0.18, 40.72]], // Aragón | Cataluña
    [[0.18, 40.72], [0.4, 40.6], [0.52, 40.52]],                                                     // Cataluña | C. Valenciana
    [[0.18, 40.72], [-0.1, 40.5], [-0.3, 40.25], [-0.65, 40.05], [-0.9, 39.95], [-1.15, 40.15]],     // Aragón | C. Valenciana
    [[-1.9, 41.93], [-2.0, 41.65], [-2.15, 41.4], [-2.05, 41.15]],                                   // Aragón | CyL
    [[-2.05, 41.15], [-1.8, 40.9], [-1.6, 40.65], [-1.55, 40.4], [-1.3, 40.2], [-1.15, 40.15]],      // Aragón | Castilla-La Mancha
    [[-2.05, 41.15], [-2.6, 41.25], [-3.2, 41.25], [-3.55, 41.15]],                                  // CyL | CLM
    [[-3.55, 41.15], [-3.9, 40.95], [-4.2, 40.8], [-4.35, 40.6], [-4.55, 40.3]],                     // Madrid | CyL
    [[-4.55, 40.3], [-4.4, 40.2], [-4.0, 40.05], [-3.6, 39.9], [-3.15, 40.05], [-3.05, 40.4], [-3.15, 40.75], [-3.4, 41.0], [-3.55, 41.15]], // Madrid | CLM
    [[-4.55, 40.3], [-4.75, 40.25], [-5.0, 40.15], [-5.35, 40.15]],                                  // CyL | CLM
    [[-5.35, 40.15], [-5.7, 40.25], [-6.1, 40.3], [-6.5, 40.25], [-6.95, 40.25]],                    // CyL | Extremadura
    [[-5.35, 40.15], [-5.2, 39.85], [-5.05, 39.5], [-4.95, 39.15], [-5.05, 38.7]],                   // Extremadura | CLM
    [[-5.05, 38.7], [-5.4, 38.45], [-5.7, 38.2], [-6.2, 38.0], [-6.6, 38.0], [-7.0, 38.05], [-7.3, 37.95]], // Extremadura | Andalucía
    [[-5.05, 38.7], [-4.4, 38.6], [-3.6, 38.4], [-2.9, 38.45], [-2.45, 38.25]],                      // CLM | Andalucía
    [[-2.45, 38.25], [-2.2, 37.95], [-1.95, 37.7], [-1.8, 37.45], [-1.6, 37.4]],                     // Andalucía | Murcia
    [[-2.45, 38.25], [-2.1, 38.45], [-1.75, 38.5], [-1.4, 38.6], [-1.05, 38.7]],                     // CLM | Murcia
    [[-1.05, 38.7], [-1.0, 38.45], [-0.95, 38.2], [-0.8, 37.95], [-0.78, 37.85]],                    // Murcia | C. Valenciana
    [[-1.05, 38.7], [-1.2, 38.95], [-1.3, 39.3], [-1.45, 39.55], [-1.3, 39.8], [-1.2, 40.0], [-1.15, 40.15]], // CLM | C. Valenciana
  ];
  // noms des régions sans étape (celles avec étape sont écrites sous la ville)
  const RLABELS = [['ASTURIAS', -6.35, 43.13], ['CANTABRIA', -4.05, 43.12], ['NAVARRA', -1.6, 42.68], ['LA RIOJA', -2.55, 42.3], ['ARAGÓN', -0.55, 41.12],
    ['CASTILLA Y LEÓN', -4.7, 41.75], ['CASTILLA-', -2.75, 39.12], ['LA MANCHA', -2.75, 38.93], ['EXTREMADURA', -6.15, 39.25], ['MURCIA', -1.45, 38.1], ['ILLES BALEARS', 2.95, 39.12]];
  const line = (pts) => pts.map((p, i) => { const [x, y] = P(p[0], p[1]); return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join('');
  const TOWNS = [['Granada', -3.6, 37.18], ['Zaragoza', -0.89, 41.65], ['Salamanca', -5.66, 40.97], ['Toledo', -4.02, 39.86], ['Córdoba', -4.78, 37.88], ['Málaga', -4.42, 36.72], ['Palma', 2.65, 39.57], ['Oviedo', -5.85, 43.36]];

  function mapBase() {
    const t = (x, lon, lat, cls) => { const [a, b] = P(lon, lat); return `<text x="${a.toFixed(0)}" y="${b.toFixed(0)}" class="${cls}">${x}</text>`; };
    let s = `<defs><pattern id="waves" width="40" height="22" patternUnits="userSpaceOnUse"><path d="M0 12 q10 -7 20 0 t20 0" fill="none" class="wave"/></pattern>
      <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".18"/></filter></defs>
      <rect width="${W}" height="${H}" class="sea"/><rect width="${W}" height="${H}" fill="url(#waves)" opacity=".5"/>
      <path d="${path(AFRICA)}" class="land other"/><path d="${path(FRANCE)}" class="land other"/><path d="${path(PORTUGAL)}" class="land other"/>
      <path d="${path(SPAIN)}" class="land spain" filter="url(#soft)"/>${ISLES.map((i) => `<path d="${path(i)}" class="land spain"/>`).join('')}`;
    s += `<path d="${RBORDERS.map(line).join('')}" class="rb"/>`;
    RLABELS.forEach(([n, lo, la]) => { s += t(n, lo, la, 'rlab'); });
    s += t('PORTUGAL', -8.3, 39.6, 'cty') + t('FRANCIA', 0.4, 43.78, 'cty') + t('MARRUECOS', -4.6, 35.3, 'cty');
    s += t('Mar Mediterráneo', 1.2, 37.8, 'seal') + t('Mar Cantábrico', -6.0, 43.92, 'seal') + t('Atlántico', -9.75, 36.55, 'seal');
    TOWNS.forEach(([n, lo, la]) => { const [x, y] = P(lo, la); s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.6" class="town"/><text x="${(x + 5).toFixed(0)}" y="${(y + 4).toFixed(0)}" class="townl">${n}</text>`; });
    // rose des vents
    const [cx, cy] = P(3.4, 36.1);
    s += `<g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)})" class="rose"><circle r="17"/><path d="M0 -24 L4 0 L0 24 L-4 0Z M-24 0 L0 4 L24 0 L0 -4Z"/><text y="-28" text-anchor="middle">N</text></g>`;
    return s;
  }
  function route(stops) {
    let d = '';
    stops.forEach((st, i) => {
      const [x, y] = P(st.lon, st.lat);
      if (!i) { d += `M${x.toFixed(1)} ${y.toFixed(1)}`; return; }
      const [px, py] = P(stops[i - 1].lon, stops[i - 1].lat);
      const mx = (x + px) / 2, my = (y + py) / 2, dx = x - px, dy = y - py, k = 0.22;
      d += ` Q${(mx - dy * k).toFixed(1)} ${(my + dx * k).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  }

  window.VAMOS_ART = { CHARS, avatar, P, W, H, mapBase, route };
})();
