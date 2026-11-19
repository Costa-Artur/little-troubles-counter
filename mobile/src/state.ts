import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorKey, COLORS, DEFAULT_COLORS } from './theme';
import { getLayout, PLAYER_COUNTS } from './layouts';

export const GOAL_COOKIES = 100;
export const GOAL_FIGHTS = 10;
export const MAX_PLAYERS = 6;
const KEY = 'lt-table-v3';

export type Goal = { tasks: boolean[]; name: string };
export type Player = {
  name: string;
  color: ColorKey;
  cookies: number;
  fights: number;
  goal: Goal | null;
  goalsDone: number;
  won: boolean;
};
export type GameState = {
  n: number;
  layout: string;
  start: number;
  hintShown: boolean;
  players: Player[];
};

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Nome padrão: "Player" + número do jogador. Um nome em branco volta para ele.
export const defaultName = (i: number) => `Player ${i + 1}`;
export const displayName = (p: Player, i: number) => p.name.trim() || defaultName(i);

export function newPlayer(i: number, start: number): Player {
  return { name: defaultName(i), color: DEFAULT_COLORS[i], cookies: start, fights: 0, goal: null, goalsDone: 0, won: false };
}

export function initialState(): GameState {
  return { n: 2, layout: getLayout(2).id, start: 30, hintShown: false, players: Array.from({ length: MAX_PLAYERS }, (_, i) => newPlayer(i, 30)) };
}

// Garante que dados salvos por versões antigas continuem válidos.
function sanitize(raw: any): GameState {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const n = PLAYER_COUNTS.includes(raw.n) ? raw.n : 2;
  const players = base.players.map((def, i) => {
    const p = raw.players?.[i] ?? {};
    return {
      ...def,
      // nomes padrão salvos pela versão em português viram o padrão em inglês
      name: typeof p.name === 'string' && p.name.trim() ? p.name.trim().replace(/^Jogador (\d+)$/, 'Player $1') : def.name,
      color: p.color in COLORS ? p.color : def.color,
      cookies: clamp(Number(p.cookies ?? def.cookies) || 0, 0, GOAL_COOKIES),
      fights: clamp(Number(p.fights ?? 0) || 0, 0, GOAL_FIGHTS),
      goal: p.goal && Array.isArray(p.goal.tasks) ? { tasks: p.goal.tasks.map(Boolean), name: String(p.goal.name ?? '') } : null,
      goalsDone: Number(p.goalsDone) || 0,
      won: !!p.won,
    };
  });
  return { n, layout: getLayout(n, raw.layout).id, start: clamp(Number(raw.start ?? 30), 0, 99), hintShown: !!raw.hintShown, players };
}

export async function loadState(): Promise<GameState> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return sanitize(s ? JSON.parse(s) : null);
  } catch {
    return initialState();
  }
}

export function saveState(s: GameState) {
  AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}

/* ---- Ações ---- */
export type Action =
  | { t: 'load'; s: GameState }
  | { t: 'cookies'; i: number; d: number }
  | { t: 'fights'; i: number; d: number }
  | { t: 'player'; i: number; patch: Partial<Player> }
  | { t: 'fix-names' }
  | { t: 'goal-new'; i: number; count: number }
  | { t: 'goal-task'; i: number; k: number }
  | { t: 'goal-name'; i: number; name: string }
  | { t: 'goal-finish'; i: number }
  | { t: 'goal-clear'; i: number }
  | { t: 'players'; n: number }
  | { t: 'layout'; id: string }
  | { t: 'start'; d: number }
  | { t: 'hint' }
  | { t: 'new-game' };

const isOver = (s: GameState) => s.players.slice(0, s.n).some(p => p.won);

function withWin(p: Player): Player {
  const reached = p.cookies >= GOAL_COOKIES || p.fights >= GOAL_FIGHTS;
  return reached === p.won ? p : { ...p, won: reached };
}

export function reducer(s: GameState, a: Action): GameState {
  const upd = (i: number, f: (p: Player) => Player) => ({ ...s, players: s.players.map((p, j) => (j === i ? f(p) : p)) });
  switch (a.t) {
    case 'load': return a.s;
    case 'cookies':
      // Depois de uma vitória, ninguém soma mais (subtrair continua liberado para corrigir erros).
      if (a.d > 0 && isOver(s)) return s;
      return upd(a.i, p => withWin({ ...p, cookies: clamp(p.cookies + a.d, 0, GOAL_COOKIES) }));
    case 'fights':
      if (a.d > 0 && isOver(s)) return s;
      return upd(a.i, p => withWin({ ...p, fights: clamp(p.fights + a.d, 0, GOAL_FIGHTS) }));
    case 'player': return upd(a.i, p => ({ ...p, ...a.patch }));
    case 'fix-names': {
      // nome em branco (ou só espaços) volta para "Player N"
      if (s.players.every(p => p.name.trim() === p.name && p.name)) return s;
      return { ...s, players: s.players.map((p, j) => ({ ...p, name: displayName(p, j) })) };
    }
    case 'goal-new': return upd(a.i, p => ({ ...p, goal: { tasks: Array(a.count).fill(false), name: '' } }));
    case 'goal-task': return upd(a.i, p => (p.goal ? { ...p, goal: { ...p.goal, tasks: p.goal.tasks.map((t, k) => (k === a.k ? !t : t)) } } : p));
    case 'goal-name': return upd(a.i, p => (p.goal ? { ...p, goal: { ...p.goal, name: a.name } } : p));
    case 'goal-finish': return upd(a.i, p => ({ ...p, goal: null, goalsDone: p.goalsDone + 1 }));
    case 'goal-clear': return upd(a.i, p => ({ ...p, goal: null }));
    case 'players': return { ...s, n: a.n, layout: getLayout(a.n).id };
    case 'layout': return { ...s, layout: a.id };
    case 'start': return { ...s, start: clamp(s.start + a.d, 0, 99) };
    case 'hint': return { ...s, hintShown: true };
    case 'new-game':
      return { ...s, players: s.players.map(p => ({ ...p, cookies: s.start, fights: 0, goal: null, goalsDone: 0, won: false })) };
  }
}

export const gameOver = isOver;
