import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { buzz, DrawerView, Game, GameCtx } from './src/ctx';
import { CookieArt, Doodles } from './src/icons';
import { getLayout } from './src/layouts';
import { Panel } from './src/Panel';
import { Menu } from './src/Menu';
import { CookieRain, Drop, makeDrops } from './src/CookieRain';
import { Action, clamp, GameState, gameOver, GOAL_COOKIES, GOAL_FIGHTS, initialState, loadState, reducer, saveState } from './src/state';
import { C, F, FILL, HAIR } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => { loadState().then(setState); }, []);
  const ready = fontsLoaded && state;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <Table initial={state} />
    </SafeAreaProvider>
  );
}

function Table({ initial }: { initial: GameState }) {
  // a tela fica ligada enquanto o contador está aberto (sem erro onde o navegador não deixa)
  useEffect(() => {
    activateKeepAwakeAsync('mesa').catch(() => {});
    return () => { Promise.resolve().then(() => deactivateKeepAwake('mesa')).catch(() => {}); };
  }, []);
  const insets = useSafeAreaInsets();
  const [s, setS] = useState(initial);
  const sRef = useRef(s);
  const [drawers, setDrawers] = useState<Record<number, DrawerView | undefined>>({});
  const [winOpen, setWinOpen] = useState<Record<number, boolean>>({});
  const [menu, setMenu] = useState(false);
  const [rains, setRains] = useState<{ id: number; drops: Drop[] }[]>([]);
  const [pick, setPick] = useState<{ cur: number | null; chosen: number | null }>({ cur: null, chosen: null });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastA] = useState(() => new Animated.Value(0));
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });

  // salva (com um pequeno atraso para não gravar a cada toque)
  useEffect(() => {
    const t = setTimeout(() => saveState(s), 300);
    return () => clearTimeout(t);
  }, [s]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st !== 'active') saveState(sRef.current); });
    return () => sub.remove();
  }, []);

  const act = useCallback((a: Action) => {
    const next = reducer(sRef.current, a);
    sRef.current = next;
    setS(next);
    return next;
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastT.current);
    Animated.spring(toastA, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
    toastT.current = setTimeout(() => Animated.timing(toastA, { toValue: 0, duration: 200, useNativeDriver: true }).start(), 1800);
  }, [toastA]);

  const rainId = useRef(0);
  const rain = useCallback((count: number) => setRains(r => [...r, { id: ++rainId.current, drops: makeDrops(count) }]), []);

  // aplica a ação e, se alguém acabou de vencer, mostra a vitória
  const applyWithWin = useCallback((a: Action, i: number) => {
    const before = sRef.current.players[i].won;
    const next = act(a);
    const after = next.players[i].won;
    if (after && !before) { setWinOpen(w => ({ ...w, [i]: true })); rain(70); buzz.win(); }
    if (!after && before) setWinOpen(w => ({ ...w, [i]: false }));
    return next;
  }, [act, rain]);

  const changeCookies = useCallback((i: number, d: number) => {
    const cur = sRef.current;
    if (d > 0 && gameOver(cur)) { toast('Game over — open the menu to start a new one'); return 0; }
    const p = cur.players[i];
    const real = clamp(p.cookies + d, 0, GOAL_COOKIES) - p.cookies;
    if (!real) return 0;
    applyWithWin({ t: 'cookies', i, d }, i);
    return real;
  }, [applyWithWin, toast]);

  const changeFights = useCallback((i: number, d: number) => {
    const cur = sRef.current;
    if (d > 0 && gameOver(cur)) { toast('Game over — open the menu to start a new one'); return; }
    if (clamp(cur.players[i].fights + d, 0, GOAL_FIGHTS) === cur.players[i].fights) return;
    applyWithWin({ t: 'fights', i, d }, i);
    buzz.tap();
  }, [applyWithWin, toast]);

  const newGame = useCallback(() => {
    act({ t: 'new-game' });
    setDrawers({}); setWinOpen({}); setPick({ cur: null, chosen: null });
    toast(`New game — ${sRef.current.start} Cookies each`);
  }, [act, toast]);

  // sorteio de quem começa: o destaque passa pelos painéis e vai desacelerando
  const pickTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pickFirst = useCallback(() => {
    pickTimers.current.forEach(clearTimeout);
    pickTimers.current = [];
    const n = sRef.current.n;
    const winner = Math.floor(Math.random() * n);
    const steps = n * 3 + winner + 1;
    let t = 0;
    for (let k = 0; k < steps; k++) {
      t += 70 + k * k * 1.6;
      pickTimers.current.push(setTimeout(() => { setPick({ cur: k % n, chosen: null }); buzz.step(); }, t));
    }
    pickTimers.current.push(setTimeout(() => {
      setPick({ cur: null, chosen: winner });
      rain(24); buzz.win();
    }, t + 350));
    pickTimers.current.push(setTimeout(() => setPick(p => (p.chosen === winner ? { cur: null, chosen: null } : p)), t + 4350));
  }, [rain]);
  useEffect(() => () => pickTimers.current.forEach(clearTimeout), []);

  // botão "voltar" do Android: fecha menu/gavetas antes de sair do app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menu) { setMenu(false); return true; }
      if (Object.values(drawers).some(Boolean)) { act({ t: 'fix-names' }); setDrawers({}); return true; }
      return false;
    });
    return () => sub.remove();
  }, [menu, drawers, act]);

  const game: Game = useMemo(() => ({
    s, act, changeCookies, changeFights, drawers,
    setDrawer: (i, v) => { if (!v) act({ t: 'fix-names' }); setDrawers(d => ({ ...d, [i]: v })); },
    winOpen, closeWin: i => setWinOpen(w => ({ ...w, [i]: false })),
    newGame, toast, rain, pick,
  }), [s, act, changeCookies, changeFights, drawers, winOpen, newGame, toast, rain, pick]);

  const layout = getLayout(s.n, s.layout);
  const hubHidden = Object.values(drawers).some(Boolean) || Object.values(winOpen).some(Boolean);
  let idx = 0;

  return (
    <GameCtx.Provider value={game}>
      <StatusBar hidden />
      <View style={st.root} onLayout={e => setBoardSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Doodles width={boardSize.w} height={boardSize.h} color={C.doodle} opacity={0.75} />
        <View style={[st.board, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10, paddingLeft: insets.left + 10, paddingRight: insets.right + 10 }]}>
          {layout.rows.map((row, r) => (
            <View key={`${layout.id}-${r}`} style={[st.row, { flex: row.flex }]}>
              {row.cells.map(rot => {
                const i = idx++;
                return <Panel key={i} i={i} rot={rot} flex={1} />;
              })}
            </View>
          ))}
        </View>

        {!hubHidden && (
          <View pointerEvents="box-none" style={st.hubWrap}>
            <Pressable onPress={() => setMenu(true)} accessibilityLabel="Open menu" style={({ pressed }) => [st.hubRing, pressed && { transform: [{ scale: 0.92 }, { rotate: '-20deg' }] }]}>
              <View style={st.hub}><CookieArt size={44} /></View>
            </Pressable>
          </View>
        )}

        {menu && <Menu onClose={() => setMenu(false)} onPick={() => { setMenu(false); pickFirst(); }} />}

        {rains.map(r => <CookieRain key={r.id} drops={r.drops} onDone={() => setRains(x => x.filter(y => y.id !== r.id))} />)}

        <Animated.View pointerEvents="none" style={[st.toastWrap, { opacity: toastA, transform: [{ scale: toastA.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
          {toastMsg && <View style={st.toast}><Text style={st.toastTxt}>{toastMsg}</Text></View>}
        </Animated.View>
      </View>
    </GameCtx.Provider>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  board: { flex: 1, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  hubWrap: { ...FILL, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  hubRing: { padding: 5, borderRadius: 999, backgroundColor: C.paper, borderWidth: HAIR, borderColor: C.inkSoft },
  hub: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.cream, borderWidth: HAIR, borderColor: C.inkSoft, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { ...FILL, alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  toast: { maxWidth: '80%', backgroundColor: C.cream, borderWidth: HAIR, borderColor: C.inkSoft, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 10 },
  toastTxt: { fontFamily: F.m, fontSize: 15, color: C.ink, textAlign: 'center' },
});
