'use strict';

/* =========================================================
   Little Troubles — contador de mesa (estilo "life counter")
   Toque: ±1 · Segure: ±10 · Botão central: menu
   ========================================================= */

const KEY = 'lt-table-v2';
const GOAL_COOKIES = 100;
const GOAL_FIGHTS = 10;

// [fundo pastel, tinta (texto), traço fino] — tons tirados das molduras das cartas
const COLORS = {
  orange: ['#f9cd9c', '#7a340c', '#d9772f'],
  purple: ['#cdbdf0', '#432a7c', '#7a5bc0'],
  blue:   ['#b9d6f3', '#1f4479', '#4f86c6'],
  yellow: ['#fbe3a0', '#6e4a00', '#d8a22a'],
  red:    ['#f8bcae', '#80261a', '#e06f5a'],
  lilac:  ['#f5c3dc', '#7c2350', '#d97aa7'],
  green:  ['#c8e6b6', '#2b5a22', '#6aae55'],
  teal:   ['#b5e3dc', '#1b5850', '#4aa99c'],
};
const DEFAULT_COLORS = ['orange', 'purple', 'blue', 'green'];

// Rotação do conteúdo de cada painel, conforme o número de jogadores.
const LAYOUT = {
  2: ['r180', 'r0'],
  3: ['r90', 'r270', 'r0'],
  4: ['r90', 'r270', 'r90', 'r270'],
};

/* ---------------- Traço "desenhado à mão" ----------------
   Gera caminhos SVG levemente tortos (sempre iguais, pois usam uma semente fixa). */

const rng = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const f2 = n => Math.round(n * 100) / 100;
const pt = p => `${f2(p[0])} ${f2(p[1])}`;

// Curva suave passando por todos os pontos (Catmull-Rom → Bézier).
function smoothPath(pts, closed = false) {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pt(P[1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d += `C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return closed ? d + 'Z' : d;
}

// Círculo torto; aberto, ele "passa do ponto" no fim, como um traço feito de uma vez.
function handLoop(cx, cy, r, seed, { jit = 0.08, n = 9, closed = false } = {}) {
  const R = rng(seed);
  const a0 = R() * Math.PI * 2;
  const span = closed ? Math.PI * 2 * (n - 1) / n : Math.PI * 2 + 0.5;
  const pts = Array.from({ length: n }, (_, k) => {
    const a = a0 + span * k / (n - 1);
    const rr = r * (1 + (R() - 0.5) * 2 * jit);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  return smoothPath(pts, closed);
}

// Linha (ou polígono) com cada trecho levemente curvo; fechada, ela sobra um pouquinho no canto.
function handLine(pts, seed, { closed = false, wob = 0.13 } = {}) {
  const R = rng(seed);
  const P = closed ? [...pts, pts[0]] : pts;
  let d = `M${pt([P[0][0] + (R() - 0.5) * 0.6, P[0][1] + (R() - 0.5) * 0.6])}`;
  for (let i = 0; i < P.length - 1; i++) {
    const [a, b] = [P[i], P[i + 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    // cada trecho vira dois pedacinhos curvos, para um balanço de "mão tremida"
    const mid = [(a[0] + b[0]) / 2 + nx * (R() - 0.5) * len * 0.06, (a[1] + b[1]) / 2 + ny * (R() - 0.5) * len * 0.06];
    for (const [p, q] of [[a, mid], [mid, b]]) {
      const half = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const off = (R() - 0.5) * 2 * wob * half;
      d += `Q${pt([(p[0] + q[0]) / 2 + nx * off, (p[1] + q[1]) / 2 + ny * off])} ${pt(q)}`;
    }
  }
  if (closed) {
    const [a, b] = [P[0], P[1]];
    d += `L${pt([a[0] + (b[0] - a[0]) * 0.12 + (R() - 0.5), a[1] + (b[1] - a[1]) * 0.12 + (R() - 0.5)])}`;
  }
  return d;
}

// Cookie com uma mordida no canto superior direito.
function bittenCookie(cx, cy, r, seed) {
  const R = rng(seed);
  const bx = cx + r * 0.8235, by = cy - r * 0.8235, br = r * 0.47;
  const dist = Math.hypot(bx - cx, by - cy);
  const ux = (bx - cx) / dist, uy = (by - cy) / dist;
  const a = (r * r - br * br + dist * dist) / (2 * dist);
  const h = Math.sqrt(r * r - a * a);
  const A = [cx + a * ux - h * uy, cy + a * uy + h * ux];
  const B = [cx + a * ux + h * uy, cy + a * uy - h * ux];
  const angA = Math.atan2(A[1] - cy, A[0] - cx);
  let angB = Math.atan2(B[1] - cy, B[0] - cx);
  if (angB < angA) angB += Math.PI * 2;
  const n = 9;
  const pts = [A];
  for (let k = 1; k < n; k++) {
    const t = angA + (angB - angA) * k / n;
    const rr = r * (1 + (R() - 0.5) * 0.1);
    pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  pts.push(B);
  const M = [bx - ux * br, by - uy * br];
  const c = [2 * M[0] - (A[0] + B[0]) / 2 + (R() - 0.5) * r * 0.08, 2 * M[1] - (A[1] + B[1]) / 2 + (R() - 0.5) * r * 0.08];
  return `${smoothPath(pts)}Q${pt(c)} ${pt(A)}Z`;
}

// Gotas de chocolate: bolinhas tortas, preenchidas.
function chips(list, seed) {
  return list.map(([x, y, r], k) => handLoop(x, y, r, seed + k * 7, { jit: 0.22, n: 5, closed: true })).join('');
}

const starPts = (cx, cy, R1, R2) => Array.from({ length: 10 }, (_, k) => {
  const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R2 : R1;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});

// Dados do menu, desenhados à mão (cada item é um traço).
const L = (pts, seed, closed = true) => handLine(pts, seed, { closed });
const DICE = [
  { n: 4,  label: 'D4',  shape: L([[24, 5], [44, 40], [4, 40]], 41) },
  { n: 6,  label: 'D6',  shape: L([[8, 8], [40, 8], [40, 40], [8, 40]], 61) },
  { n: 8,  label: 'D8',  shape: L([[24, 3], [44, 24], [24, 45], [4, 24]], 81) + L([[5, 24], [43, 24]], 82, false) },
  { n: 10, label: 'D10', shape: L([[24, 3], [44, 20], [24, 45], [4, 20]], 101) + L([[5, 20], [24, 28], [43, 20]], 102, false) + L([[24, 28], [24, 44]], 103, false) },
  { n: 12, label: 'D12', shape: L([[24, 3], [44, 17], [37, 42], [11, 42], [4, 17]], 121) },
  { n: 20, label: 'D20', shape: L([[24, 2], [44, 13], [44, 35], [24, 46], [4, 35], [4, 13]], 201) + L([[24, 3], [12, 30], [36, 30]], 202) + L([[12, 30], [24, 45], [36, 30]], 203, false) },
  { n: 100, label: 'D100', shape: handLoop(24, 24, 20, 1001, { jit: 0.04, n: 10 }) + L([[14, 24], [34, 24]], 1002, false) },
];
const COIN = handLoop(24, 24, 20, 3001, { jit: 0.04, n: 10 }) + handLoop(24, 24, 13, 3002, { jit: 0.06 });

const svg = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const path = d => `<path d="${d}"/>`;
const ICON = {
  sliders: svg(path(handLine([[4, 8], [12.8, 8.3]], 11) + handLine([[17.3, 8.1], [20, 7.8]], 12) + handLine([[4, 16.1], [6.8, 15.9]], 13) + handLine([[11.2, 16], [20, 16.2]], 14) + handLoop(15, 8, 2.2, 15) + handLoop(9, 16, 2.2, 16))),
  target: svg(path(handLoop(12, 12, 8.3, 21, { jit: 0.05, n: 10 }) + handLoop(12, 12, 3.6, 22, { jit: 0.08 }))),
  plus: svg(path(handLine([[5.4, 12.2], [18.6, 11.8]], 31) + handLine([[11.8, 5.4], [12.2, 18.6]], 32)), 2.2),
  minus: svg(path(handLine([[5.4, 12.2], [18.6, 11.8]], 33)), 2.2),
  close: svg(path(handLine([[6.2, 6.4], [17.8, 17.5]], 34) + handLine([[17.6, 6.2], [6.3, 17.8]], 35)), 2),
  check: svg(path(handLine([[5, 12.4], [9.6, 17.2], [19.2, 7]], 36, { wob: 0.1 })), 2.4),
  // pegada: almofada + 4 dedinhos (contorno = tarefa pendente, cheia = feita)
  paw: svg(path(handLoop(12, 15.8, 4.3, 71, { jit: 0.1, n: 7, closed: true }) + chips([[6.4, 10.6, 1.8], [9.6, 6.7, 1.9], [14.4, 6.7, 1.9], [17.6, 10.6, 1.8]], 72)), 1.6),
  pawFill: svg(`<path d="${handLoop(12, 15.8, 4.3, 71, { jit: 0.1, n: 7, closed: true }) + chips([[6.4, 10.6, 1.8], [9.6, 6.7, 1.9], [14.4, 6.7, 1.9], [17.6, 10.6, 1.8]], 72)}" fill="currentColor"/>`, 1.6),
  // mapa das cartas de Objetivo: folha ondulada com o canto de cima enrolado, rolo embaixo,
  // trilha tracejada e um X (tudo na cor do traço)
  map: svg(
    // folha: lado esquerdo sobe até o canto enrolado, topo, e lado direito ondulado até o rolo
    `<path d="${smoothPath([[4.9, 16.4], [4.4, 13.6], [5, 11.2], [4.2, 8.6], [4.5, 5.9], [6.3, 3.9], [10, 4.2], [14, 4.5], [17.6, 4.8], [20.4, 5.3], [18.7, 7.2], [18.1, 9.6], [18.8, 12.1], [18.3, 14.6], [18.9, 17.3]])}" fill="currentColor" fill-opacity=".08"/>` +
    // caracol do canto de cima
    path(smoothPath([[6.3, 3.9], [7.6, 4.8], [7.1, 6.3], [5.5, 6.5]])) +
    // rolo de baixo, com a ponta direita enrolada
    `<path d="${smoothPath([[3.4, 16.3], [8.4, 16.7], [13.6, 17.1], [19.2, 17.5], [20.5, 18.9], [19.5, 20.5], [13.4, 20.2], [8, 19.7], [3.3, 19.3], [2.6, 17.8]], true)}" fill="currentColor" fill-opacity=".22"/>` +
    path(smoothPath([[19.2, 17.5], [18.3, 18.8], [19, 19.9]])) +
    // trilha e o X
    `<path d="M11.6 14.6C8.8 14.2 7.6 11.6 8.4 9.8C9 8.5 10.3 8 11.4 8.3" stroke-width="1.15" stroke-dasharray="1.2 1.5"/>` +
    path(handLine([[12.7, 6.6], [15, 8.9]], 86) + handLine([[15, 6.6], [12.7, 8.9]], 87)), 1.4),
  // cookie mordido, com gotas de chocolate e farelos perto da mordida
  cookie: svg(path(bittenCookie(12, 12, 8.6, 41)) +
    `<path d="${chips([[8.8, 10, 1.05], [13, 11.6, 1.05], [10, 15.3, 1], [14.9, 15.6, .85]], 42)}" fill="currentColor" stroke="none"/>` +
    `<path d="${chips([[22.6, 12.8, .6], [18.3, 2.4, .55]], 43)}" fill="currentColor" stroke="none"/>`, 1.6),
};

// Cookie colorido do botão central.
function hubCookieSVG() {
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="${bittenCookie(24, 24, 20, 51)}" fill="#f3c88c" stroke="#9a6a3a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="${chips([[16, 17, 2.3], [27, 15, 2], [13.5, 28, 2.1], [24.5, 26, 2.4], [34, 31, 2.1], [21, 36, 1.9]], 52)}" fill="#6b4226"/>
    <path d="${chips([[20, 21, 1], [31, 22.5, 1], [28, 35, .9], [12, 22, .8]], 53)}" fill="#d9a35f"/>
  </svg>`;
}

// Rabiscos do fundo (cookie, estrela, dado, coração, brilhos), feitos com o mesmo traço.
function doodleURL(stroke, op) {
  const fill = `fill="${stroke}" fill-opacity="${op}" stroke="none"`;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="170" height="170" fill="none" stroke="${stroke}" stroke-opacity="${op}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="${bittenCookie(32, 34, 13, 61)}"/>
    <path d="${chips([[27, 31, 1.7], [35, 33, 1.7], [30, 40, 1.6]], 62)}" ${fill}/>
    <path d="${handLine(starPts(118, 31, 12, 5.5), 63, { closed: true, wob: 0.1 })}"/>
    <path d="${handLine([[100, 102], [123, 98], [127, 121], [104, 125]], 64, { closed: true })}"/>
    <path d="${chips([[107, 106, 1.7], [113.5, 111.5, 1.7], [120, 117, 1.7]], 65)}" ${fill}/>
    <path d="${smoothPath([[42, 141], [34, 134], [29, 127], [30, 121], [36, 118.5], [41.5, 122.5], [47, 118], [53, 120], [54.5, 126], [50, 133]], true)}"/>
    <path d="${handLine([[78, 69], [80.5, 76.5], [88, 79], [80.5, 81.5], [78, 89], [75.5, 81.5], [68, 79], [75.5, 76.5]], 66, { closed: true, wob: 0.12 })}"/>
    <path d="${handLoop(150, 72, 2.7, 67) + handLoop(72, 154, 2.7, 68)}"/>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
}
document.documentElement.style.setProperty('--doodle-board', doodleURL('#e2cba6', 0.75));
document.documentElement.style.setProperty('--doodle-panel', doodleURL('#ffffff', 0.5));

/* ---------------- Estado ---------------- */

function newPlayer(i, start) {
  return { name: `Jogador ${i + 1}`, color: DEFAULT_COLORS[i], cookies: start, fights: 0, goal: null, goalsDone: 0, won: false };
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
let S = load() || { n: 2, start: 30, hintShown: false, players: [0, 1, 2, 3].map(i => newPlayer(i, 30)) };
const open = new Map();        // gavetas abertas: índice → 'settings' | 'goal'
const winOpen = new Set();     // telas de vitória visíveis
let firstBadge = null;         // painel com o selo "Começa!"
let roll = null;               // último resultado de dado/moeda
let resetArmed = false;        // "Nova partida" aguardando o segundo toque
let resetT = 0;

function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* sem armazenamento: segue em memória */ } }

/* ---------------- Utilidades ---------------- */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const P = i => S.players[i];
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
const colorOf = i => COLORS[P(i).color] || COLORS[DEFAULT_COLORS[i]];
const panelEl = i => document.querySelector(`.panel[data-i="${i}"]`);

let toastT;
function toast(msg, ms = 1800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------------- Render ---------------- */

function renderBoard() {
  syncHub();
  const b = $('#board');
  b.className = `board n${S.n}`;
  b.classList.toggle('over', gameOver());
  b.innerHTML = Array.from({ length: S.n }, (_, i) => {
    const [bg, fg, ln] = colorOf(i);
    return `<section class="panel ${LAYOUT[S.n][i]}" data-i="${i}" style="--bg:${bg};--fg:${fg};--ln:${ln}">${panelHTML(i)}</section>`;
  }).join('');
}

function syncHub() { $('#hub').hidden = open.size > 0 || winOpen.size > 0; }

function renderPanel(i) {
  syncHub();
  const el = panelEl(i);
  if (!el) return;
  const [bg, fg, ln] = colorOf(i);
  el.style.setProperty('--bg', bg);
  el.style.setProperty('--fg', fg);
  el.style.setProperty('--ln', ln);
  const scroll = el.querySelector('.drawer')?.scrollTop || 0;
  el.innerHTML = panelHTML(i);
  const d = el.querySelector('.drawer');
  if (d) d.scrollTop = scroll;
}

function panelHTML(i) {
  const p = P(i);
  const g = p.goal;
  const gDone = g ? g.tasks.filter(Boolean).length : 0;
  const gComplete = g && gDone === g.tasks.length;
  const pct = clamp(p.cookies / GOAL_COOKIES * 100, 0, 100);
  return `<div class="inner">
    <button class="zone l" data-d="-1" aria-label="Menos cookies (toque: 1, segure: 10)"></button>
    <button class="zone r" data-d="1" aria-label="Mais cookies (toque: 1, segure: 10)"></button>
    <div class="pname">${esc(p.name)}</div>
    <div class="num-row">
      <span class="glyph">${ICON.minus}</span>
      <div class="num-wrap"><div class="num">${p.cookies}</div><div class="delta"></div></div>
      <span class="glyph">${ICON.plus}</span>
    </div>
    <div class="cklbl">${ICON.cookie}cookies <span>/ ${GOAL_COOKIES}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="fights" aria-label="Lutas vencidas: ${p.fights} de ${GOAL_FIGHTS}">
      <button data-a="fight" data-d="-1" aria-label="menos uma luta">${ICON.minus}</button>
      <div class="f-mid">
        <div class="f-num"><b>${p.fights}</b><small>/ ${GOAL_FIGHTS} lutas</small></div>
        <div class="segs">${Array.from({ length: GOAL_FIGHTS }, (_, k) => `<i class="${k < p.fights ? 'on' : ''}"></i>`).join('')}</div>
      </div>
      <button data-a="fight" data-d="1" aria-label="mais uma luta">${ICON.plus}</button>
    </div>
    <button class="corner tl" data-a="drawer" aria-label="Opções do jogador">${ICON.sliders}</button>
    <button class="corner tr ${g ? 'on' : ''} ${gComplete ? 'done' : ''}" data-a="drawer" data-view="goal" aria-label="Carta de Objetivo">${ICON.map}${g ? `<span>${gDone}/${g.tasks.length}</span>` : ''}</button>
    ${firstBadge === i ? '<div class="first-badge">Você começa</div>' : ''}
    ${open.has(i) ? drawerHTML(i) : ''}
    ${winOpen.has(i) ? winHTML(i) : ''}
  </div>`;
}

/* ---------- Carta de Objetivo ----------
   Toda carta de Objetivo (quest) tem o ícone de mapa do tesouro.
   Cada tarefa tem uma pegada 🐾; basta cumprir uma vez e não zera no fim do turno. */

function goalSetupHTML(i) {
  const done = P(i).goalsDone;
  return `<div class="drawer goal-view">
    <div class="d-top">
      <span class="gc-type">${ICON.map}</span>
      <div class="d-title">Jogou um Objetivo?${done ? `<small>${done} já completo${done > 1 ? 's' : ''} nesta partida</small>` : ''}</div>
      <button class="x-btn" data-a="drawer-close" aria-label="Fechar">${ICON.close}</button>
    </div>
    <div class="d-sec"><div class="lbl"><span>Quantas tarefas ${ICON.paw} a carta tem?</span></div>
      <div class="count-pick">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button data-a="goal-new" data-n="${n}">${n}</button>`).join('')}</div>
    </div>
  </div>`;
}

function goalCardHTML(i) {
  const g = P(i).goal;
  const done = g.tasks.filter(Boolean).length;
  const all = done === g.tasks.length;
  return `<div class="drawer goal-view">
    <div class="gc-head">
      <span class="gc-type">${ICON.map}</span>
      <input class="gc-name" data-goal-name="${i}" maxlength="28" value="${esc(g.name || '')}" placeholder="Nome da carta (opcional)" aria-label="Nome da carta" autocomplete="off">
      <button class="x-btn" data-a="drawer-close" aria-label="Fechar">${ICON.close}</button>
    </div>
    <div class="gc-tasks ${g.tasks.length > 4 ? 'many' : ''}">${g.tasks.map((t, k) => `<button class="gc-task ${t ? 'done' : ''}" data-a="task" data-k="${k}" aria-pressed="${t}">
      <span class="paw">${t ? ICON.pawFill : ICON.paw}</span><span class="t-txt"><span class="t-lbl">Tarefa </span>${k + 1}</span>${t ? '<em>feita</em>' : ''}</button>`).join('')}</div>
    <div class="gc-foot">
      <div class="gc-reward ${all ? 'ready' : ''}">
        ${all ? `<b>Tudo feito!<span class="t-lbl"> Pegue a recompensa.</span></b><button data-a="goal-finish">Recebi → Timeout</button>`
              : `<span>Recompensa</span><small>${done} de ${g.tasks.length} tarefas</small>`}
      </div>
      ${all ? '' : `<button class="link-btn" data-a="goal-clear"><span class="t-long">Jogou outro Objetivo? Este vai pro Timeout</span><span class="t-short">Trocar carta</span></button>`}
    </div>
  </div>`;
}

function drawerHTML(i) {
  const p = P(i);
  const g = p.goal;
  if (open.get(i) === 'goal') return g ? goalCardHTML(i) : goalSetupHTML(i);
  const step = (a, d, cls = '') => `<button class="${cls}" data-a="${a}" data-d="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`;
  return `<div class="drawer">
    <div class="d-top">
      <input class="name-in" data-name="${i}" maxlength="16" value="${esc(p.name)}" aria-label="Nome do jogador" autocomplete="off">
      <button class="x-btn" data-a="drawer-close" aria-label="Fechar">${ICON.close}</button>
    </div>
    <div class="d-sec"><div class="lbl">Cookies <span>vence com ${GOAL_COOKIES}</span></div>
      <div class="steps">${step('ck', -10)}${step('ck', -5)}${step('ck', -1)}<b>${p.cookies}</b>${step('ck', 1, 'pos')}${step('ck', 5, 'pos')}${step('ck', 10, 'pos')}</div>
    </div>
    <div class="d-sec"><div class="lbl">Lutas vencidas <span>vence com ${GOAL_FIGHTS}</span></div>
      <div class="steps">${step('fight', -1)}<b>${p.fights}/${GOAL_FIGHTS}</b>${step('fight', 1, 'pos')}</div>
    </div>
    <div class="d-sec"><div class="lbl">Cor</div>
      <div class="swatches">${Object.entries(COLORS).map(([k, [c, , l]]) => `<button class="${p.color === k ? 'on' : ''}" style="background:${c};--sw-ln:${l}" data-a="color" data-c="${k}" aria-label="cor ${k}"></button>`).join('')}</div>
    </div>
  </div>`;
}

function winHTML(i) {
  const p = P(i);
  const why = p.cookies >= GOAL_COOKIES ? `${p.cookies} cookies` : `${p.fights} lutas vencidas`;
  return `<div class="win"><div class="win-k">Vitória</div><h2>${esc(p.name)}</h2><p>${why}</p>
    <div class="win-btns"><button data-a="new-game">Nova partida</button><button class="ghost" data-a="win-close">Ver placar</button></div></div>`;
}

/* ---------------- Cookies ---------------- */

const deltaAcc = {};
const deltaT = {};

/* Depois que alguém vence, ninguém pode mais somar até a próxima partida (subtrair continua liberado, para corrigir erros). */
function gameOver() { return S.players.slice(0, S.n).some(p => p.won); }
function blockedUp(d) {
  if (d > 0 && gameOver()) { toast('Partida encerrada — abra o menu para uma nova'); return true; }
  return false;
}
function syncOver() { $('#board').classList.toggle('over', gameOver()); }

function changeCookies(i, d) {
  if (blockedUp(d)) return;
  const p = P(i);
  const before = p.cookies;
  p.cookies = clamp(before + d, 0, GOAL_COOKIES);
  const real = p.cookies - before;
  if (!real) return;
  save();
  const el = panelEl(i);
  if (open.has(i)) { renderPanel(i); } else if (el) {
    const num = el.querySelector('.num');
    num.textContent = p.cookies;
    num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump');
    el.querySelector('.bar i').style.width = `${clamp(p.cookies / GOAL_COOKIES * 100, 0, 100)}%`;
  }
  // indicador de variação acumulada (+7, −3...)
  deltaAcc[i] = (deltaAcc[i] || 0) + real;
  const dl = panelEl(i)?.querySelector('.delta');
  if (dl) { dl.textContent = deltaAcc[i] > 0 ? `+${deltaAcc[i]}` : `−${-deltaAcc[i]}`; dl.classList.add('show'); }
  clearTimeout(deltaT[i]);
  deltaT[i] = setTimeout(() => {
    deltaAcc[i] = 0;
    panelEl(i)?.querySelector('.delta')?.classList.remove('show');
  }, 1600);
  checkWin(i);
}

function changeFights(i, d) {
  if (blockedUp(d)) return;
  const p = P(i);
  const v = clamp(p.fights + d, 0, GOAL_FIGHTS);
  if (v === p.fights) return;
  p.fights = v;
  save(); renderPanel(i); checkWin(i);
}

function checkWin(i) {
  const p = P(i);
  const reached = p.cookies >= GOAL_COOKIES || p.fights >= GOAL_FIGHTS;
  if (reached && !p.won) {
    p.won = true; save();
    winOpen.add(i); renderPanel(i);
    cookieRain(70);
    buzz([60, 80, 60]);
  } else if (!reached && p.won) {
    p.won = false; save();
    if (winOpen.delete(i)) renderPanel(i);
  }
  syncOver();
}

/* Toque = ±1, segurar = ±10 a cada meio segundo */
let hold = null;
$('#board').addEventListener('pointerdown', e => {
  const z = e.target.closest('.zone');
  if (!z) return;
  e.preventDefault();
  // Segundo dedo (pinça/zoom) cancela tudo: antes ele substituía o toque anterior
  // sem parar o timer, e o contador ficava repetindo para sempre.
  if (hold) { endHold(false); return; }
  const i = +z.closest('.panel').dataset.i;
  const d = +z.dataset.d;
  try { z.setPointerCapture(e.pointerId); } catch {}
  z.classList.add('press');
  const h = { z, i, d, repeated: false, t: 0 };
  const rep = () => { h.repeated = true; changeCookies(i, d * 10); buzz(18); h.t = setTimeout(rep, 550); };
  h.t = setTimeout(rep, 450);
  hold = h;
  wakeLock();
});
function endHold(apply) {
  if (!hold) return;
  clearTimeout(hold.t);
  hold.z.classList.remove('press');
  if (apply && !hold.repeated) {
    changeCookies(hold.i, hold.d); buzz(6);
    if (!S.hintShown) { S.hintShown = true; save(); toast('Dica: segure para ±10'); }
  }
  hold = null;
}
document.addEventListener('pointerup', () => endHold(true));
document.addEventListener('pointercancel', () => endHold(false));
addEventListener('blur', () => endHold(false));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') endHold(false); });

/* ---------------- Ações (cliques) ---------------- */

const H = {
  ck(d, i) { changeCookies(i, +d.d); buzz(6); },
  fight(d, i) { changeFights(i, +d.d); buzz(8); },
  drawer(d, i) {
    open.set(i, d.view === 'goal' ? 'goal' : 'settings');
    renderPanel(i);
  },
  'drawer-close'(d, i) { open.delete(i); renderPanel(i); },
  color(d, i) { P(i).color = d.c; save(); renderPanel(i); },
  'goal-new'(d, i) {
    P(i).goal = { tasks: Array(+d.n).fill(false), name: '' };
    save(); renderPanel(i); buzz(10);
  },
  task(d, i) {
    const g = P(i).goal;
    g.tasks[+d.k] = !g.tasks[+d.k];
    save(); renderPanel(i); buzz(10);
    if (g.tasks.every(Boolean)) { cookieRain(30); buzz([30, 40, 30]); }
  },
  'goal-finish'(d, i) { P(i).goal = null; P(i).goalsDone++; save(); renderPanel(i); },
  'goal-clear'(d, i) { P(i).goal = null; save(); renderPanel(i); },
  'win-close'(d, i) { winOpen.delete(i); renderPanel(i); },

  /* menu central */
  menu() { renderMenu(); $('#menu').hidden = false; wakeLock(); },
  'menu-close'() { $('#menu').hidden = true; resetArmed = false; },
  pick() { $('#menu').hidden = true; pickFirst(); },
  dice(d) {
    const n = +d.n;
    roll = { v: 1 + Math.floor(Math.random() * n), label: `D${n}` };
    renderMenu(true); buzz(20);
  },
  coin() {
    roll = Math.random() < 0.5 ? { v: 'Cara', label: 'Moeda', word: true } : { v: 'Coroa', label: 'Moeda', word: true };
    renderMenu(true); buzz(20);
  },
  players(d) {
    S.n = +d.n;
    open.clear(); winOpen.clear(); firstBadge = null;
    save(); renderBoard(); renderMenu();
  },
  start(d) { S.start = clamp(S.start + (+d.d), 0, 99); save(); renderMenu(); },
  reset() {
    // Confirmação em dois toques (confirm() do navegador é bloqueado em alguns apps instalados).
    if (!resetArmed) {
      resetArmed = true;
      renderMenu();
      clearTimeout(resetT);
      resetT = setTimeout(() => { resetArmed = false; if (!$('#menu').hidden) renderMenu(); }, 4000);
      return;
    }
    H['new-game']();
  },
  'new-game'() {
    resetArmed = false;
    clearTimeout(resetT);
    S.players.forEach(p => Object.assign(p, { cookies: S.start, fights: 0, goal: null, goalsDone: 0, won: false }));
    open.clear(); winOpen.clear(); firstBadge = null; roll = null;
    save(); renderBoard();
    $('#menu').hidden = true;
    toast(`Nova partida — ${S.start} cookies cada`);
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const fn = H[el.dataset.a];
  if (!fn) return;
  const panel = el.closest('.panel');
  fn(el.dataset, panel ? +panel.dataset.i : -1);
});

document.addEventListener('input', e => {
  const gn = e.target.closest('[data-goal-name]');
  if (gn) {
    const g = P(+gn.dataset.goalName).goal;
    if (g) { g.name = gn.value.trim(); save(); }
    return;
  }
  const inp = e.target.closest('[data-name]');
  if (!inp) return;
  const i = +inp.dataset.name;
  P(i).name = inp.value.trim() || `Jogador ${i + 1}`;
  save();
  const n = panelEl(i)?.querySelector('.pname');
  if (n) n.textContent = P(i).name;
});

/* ---------------- Menu ---------------- */

function renderMenu(spin = false) {
  const die = ({ n, label, shape }) => `<button class="die-btn" data-a="dice" data-n="${n}">
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${shape}"/></svg>${label}</button>`;
  $('#menu').innerHTML = `<div class="menu-card">
    <h1>Little Troubles<small>Contador de mesa</small></h1>
    <div class="roll-out box ${spin ? 'spin' : ''}">${roll ? `<b class="${roll.word ? 'word' : ''}">${roll.v}</b><small>${roll.label}</small>` : '<small>Role um dado ou jogue a moeda</small>'}</div>
    <button class="big-btn" data-a="pick">Quem começa?</button>
    <div class="dice box">
      ${DICE.map(die).join('')}
      <button class="die-btn" data-a="coin"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${COIN}"/></svg>Moeda</button>
    </div>
    <div class="m-row box"><span>Jogadores</span>
      <div class="seg">${[2, 3, 4].map(n => `<button class="${S.n === n ? 'on' : ''}" data-a="players" data-n="${n}">${n}</button>`).join('')}</div></div>
    <div class="m-row box"><span>Cookies iniciais</span>
      <div class="m-step"><button data-a="start" data-d="-5">−</button><b>${S.start}</b><button data-a="start" data-d="5">+</button></div></div>
    <button class="m-btn ${resetArmed ? 'danger' : ''}" data-a="reset">${resetArmed ? `Toque de novo para zerar (${S.start} cookies)` : 'Nova partida'}</button>
    <details class="rules box"><summary>Lembretes das regras</summary><ul>
      <li>Vence quem chegar a <b>100 cookies</b> ou <b>10 lutas vencidas</b> (ou cumprir uma vitória alternativa de carta).</li>
      <li><b>Luta:</b> vence quem tiver Confiança ≥ Maturidade do oponente e ganha a recompensa do perdedor. Os dois podem vencer.</li>
      <li><b>Recursos:</b> some e subtraia primeiro, depois multiplique/divida. +1 compra grátis a partir do 2º turno.</li>
      <li>No 1º turno de cada jogador: sem Fase de Luta e sem a compra grátis.</li>
      <li>Até <b>4</b> cartas/habilidades por jogador em cada fase. Fora do seu turno, só cartas Quick.</li>
      <li>Fim do turno: máximo de <b>9 cartas</b> na mão. No Playground: até 5 Personagens e 5 Brinquedos.</li>
      <li><b>Objetivo:</b> cada tarefa (pegada) só precisa ser cumprida uma vez e não zera no fim do turno. Completou tudo: pegue a recompensa e mande a carta pro Timeout. Novo Objetivo manda o atual pro Timeout.</li>
      <li><b>Suborno X:</b> pague X cookies ao dono para escolher o personagem dele.</li>
    </ul></details>
    <button class="close-x" data-a="menu-close" aria-label="Fechar menu">${ICON.close}</button>
  </div>`;
}

/* ---------------- Quem começa? ---------------- */

let picking = false;
function pickFirst() {
  if (picking) return;
  picking = true;
  firstBadge = null;
  const n = S.n;
  const winner = Math.floor(Math.random() * n);
  const steps = n * 3 + winner + 1 + (n === 2 ? 2 : 0);
  const panels = () => [...document.querySelectorAll('.panel')];
  panels().forEach(p => p.querySelector('.first-badge')?.remove());
  let k = 0;
  const tick = () => {
    const cur = k % n;
    panels().forEach((p, j) => { p.classList.toggle('pick', j === cur); p.classList.toggle('dim', j !== cur); });
    buzz(8);
    k++;
    if (k < steps) {
      setTimeout(tick, 70 + k * k * 1.6);
    } else {
      const chosen = (k - 1) % n;
      setTimeout(() => {
        panels().forEach(p => p.classList.remove('pick', 'dim'));
        const el = panelEl(chosen);
        el.classList.add('chosen');
        firstBadge = chosen;
        renderPanel(chosen);
        cookieRain(24);
        buzz([40, 50, 40]);
        picking = false;
        setTimeout(() => {
          el.classList.remove('chosen');
          if (firstBadge === chosen) { firstBadge = null; renderPanel(chosen); }
        }, 4000);
      }, 350);
    }
  };
  tick();
}

/* ---------------- Chuva de cookies ---------------- */

// Desenha alguns cookies (com e sem mordida) uma vez só; a chuva reaproveita as imagens.
const cookieSprites = (() => {
  let cache = null;
  return () => cache || (cache = Array.from({ length: 4 }, (_, v) => {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const x = c.getContext('2d');
    const seed = 700 + v * 31;
    const body = new Path2D(v % 2 === 0 ? bittenCookie(48, 48, 40, seed) : handLoop(48, 48, 40, seed, { jit: 0.05, n: 10, closed: true }));
    x.fillStyle = '#f3c88c'; x.fill(body);
    const R = rng(seed + 1);
    const spot = (max, size) => { const a = R() * Math.PI * 2, d = R() * max; return [44 + Math.cos(a) * d, 52 + Math.sin(a) * d, size()]; };
    x.fillStyle = '#6b4226'; x.fill(new Path2D(chips(Array.from({ length: 7 }, () => spot(24, () => 4 + R() * 2)), seed + 2)));
    x.fillStyle = '#d9a35f'; x.fill(new Path2D(chips(Array.from({ length: 6 }, () => spot(28, () => 1.6)), seed + 3)));
    x.lineWidth = 3; x.lineJoin = 'round'; x.strokeStyle = '#9a6a3a'; x.stroke(body);
    return c;
  }));
})();

function cookieRain(count = 60) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confetti');
  const ctx = cv.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const W = cv.width = innerWidth * dpr;
  const H2 = cv.height = innerHeight * dpr;
  const sprites = cookieSprites();
  const parts = Array.from({ length: count }, () => {
    const size = (22 + Math.random() * 26) * dpr;
    return {
      img: sprites[Math.floor(Math.random() * sprites.length)],
      size, x: Math.random() * W, y: -size - Math.random() * H2 * .9,
      vy: (2 + Math.random() * 3) * dpr, sway: Math.random() * 6, swayV: .02 + Math.random() * .03,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 0.12,
    };
  });
  const t0 = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, W, H2);
    let alive = false;
    for (const p of parts) {
      p.vy += 0.09 * dpr; p.y += p.vy; p.sway += p.swayV; p.a += p.va;
      if (p.y - p.size > H2) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x + Math.sin(p.sway) * 12 * dpr, p.y);
      ctx.rotate(p.a);
      ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    if (alive && now - t0 < 6000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H2);
  })(t0);
}

/* ---------------- Tela sempre ligada ---------------- */

let lock = null;
async function wakeLock() {
  try {
    if ('wakeLock' in navigator && !lock && document.visibilityState === 'visible') {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    }
  } catch { /* sem suporte: tudo bem */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wakeLock(); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Evita menu de contexto ao segurar.
document.addEventListener('contextmenu', e => { if (e.target.closest('.zone')) e.preventDefault(); });

$('#hub').innerHTML = hubCookieSVG();
renderBoard();
