import { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Action, GameState } from './state';

export type DrawerView = 'settings' | 'goal';

export type Game = {
  s: GameState;
  act: (a: Action) => GameState;
  changeCookies: (i: number, d: number) => number; // devolve quanto mudou de fato
  changeFights: (i: number, d: number) => void;
  drawers: Record<number, DrawerView | undefined>;
  setDrawer: (i: number, v: DrawerView | undefined) => void;
  winOpen: Record<number, boolean>;
  closeWin: (i: number) => void;
  newGame: () => void;
  toast: (msg: string) => void;
  rain: (count: number) => void;
  pick: { cur: number | null; chosen: number | null };
};

export const GameCtx = createContext<Game>(null as unknown as Game);
export const useGame = () => useContext(GameCtx);

const native = Platform.OS !== 'web';
export const buzz = {
  tap: () => { if (native) Haptics.selectionAsync().catch(() => {}); },
  step: () => { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  win: () => { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
};
