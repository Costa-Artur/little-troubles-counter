import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { buzz, useGame } from './ctx';
import { Doodles, Icon } from './icons';
import { GoalDrawer, SettingsDrawer } from './Drawers';
import { displayName, GOAL_COOKIES, GOAL_FIGHTS, gameOver } from './state';
import { C, F, FILL, HAIR, pal, Palette } from './theme';
import type { Rot } from './layouts';

const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* Segurar = ±10 a cada meio segundo. Só um toque vale por vez:
   um segundo dedo (pinça/zoom) cancela tudo, para o contador nunca "disparar sozinho". */
let activeHold: { cancel: () => void } | null = null;

type Hold = { timer?: ReturnType<typeof setTimeout>; repeated: boolean };

function useHold(onStep: (big: boolean) => boolean, onTap: () => void) {
  const stepRef = useRef(onStep);
  const tapRef = useRef(onTap);
  useEffect(() => { stepRef.current = onStep; tapRef.current = onTap; });
  const [pressed, setPressed] = useState(false);
  const hold = useRef<Hold | null>(null);
  const me = useRef<{ cancel: () => void }>({ cancel: () => {} });

  // funções estáveis (criadas uma vez), para o controle de "toque ativo" funcionar entre renderizações
  const api = useMemo(() => {
    const stop = () => {
      if (hold.current?.timer) clearTimeout(hold.current.timer);
      hold.current = null;
      setPressed(false);
      if (activeHold === me.current) activeHold = null;
    };
    const handlers = {
      onStartShouldSetResponder: () => true,
      // quem já está segurando não entrega o toque para outro dedo
      onResponderTerminationRequest: () => false,
      onResponderGrant: (e: GestureResponderEvent) => {
        me.current.cancel = stop;
        if (activeHold && activeHold !== me.current) activeHold.cancel();
        if (e.nativeEvent.touches.length > 1) return;
        const cur: Hold = { repeated: false };
        hold.current = cur;
        activeHold = me.current;
        setPressed(true);
        const rep = () => {
          if (hold.current !== cur) return;
          cur.repeated = true;
          if (!stepRef.current(true)) { stop(); return; } // chegou no limite ou partida encerrada
          buzz.step();
          cur.timer = setTimeout(rep, 550);
        };
        cur.timer = setTimeout(rep, 450);
      },
      onResponderMove: (e: GestureResponderEvent) => { if (e.nativeEvent.touches.length > 1) stop(); },
      onResponderRelease: () => {
        const h = hold.current;
        if (h && !h.repeated) { stepRef.current(false); tapRef.current(); }
        stop();
      },
      onResponderTerminate: stop,
    };
    return { handlers, stop };
  }, []);

  useEffect(() => api.stop, [api]);
  return { pressed, handlers: api.handlers };
}

function Zone({ sign, onStep, onTap, label }: { sign: 1 | -1; onStep: (sign: 1 | -1, big: boolean) => boolean; onTap: () => void; label: string }) {
  const { pressed, handlers } = useHold(big => onStep(sign, big), onTap);
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      {...handlers}
      style={[StyleSheet.absoluteFill, sign < 0 ? { right: '50%' } : { left: '50%' }, pressed && { backgroundColor: 'rgba(255,255,255,.35)' }]}
    />
  );
}

export function Panel({ i, rot, flex }: { i: number; rot: Rot; flex: number }) {
  const g = useGame();
  const p = g.s.players[i];
  const c = pal(p.color);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sideways = rot === 90 || rot === 270;
  const iw = sideways ? size.h : size.w;
  const ih = sideways ? size.w : size.h;

  // indicador de variação recente (+7, −3...)
  const [delta, setDelta] = useState(0);
  const deltaT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [bump] = useState(() => new Animated.Value(1));
  const addDelta = (d: number) => {
    setDelta(x => x + d);
    clearTimeout(deltaT.current);
    deltaT.current = setTimeout(() => setDelta(0), 1600);
    bump.setValue(1.08);
    Animated.spring(bump, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };
  useEffect(() => () => clearTimeout(deltaT.current), []);

  const step = (sign: 1 | -1, big: boolean) => {
    const real = g.changeCookies(i, sign * (big ? 10 : 1));
    if (real) addDelta(real);
    return real !== 0;
  };
  const onTap = () => {
    buzz.tap();
    if (!g.s.hintShown) { g.act({ t: 'hint' }); g.toast('Tip: hold for ±10'); }
  };

  const over = gameOver(g.s);
  const view = g.drawers[i];
  const picking = g.pick.cur;
  const highlighted = picking === i || g.pick.chosen === i;
  const dim = picking !== null && picking !== i;

  // medidas proporcionais ao painel (substitui as container queries da versão web)
  const compact = ih < 240;
  // faixa baixa e larga (topo/base das mesas de 5–6): número e lutas lado a lado
  const wide = ih < 200 && iw > ih * 1.8;
  const numSize = wide ? Math.min(ih * 0.46, iw * 0.16) : Math.min(ih * 0.36, iw * 0.3);
  const nameSize = wide ? clampN(ih * 0.1, 11, 15) : Math.min(ih * 0.075, iw * 0.054);
  const glyph = Math.min(ih * 0.14, iw * 0.1);
  const lbl = wide ? clampN(ih * 0.085, 11, 15) : clampN(ih * 0.055, 12, 19);
  const corner = clampN(ih * 0.14, 34, 42);
  const fb = clampN(ih * 0.15, 34, 48);
  const goal = p.goal;
  const gDone = goal ? goal.tasks.filter(Boolean).length : 0;
  const gComplete = !!goal && gDone === goal.tasks.length;

  return (
    <View
      style={[s.panel, { flex, backgroundColor: c.bg, borderColor: c.ln }, dim && { opacity: 0.35 }, picking === i && { transform: [{ scale: 1.02 }] }]}
      onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Doodles width={size.w} height={size.h} color="#ffffff" opacity={0.5} />
      <View pointerEvents="none" style={[s.frame, { borderColor: c.ln }, highlighted ? { borderStyle: 'solid', borderWidth: 3 } : { opacity: 0.8 }]} />
      {iw > 0 && (
        <View style={[s.inner, { width: iw, height: ih, left: (size.w - iw) / 2, top: (size.h - ih) / 2, transform: [{ rotate: `${rot}deg` }] }]}>
          <Zone sign={-1} onStep={step} onTap={onTap} label="Fewer Cookies (tap: 1, hold: 10)" />
          <Zone sign={1} onStep={step} onTap={onTap} label="More Cookies (tap: 1, hold: 10)" />

          <View pointerEvents="box-none" style={[s.content, wide && { flexDirection: 'row', gap: 14, paddingLeft: corner + iw * 0.05 + 6, paddingRight: 10 }]}>
            <View pointerEvents="box-none" style={{ alignItems: 'center', width: wide ? undefined : '100%' }}>
            <View pointerEvents="none" style={[s.pill, { borderColor: c.ln, maxWidth: wide ? iw * 0.3 : iw * 0.62, marginBottom: ih * 0.015 }]}>
              <Text numberOfLines={1} style={{ fontFamily: F.s, fontSize: nameSize, color: c.fg }}>{displayName(p, i)}</Text>
            </View>

            <View pointerEvents="none" style={[s.numRow, { paddingHorizontal: iw * 0.07 }, wide && { width: undefined, paddingHorizontal: 0, justifyContent: 'center' }]}>
              {!wide && <Glyph c={c} size={glyph} compact={compact} name="minus" />}
              <Animated.View style={{ transform: [{ scale: bump }] }}>
                <Text style={{ fontFamily: F.s, fontSize: numSize, lineHeight: numSize * 1.02, color: c.fg, fontVariant: ['tabular-nums'] }}>{p.cookies}</Text>
                {delta !== 0 && (
                  <Text style={[s.delta, { fontSize: Math.min(ih * 0.1, iw * 0.07), color: c.fg }]}>{delta > 0 ? `+${delta}` : `−${-delta}`}</Text>
                )}
              </Animated.View>
              {!wide && <Glyph c={c} size={glyph} compact={compact} name="plus" faded={over} />}
            </View>

            <View pointerEvents="none" style={s.lblRow}>
              <Icon name="cookie" size={lbl * 1.15} color={c.fg} />
              <Text style={{ fontFamily: F.m, fontSize: lbl, color: c.fg }}> Cookies <Text style={{ opacity: 0.6 }}>/ {GOAL_COOKIES}</Text></Text>
            </View>
            <View pointerEvents="none" style={[s.bar, { width: wide ? Math.min(iw * 0.26, 140) : Math.min(iw * 0.52, 250), height: clampN(ih * 0.03, 7, 11), borderColor: c.ln }]}>
              <View style={{ width: `${(p.cookies / GOAL_COOKIES) * 100}%`, height: '100%', backgroundColor: c.ln, borderRadius: 99 }} />
            </View>
            </View>

            <Fights i={i} c={c} width={wide ? Math.min(iw * 0.42, 240) : Math.min(iw * 0.86, 340)} btn={wide ? clampN(ih * 0.24, 32, 42) : fb} ih={wide ? ih * 1.6 : ih} over={over} flat={wide} />
          </View>

          <Pressable onPress={() => g.setDrawer(i, 'settings')} accessibilityLabel="Player options"
            style={[s.corner, { borderColor: c.ln, height: corner, minWidth: corner, top: wide ? ih * 0.08 : ih * 0.06, left: iw * 0.05 }]}>
            <Icon name="sliders" size={corner * 0.5} color={c.fg} />
          </Pressable>
          <Pressable onPress={() => g.setDrawer(i, 'goal')} accessibilityLabel="Goal card"
            style={[s.corner, { borderColor: c.ln, height: corner, minWidth: corner }, { top: wide ? ih * 0.08 : ih * 0.06, right: iw * 0.05 },
              goal && { backgroundColor: c.bg }, gComplete && { backgroundColor: c.ln }]}>
            <Icon name="map" size={corner * 0.55} color={gComplete ? C.cream : c.fg} />
            {goal && <Text style={{ fontFamily: F.s, fontSize: clampN(ih * 0.05, 13, 17), color: gComplete ? C.cream : c.fg, marginLeft: 4 }}>{gDone}/{goal.tasks.length}</Text>}
          </Pressable>

          {g.pick.chosen === i && (
            <View pointerEvents="none" style={s.badgeWrap}>
              <View style={[s.badge, { borderColor: c.ln }]}>
                <Text style={{ fontFamily: F.s, fontSize: clampN(ih * 0.09, 18, 30), color: c.fg }}>You go first</Text>
              </View>
            </View>
          )}

          {view === 'settings' && <SettingsDrawer i={i} c={c} />}
          {view === 'goal' && <GoalDrawer i={i} c={c} compact={compact} />}
          {g.winOpen[i] && <Win i={i} c={c} iw={iw} ih={ih} />}
        </View>
      )}
    </View>
  );
}

function Glyph({ c, size, compact, name, faded }: { c: Palette; size: number; compact: boolean; name: 'plus' | 'minus'; faded?: boolean }) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: size, opacity: faded ? 0.2 : compact ? 0.55 : 0.75 },
      !compact && { borderWidth: HAIR, borderColor: c.ln, backgroundColor: 'rgba(255,250,240,.7)' }]}>
      <Icon name={name} size={size * (compact ? 0.7 : 0.52)} color={c.fg} />
    </View>
  );
}

function Fights({ i, c, width, btn, ih, over, flat }: { i: number; c: Palette; width: number; btn: number; ih: number; over: boolean; flat?: boolean }) {
  const g = useGame();
  const f = g.s.players[i].fights;
  const fs = flat ? 14 : clampN(ih * 0.055, 13, 20);
  return (
    <View style={[s.fights, { width, borderColor: c.ln, marginTop: flat ? 0 : ih * 0.026 }]} accessibilityLabel={`Fights won: ${f} of ${GOAL_FIGHTS}`}>
      <Pressable onPress={() => g.changeFights(i, -1)} accessibilityLabel="Remove a Fight Won" style={({ pressed }) => [s.fBtn, { width: btn, height: btn, borderColor: c.ln }, pressed && s.press]}>
        <Icon name="minus" size={btn * 0.46} color={c.fg} sw={2.2} />
      </Pressable>
      <View style={s.fMid}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="bottle" size={fs * 1.35} color={c.fg} sw={1.5} />
          <Text numberOfLines={1} style={{ fontFamily: F.m, fontSize: fs, color: c.fg }}>
            <Text style={{ fontFamily: F.s, fontSize: fs * 1.55 }}>{f}</Text>
            <Text style={{ opacity: 0.65, fontSize: fs * 0.78 }}> / {GOAL_FIGHTS}{flat ? '' : ' Fights Won'}</Text>
          </Text>
        </View>
        <View style={s.segs}>
          {Array.from({ length: GOAL_FIGHTS }, (_, k) => (
            <View key={k} style={[s.seg, { borderColor: c.ln, height: clampN(ih * 0.026, 6, 9) }, k < f && { backgroundColor: c.ln }]} />
          ))}
        </View>
      </View>
      <Pressable onPress={() => g.changeFights(i, 1)} accessibilityLabel="Add a Fight Won"
        style={({ pressed }) => [s.fBtn, { width: btn, height: btn, borderColor: c.ln, backgroundColor: c.bg }, over && { opacity: 0.3 }, pressed && s.press]}>
        <Icon name="plus" size={btn * 0.46} color={c.fg} sw={2.2} />
      </Pressable>
    </View>
  );
}

function Win({ i, c, iw, ih }: { i: number; c: Palette; iw: number; ih: number }) {
  const g = useGame();
  const p = g.s.players[i];
  const why = p.cookies >= GOAL_COOKIES ? `${p.cookies} Cookies` : `${p.fights} Fights Won`;
  return (
    <View style={[s.win, { backgroundColor: c.bg }]}>
      <View style={[s.pill, { borderColor: c.ln, paddingHorizontal: 14 }]}>
        <Text style={{ fontFamily: F.m, fontSize: clampN(ih * 0.055, 13, 18), letterSpacing: 3, color: c.fg }}>VICTORY</Text>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.s, fontSize: Math.min(ih * 0.17, iw * 0.11), color: c.fg, marginTop: ih * 0.02 }}>{displayName(p, i)}</Text>
      <Text style={{ fontFamily: F.m, fontSize: Math.min(ih * 0.07, iw * 0.05), color: c.fg, opacity: 0.75 }}>{why}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: ih * 0.03 }}>
        <Pressable onPress={g.newGame} style={[s.winBtn, { borderColor: c.ln, backgroundColor: C.cream }]}>
          <Text style={{ fontFamily: F.s, fontSize: 15, color: c.fg }}>New game</Text>
        </Pressable>
        <Pressable onPress={() => g.closeWin(i)} style={[s.winBtn, { borderColor: c.ln }]}>
          <Text style={{ fontFamily: F.s, fontSize: 15, color: c.fg }}>See scores</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { borderRadius: 28, borderWidth: HAIR, overflow: 'hidden' },
  frame: { position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, borderRadius: 21, borderWidth: HAIR, borderStyle: 'dashed' },
  inner: { position: 'absolute' },
  content: { ...FILL, alignItems: 'center', justifyContent: 'center' },
  pill: { backgroundColor: C.cream, borderWidth: HAIR, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 1 },
  numRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  delta: { position: 'absolute', left: '100%', top: '4%', marginLeft: 6, fontFamily: F.s, opacity: 0.85 },
  lblRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  bar: { marginTop: 6, backgroundColor: C.cream, borderWidth: HAIR, borderRadius: 99, overflow: 'hidden' },
  fights: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 5, borderRadius: 20, backgroundColor: C.cream, borderWidth: HAIR },
  fBtn: { borderRadius: 14, borderWidth: HAIR, alignItems: 'center', justifyContent: 'center' },
  press: { transform: [{ scale: 0.9 }] },
  fMid: { flex: 1, alignItems: 'center', gap: 4 },
  segs: { flexDirection: 'row', gap: 3, width: '100%', paddingHorizontal: 4 },
  seg: { flex: 1, borderRadius: 9, borderWidth: 1 },
  corner: { position: 'absolute', zIndex: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.cream, borderWidth: HAIR, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  badgeWrap: { ...FILL, alignItems: 'center', justifyContent: 'center', zIndex: 4 },
  badge: { backgroundColor: C.cream, borderWidth: HAIR, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 8 },
  win: { position: 'absolute', left: 10, right: 10, top: 10, bottom: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 7 },
  winBtn: { height: 42, paddingHorizontal: 20, borderRadius: 999, borderWidth: HAIR, alignItems: 'center', justifyContent: 'center' },
});
