'use strict';

/* =========================================================
   Little Troubles — contador de mesa (estilo "life counter")
   Toque: ±1 · Segure: ±10 · Botão central: menu
   ========================================================= */

const KEY = 'lt-table-v2';
const GOAL_COOKIES = 100;
const GOAL_FIGHTS = 10;

const COLORS = {
  yellow: ['#ffc21a', '#2a1a00'],
  red:    ['#ff2e63', '#2a0010'],
  lilac:  ['#ff8ff5', '#2a0a28'],
  blue:   ['#3d5afe', '#ffffff'],
  green:  ['#22d47e', '#06281a'],
  orange: ['#ff8a2a', '#2a1200'],
  teal:   ['#17c3b2', '#03201d'],
  purple: ['#8f6bff', '#ffffff'],
};
const DEFAULT_COLORS = ['yellow', 'red', 'lilac', 'blue'];

// Rotação do conteúdo de cada painel, conforme o número de jogadores.
const LAYOUT = {
  2: ['r180', 'r0'],
  3: ['r90', 'r270', 'r0'],
  4: ['r90', 'r270', 'r90', 'r270'],
};

const DICE = [
  { n: 4,  label: 'D4',  shape: 'M24 5 L44 40 L4 40 Z' },
  { n: 6,  label: 'D6',  shape: 'M8 8 H40 V40 H8 Z' },
  { n: 8,  label: 'D8',  shape: 'M24 3 L44 24 L24 45 L4 24 Z M4 24 H44' },
  { n: 10, label: 'D10', shape: 'M24 3 L44 20 L24 45 L4 20 Z M4 20 L24 28 L44 20 M24 28 V45' },
  { n: 12, label: 'D12', shape: 'M24 3 L44 17 L37 42 H11 L4 17 Z' },
  { n: 20, label: 'D20', shape: 'M24 2 L44 13 V35 L24 46 L4 35 V13 Z M24 2 L12 30 H36 Z M12 30 L24 46 L36 30' },
  { n: 100, label: 'D100', shape: 'M24 4 A20 20 0 1 1 23.9 4 Z M14 24 H34' },
];

const svg = (d, w = 2.2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  sliders: svg('<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>'),
  target: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'),
  plus: svg('<path d="M5 12h14M12 5v14"/>', 3.2),
  minus: svg('<path d="M5 12h14"/>', 3.2),
};

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
    const [bg, fg] = COLORS[P(i).color];
    return `<section class="panel ${LAYOUT[S.n][i]}" data-i="${i}" style="--bg:${bg};--fg:${fg}">${panelHTML(i)}</section>`;
  }).join('');
}

function syncHub() { $('#hub').hidden = open.size > 0 || winOpen.size > 0; }

function renderPanel(i) {
  syncHub();
  const el = panelEl(i);
  if (!el) return;
  const [bg, fg] = COLORS[P(i).color];
  el.style.setProperty('--bg', bg);
  el.style.setProperty('--fg', fg);
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
    <div class="cklbl">COOKIES <span>/ ${GOAL_COOKIES}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="fights" aria-label="Lutas vencidas: ${p.fights} de ${GOAL_FIGHTS}">
      <button data-a="fight" data-d="-1" aria-label="menos uma luta">${ICON.minus}</button>
      <div class="f-mid">
        <div class="f-num"><b>${p.fights}</b><small>/ ${GOAL_FIGHTS} LUTAS</small></div>
        <div class="segs">${Array.from({ length: GOAL_FIGHTS }, (_, k) => `<i class="${k < p.fights ? 'on' : ''}"></i>`).join('')}</div>
      </div>
      <button data-a="fight" data-d="1" aria-label="mais uma luta">${ICON.plus}</button>
    </div>
    <button class="corner tl" data-a="drawer" aria-label="Opções do jogador">${ICON.sliders}</button>
    <button class="corner tr ${g ? 'on' : ''} ${gComplete ? 'done' : ''}" data-a="drawer" data-view="goal" aria-label="Carta de Objetivo">${ICON.target}${g ? `<span>${gDone}/${g.tasks.length}</span>` : ''}</button>
    ${firstBadge === i ? '<div class="first-badge">Você começa</div>' : ''}
    ${open.has(i) ? drawerHTML(i) : ''}
    ${winOpen.has(i) ? winHTML(i) : ''}
  </div>`;
}

function drawerHTML(i) {
  const p = P(i);
  const g = p.goal;
  let goal;
  if (!g) {
    goal = `<p class="d-hint">Jogou uma carta de <b>Objetivo</b>? Toque em quantas tarefas ela tem e vá marcando conforme cumprir.</p>
      <div class="count-pick">${[1, 2, 3, 4, 5].map(n => `<button data-a="goal-new" data-n="${n}">${n}</button>`).join('')}</div>`;
  } else {
    const done = g.tasks.filter(Boolean).length;
    const all = done === g.tasks.length;
    goal = `<p class="d-hint">Toque em cada tarefa cumprida. Elas <b>não zeram</b> no fim do turno.</p>
      <div class="tasks">${g.tasks.map((t, k) => `<button class="task ${t ? 'done' : ''}" data-a="task" data-k="${k}" aria-pressed="${t}">${t ? '✓' : ''} ${k + 1}</button>`).join('')}</div>
      ${all ? `<div class="goal-done">Completo — pegue a recompensa. <button data-a="goal-finish">Enviar ao Timeout</button></div>`
            : `<button class="link-btn" data-a="goal-clear">Trocar ou remover objetivo</button>`}`;
  }
  if (open.get(i) === 'goal') {
    return `<div class="drawer">
      <div class="d-top">
        <div class="d-title">Carta de Objetivo ${p.goalsDone ? `<small>${p.goalsDone} completo${p.goalsDone > 1 ? 's' : ''}</small>` : ''}</div>
        <button class="x-btn" data-a="drawer-close" aria-label="Fechar">✕</button>
      </div>
      ${goal}
    </div>`;
  }
  const step = (a, d, cls = '') => `<button class="${cls}" data-a="${a}" data-d="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`;
  return `<div class="drawer">
    <div class="d-top">
      <input class="name-in" data-name="${i}" maxlength="16" value="${esc(p.name)}" aria-label="Nome do jogador" autocomplete="off">
      <button class="x-btn" data-a="drawer-close" aria-label="Fechar">✕</button>
    </div>
    <div class="d-sec"><div class="lbl">Cookies <span>vence com ${GOAL_COOKIES}</span></div>
      <div class="steps">${step('ck', -10)}${step('ck', -5)}${step('ck', -1)}<b>${p.cookies}</b>${step('ck', 1, 'pos')}${step('ck', 5, 'pos')}${step('ck', 10, 'pos')}</div>
    </div>
    <div class="d-sec"><div class="lbl">Lutas vencidas <span>vence com ${GOAL_FIGHTS}</span></div>
      <div class="steps">${step('fight', -1)}<b>${p.fights}/${GOAL_FIGHTS}</b>${step('fight', 1, 'pos')}</div>
    </div>
    <div class="d-sec"><div class="lbl">Cor</div>
      <div class="swatches">${Object.entries(COLORS).map(([k, [c]]) => `<button class="${p.color === k ? 'on' : ''}" style="background:${c}" data-a="color" data-c="${k}" aria-label="cor ${k}"></button>`).join('')}</div>
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
    confetti(COLORS[p.color][0]);
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
    P(i).goal = { tasks: Array(+d.n).fill(false) };
    save(); renderPanel(i); buzz(10);
  },
  task(d, i) {
    const g = P(i).goal;
    g.tasks[+d.k] = !g.tasks[+d.k];
    save(); renderPanel(i); buzz(10);
    if (g.tasks.every(Boolean)) { confetti(COLORS[P(i).color][0], 70); buzz([30, 40, 30]); }
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
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="${shape}"/></svg>${label}</button>`;
  $('#menu').innerHTML = `<div class="menu-card">
    <h1>Little Troubles<small>Contador de mesa</small></h1>
    <div class="roll-out ${spin ? 'spin' : ''}">${roll ? `<b class="${roll.word ? 'word' : ''}">${roll.v}</b><small>${roll.label}</small>` : '<small>Role um dado ou jogue a moeda</small>'}</div>
    <button class="big-btn" data-a="pick">Quem começa?</button>
    <div class="dice">
      ${DICE.map(die).join('')}
      <button class="die-btn" data-a="coin"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3"><circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="13"/></svg>MOEDA</button>
    </div>
    <div class="m-row"><span>Jogadores</span>
      <div class="seg">${[2, 3, 4].map(n => `<button class="${S.n === n ? 'on' : ''}" data-a="players" data-n="${n}">${n}</button>`).join('')}</div></div>
    <div class="m-row"><span>Cookies iniciais</span>
      <div class="m-step"><button data-a="start" data-d="-5">−</button><b>${S.start}</b><button data-a="start" data-d="5">+</button></div></div>
    <button class="m-btn ${resetArmed ? 'danger' : ''}" data-a="reset">${resetArmed ? `Toque de novo para zerar (${S.start} cookies)` : 'Nova partida'}</button>
    <details class="rules"><summary>Lembretes das regras</summary><ul>
      <li>Vence quem chegar a <b>100 cookies</b> ou <b>10 lutas vencidas</b> (ou cumprir uma vitória alternativa de carta).</li>
      <li><b>Luta:</b> vence quem tiver Confiança ≥ Maturidade do oponente e ganha a recompensa do perdedor. Os dois podem vencer.</li>
      <li><b>Recursos:</b> some e subtraia primeiro, depois multiplique/divida. +1 compra grátis a partir do 2º turno.</li>
      <li>No 1º turno de cada jogador: sem Fase de Luta e sem a compra grátis.</li>
      <li>Até <b>4</b> cartas/habilidades por jogador em cada fase. Fora do seu turno, só cartas Quick.</li>
      <li>Fim do turno: máximo de <b>9 cartas</b> na mão. No Playground: até 5 Personagens e 5 Brinquedos.</li>
      <li><b>Objetivo:</b> as tarefas não zeram no fim do turno. Novo Objetivo manda o atual pro Timeout.</li>
      <li><b>Suborno X:</b> pague X cookies ao dono para escolher o personagem dele.</li>
    </ul></details>
    <button class="close-x" data-a="menu-close" aria-label="Fechar menu">✕</button>
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
        confetti(COLORS[P(chosen).color][0], 50);
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

/* ---------------- Confete ---------------- */

function confetti(main, count = 150) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confetti');
  const ctx = cv.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const W = cv.width = innerWidth * dpr;
  const H2 = cv.height = innerHeight * dpr;
  const cols = [main, '#ffc21a', '#ff2e63', '#ff8ff5', '#3d5afe', '#22d47e', '#ffffff'];
  const parts = Array.from({ length: count }, () => ({
    x: W / 2, y: H2 / 2, r: (4 + Math.random() * 6) * dpr,
    vx: (Math.random() - 0.5) * 22 * dpr, vy: (Math.random() - 0.5) * 22 * dpr,
    a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4,
    c: cols[Math.floor(Math.random() * cols.length)], s: false,
  }));
  const t0 = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, W, H2);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.35 * dpr; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      if (p.s) { ctx.font = `${p.r * 2.8}px serif`; ctx.fillText('🍪', 0, 0); }
      else { ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); }
      ctx.restore();
    }
    if (now - t0 < 3200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H2);
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

renderBoard();
