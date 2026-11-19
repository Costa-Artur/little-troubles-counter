import React, { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buzz, useGame } from './ctx';
import { COIN, DICE, Die, Doodles, Icon } from './icons';
import { getLayout, Layout, LAYOUTS, PLAYER_COUNTS } from './layouts';
import { C, F, FILL, HAIR, pal } from './theme';

type Roll = { v: string | number; label: string } | null;

export function Menu({ onClose, onPick }: { onClose: () => void; onPick: () => void }) {
  const g = useGame();
  const insets = useSafeAreaInsets();
  const [roll, setRoll] = useState<Roll>(null);
  const [rollKey, setRollKey] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [rules, setRules] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const doRoll = (r: Roll) => { setRoll(r); setRollKey(k => k + 1); buzz.step(); };
  const startNew = () => {
    setConfirm(false);
    g.newGame();
    onClose();
  };
  const current = getLayout(g.s.n, g.s.layout);

  return (
    <View style={s.menu} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Doodles width={size.w} height={size.h} color={C.doodle} opacity={0.75} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <View style={s.card}>
          <View style={s.titleRing}>
            <View style={s.title}>
              <Text style={s.titleTxt}>Little Troubles</Text>
              <Text style={s.titleSub}>Table counter</Text>
            </View>
          </View>

          <View style={[s.box, s.rollOut]}>
            {roll ? <RollValue key={rollKey} roll={roll} /> : <Text style={s.soft}>Roll a die or flip a coin</Text>}
          </View>

          <Pressable onPress={onPick} style={({ pressed }) => [s.bigBtn, pressed && s.press]}>
            <Text style={s.bigTxt}>Who goes first?</Text>
          </Pressable>

          <View style={[s.box, s.dice]}>
            {DICE.map(d => (
              <Pressable key={d.n} onPress={() => doRoll({ v: 1 + Math.floor(Math.random() * d.n), label: d.label })} style={({ pressed }) => [s.die, pressed && s.diePress]}>
                <Die d={d.d} color={C.purple[1]} />
                <Text style={s.dieTxt}>{d.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => doRoll({ v: Math.random() < 0.5 ? 'Heads' : 'Tails', label: 'Coin' })} style={({ pressed }) => [s.die, pressed && s.diePress]}>
              <Die d={COIN} color={C.purple[1]} />
              <Text style={s.dieTxt}>Coin</Text>
            </Pressable>
          </View>

          <View style={[s.box, s.row]}>
            <Text style={s.rowTxt}>Players</Text>
            <View style={s.seg}>
              {PLAYER_COUNTS.map(n => (
                <Pressable key={n} onPress={() => g.act({ t: 'players', n })} style={[s.segBtn, g.s.n === n && s.segOn]}>
                  <Text style={[s.segTxt, g.s.n === n && { color: C.purple[2] }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[s.box, { padding: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Icon name="layout" size={18} color={C.inkSoft} sw={1.5} />
              <Text style={s.rowTxt}>Table layout</Text>
            </View>
            <View style={s.layouts}>
              {LAYOUTS[g.s.n].map(l => (
                <Pressable key={l.id} onPress={() => { g.act({ t: 'layout', id: l.id }); buzz.tap(); }} accessibilityLabel={`Layout ${l.id}`}
                  style={[s.thumbWrap, current.id === l.id && s.thumbOn]}>
                  <LayoutThumb layout={l} start={g.s.start} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[s.box, s.row]}>
            <Text style={s.rowTxt}>Starting Cookies</Text>
            <View style={s.stepper}>
              <Pressable onPress={() => g.act({ t: 'start', d: -5 })} style={s.segBtn}><Icon name="minus" size={16} color={C.ink} /></Pressable>
              <Text style={s.stepNum}>{g.s.start}</Text>
              <Pressable onPress={() => g.act({ t: 'start', d: 5 })} style={s.segBtn}><Icon name="plus" size={16} color={C.ink} /></Pressable>
            </View>
          </View>

          <Pressable onPress={() => setConfirm(true)} style={({ pressed }) => [s.mBtn, pressed && s.press]}>
            <Text style={s.mBtnTxt}>New game</Text>
          </Pressable>

          <View style={s.box}>
            <Pressable onPress={() => setRules(r => !r)} style={s.rulesHead}>
              <Text style={s.rowTxt}>Rules reminders</Text>
              <Text style={[s.rowTxt, { color: C.inkSoft }]}>{rules ? '−' : '+'}</Text>
            </Pressable>
            {rules && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 6 }}>
                {RULES.map((r, k) => (
                  <View key={k} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: C.orange[1], fontFamily: F.b }}>•</Text>
                    <Text style={s.rule}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable onPress={onClose} accessibilityLabel="Close menu" style={s.closeRing}>
            <View style={s.close}><Icon name="close" size={20} color={C.ink} sw={2} /></View>
          </Pressable>
        </View>
      </ScrollView>

      {/* confirmação da nova partida */}
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <Pressable style={s.backdrop} onPress={() => setConfirm(false)}>
          <Pressable style={s.dialog} onPress={() => {}}>
            <View style={s.dialogIn}>
              <Text style={s.dialogTitle}>Start a new game?</Text>
              <Text style={s.dialogTxt}>Everyone goes back to {g.s.start} Cookies and 0 Fights Won, and Goals are cleared.</Text>
              <View style={s.dialogBtns}>
                <Pressable onPress={() => setConfirm(false)} style={({ pressed }) => [s.dBtn, pressed && s.press]}>
                  <Text style={s.mBtnTxt}>Cancel</Text>
                </Pressable>
                <Pressable onPress={startNew} style={({ pressed }) => [s.dBtn, s.dBtnMain, pressed && s.press]}>
                  <Text style={[s.mBtnTxt, { fontFamily: F.s, color: C.orange[2] }]}>Start</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function RollValue({ roll }: { roll: NonNullable<Roll> }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6 }).start(); }, [a]);
  const spin = a.interpolate({ inputRange: [0, 1], outputRange: ['-540deg', '0deg'] });
  return (
    <>
      <Animated.Text style={[s.rollVal, typeof roll.v === 'string' && { fontSize: 42 }, { opacity: a, transform: [{ rotate: spin }, { scale: a }] }]}>{roll.v}</Animated.Text>
      <Text style={s.soft}>{roll.label}</Text>
    </>
  );
}

/* Miniatura de uma disposição: cada jogador vira um retângulo com o "30" virado para o seu lado. */
export function LayoutThumb({ layout, start, w = 70, h = 112 }: { layout: Layout; start: number; w?: number; h?: number }) {
  let idx = 0;
  return (
    <View style={{ width: w, height: h, gap: 3 }}>
      {layout.rows.map((row, r) => (
        <View key={r} style={{ flex: row.flex, flexDirection: 'row', gap: 3 }}>
          {row.cells.map((rot, k) => {
            const c = pal((['orange', 'purple', 'blue', 'green', 'lilac', 'teal'] as const)[idx++]);
            return (
              <View key={k} style={{ flex: 1, borderRadius: 6, borderWidth: 1, borderColor: c.ln, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.s, fontSize: 11, color: c.fg, transform: [{ rotate: `${rot}deg` }] }}>{start}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const RULES = [
  'Win by scoring 100 Cookies or 10 Fights Won. An Alternate Win Condition from a card beats both.',
  'Fight: a Character whose Confidence ≥ the opposing Character\'s Maturity wins; the loser is Regressed or sent to Timeout and the winner gets the loser\'s Cookie and Draw Reward. Both can win; if neither does, it\'s a Tie.',
  'Resource Phase: total your Draw and Cookie Resources (add/subtract first, then multiply/divide). After your first turn, you get 1 extra card draw each Resource Phase.',
  'On each player\'s first turn: no Fight Phase and no extra card draw.',
  'Each player can play up to 4 cards/abilities in the Build Phase and 4 in the Fight Phase. The non-turn player can only play Quick cards/abilities.',
  'End of turn: with over 9 cards in hand, discard down to 9. The Playground has 10 Main Zones for Characters and Toys (1 card per zone).',
  'Goal: each Task only needs to be completed once and does not reset at the end of the turn. Complete every Task to get the Reward(s), then the Goal goes to Timeout. Playing a new Goal sends the current one to Timeout.',
  'Bribe: X — to choose a Character with Bribe that you don\'t control, pay its controller X Cookies.',
  'Tie-breaker (both reach a win at once): add each player\'s % of 100 Cookies and % of 10 Fights Won (each capped at 100%). Highest total wins.',
];

const s = StyleSheet.create({
  menu: { ...FILL, backgroundColor: C.paper, zIndex: 20 },
  scroll: { alignItems: 'center', paddingHorizontal: 16 },
  card: { width: '100%', maxWidth: 380, gap: 12 },
  titleRing: { alignSelf: 'center', marginTop: 8, marginBottom: 4, padding: 5, borderRadius: 999, backgroundColor: C.orange[0], borderWidth: HAIR, borderColor: C.orange[1] },
  title: { backgroundColor: C.cream, borderWidth: HAIR, borderColor: C.orange[1], borderRadius: 999, paddingHorizontal: 26, paddingVertical: 8, alignItems: 'center' },
  titleTxt: { fontFamily: F.s, fontSize: 24, color: '#9a4a17' },
  titleSub: { fontFamily: F.r, fontSize: 13, color: C.inkSoft },
  box: { backgroundColor: C.cream, borderWidth: HAIR, borderColor: C.line, borderRadius: 22 },
  rollOut: { height: 112, alignItems: 'center', justifyContent: 'center' },
  rollVal: { fontFamily: F.s, fontSize: 60, color: '#6a46b0', lineHeight: 66 },
  soft: { fontFamily: F.r, fontSize: 13.5, color: C.inkSoft },
  bigBtn: { height: 56, borderRadius: 999, backgroundColor: C.orange[0], borderWidth: HAIR, borderColor: C.orange[1], alignItems: 'center', justifyContent: 'center' },
  bigTxt: { fontFamily: F.s, fontSize: 19, color: C.orange[2] },
  press: { transform: [{ scale: 0.97 }] },
  dice: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  die: { width: '25%', alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 16 },
  diePress: { backgroundColor: '#efe6fb' },
  dieTxt: { fontFamily: F.m, fontSize: 12.5, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingLeft: 16, paddingRight: 10 },
  rowTxt: { fontFamily: F.m, fontSize: 16, color: C.ink },
  seg: { flexDirection: 'row', gap: 5 },
  segBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: HAIR, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.purple[0], borderColor: C.purple[1] },
  segTxt: { fontFamily: F.m, fontSize: 17, color: C.ink },
  layouts: { flexDirection: 'row', justifyContent: 'space-around' },
  thumbWrap: { padding: 6, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: C.purple[1], backgroundColor: '#efe6fb' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepNum: { minWidth: 34, textAlign: 'center', fontFamily: F.s, fontSize: 20, color: C.ink },
  mBtn: { height: 48, borderRadius: 999, backgroundColor: C.cream, borderWidth: HAIR, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  mBtnTxt: { fontFamily: F.m, fontSize: 16, color: C.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(74,52,38,.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 340, padding: 6, borderRadius: 30, backgroundColor: C.orange[0], borderWidth: HAIR, borderColor: C.orange[1] },
  dialogIn: { backgroundColor: C.cream, borderRadius: 24, borderWidth: HAIR, borderColor: C.orange[1], borderStyle: 'dashed', padding: 20, gap: 10, alignItems: 'center' },
  dialogTitle: { fontFamily: F.s, fontSize: 21, color: C.ink, textAlign: 'center' },
  dialogTxt: { fontFamily: F.r, fontSize: 14.5, lineHeight: 20, color: C.inkSoft, textAlign: 'center' },
  dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 6, alignSelf: 'stretch' },
  dBtn: { flex: 1, height: 46, borderRadius: 999, borderWidth: HAIR, borderColor: C.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dBtnMain: { backgroundColor: C.orange[0], borderColor: C.orange[1] },
  rulesHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  rule: { flex: 1, fontFamily: F.r, fontSize: 14, lineHeight: 21, color: C.ink },
  closeRing: { alignSelf: 'center', marginTop: 6, padding: 5, borderRadius: 999, borderWidth: HAIR, borderColor: C.line, backgroundColor: C.paper },
  close: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.cream, borderWidth: HAIR, borderColor: C.inkSoft, alignItems: 'center', justifyContent: 'center' },
});
