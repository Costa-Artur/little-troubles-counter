import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { buzz, useGame } from './ctx';
import { Icon } from './icons';
import { defaultName, GOAL_COOKIES, GOAL_FIGHTS } from './state';
import { C, COLOR_KEYS, COLORS, F, HAIR, Palette, tint } from './theme';

/* A gaveta só faz o "fade" quando abre; marcar tarefas não remonta nada, então a tela não pisca. */
function Drawer({ c, children }: { c: Palette; children: React.ReactNode }) {
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }).start(); }, [fade]);
  return (
    <Animated.View style={[s.drawer, { borderColor: c.ln, opacity: fade }]}>
      <ScrollView contentContainerStyle={s.drawerIn} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

function CloseBtn({ c, onPress, size = 40 }: { c: Palette; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Close" style={[s.round, { width: size, height: size, borderColor: c.ln }]}>
      <Icon name="close" size={size * 0.45} color={c.fg} sw={2} />
    </Pressable>
  );
}

function MapBadge({ size = 40 }: { size?: number }) {
  return (
    <View style={[s.mapBadge, { width: size, height: size }]}>
      <Icon name="map" size={size * 0.65} color={C.map[2]} sw={1.4} />
    </View>
  );
}

/* ---------------- Ajustes do jogador ---------------- */
export function SettingsDrawer({ i, c }: { i: number; c: Palette }) {
  const g = useGame();
  const p = g.s.players[i];
  const step = (d: number, onPress: () => void) => (
    <Pressable key={d} onPress={onPress} style={({ pressed }) => [s.step, { borderColor: c.ln }, d > 0 && { backgroundColor: c.bg }, pressed && s.press]}>
      <Text style={[s.stepTxt, { color: c.fg }]}>{d > 0 ? '+' : '−'}{Math.abs(d)}</Text>
    </Pressable>
  );
  return (
    <Drawer c={c}>
      <View style={s.top}>
        <TextInput
          value={p.name}
          onChangeText={t => g.act({ t: 'player', i, patch: { name: t } })}
          onBlur={() => g.act({ t: 'fix-names' })}
          onEndEditing={() => g.act({ t: 'fix-names' })}
          placeholder={defaultName(i)}
          placeholderTextColor={C.inkSoft}
          maxLength={16}
          style={[s.input, { borderColor: c.ln }]}
          accessibilityLabel="Player name"
        />
        <CloseBtn c={c} onPress={() => g.setDrawer(i, undefined)} />
      </View>
      <Label left="Cookies" right={`win at ${GOAL_COOKIES}`} />
      <View style={s.steps}>
        {[-10, -5, -1].map(d => step(d, () => g.changeCookies(i, d)))}
        <Text style={[s.stepNum, { color: c.fg }]}>{p.cookies}</Text>
        {[1, 5, 10].map(d => step(d, () => g.changeCookies(i, d)))}
      </View>
      <Label left="Fights Won" right={`win at ${GOAL_FIGHTS}`} />
      <View style={s.steps}>
        {step(-1, () => g.changeFights(i, -1))}
        <Text style={[s.stepNum, { color: c.fg }]}>{p.fights}/{GOAL_FIGHTS}</Text>
        {step(1, () => g.changeFights(i, 1))}
      </View>
      <Label left="Color" />
      <View style={s.swatches}>
        {COLOR_KEYS.map(k => (
          <Pressable key={k} onPress={() => g.act({ t: 'player', i, patch: { color: k } })} accessibilityLabel={`color ${k}`}
            style={[s.swatch, { backgroundColor: COLORS[k][0], borderColor: COLORS[k][2] }, p.color === k && s.swatchOn]} />
        ))}
      </View>
    </Drawer>
  );
}

function Label({ left, right }: { left: string; right?: string }) {
  return (
    <View style={s.lbl}>
      <Text style={s.lblTxt}>{left}</Text>
      {right && <Text style={s.lblTxt}>{right}</Text>}
    </View>
  );
}

/* ---------------- Carta de Objetivo ----------------
   Toda carta de Objetivo (quest) tem o mapa do tesouro. Cada tarefa tem uma pegada:
   basta cumprir uma vez e não zera no fim do turno. */
export function GoalDrawer({ i, c, compact }: { i: number; c: Palette; compact: boolean }) {
  const g = useGame();
  const p = g.s.players[i];
  const goal = p.goal;
  const [armed, setArmed] = useState(false); // "Limpar objetivo" pede um segundo toque
  const armT = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(armT.current), []);
  const small = compact ? 32 : 40;

  if (!goal) {
    return (
      <Drawer c={c}>
        <View style={s.top}>
          <MapBadge size={small} />
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: c.fg, fontSize: compact ? 15 : 18 }]}>Played a Goal?</Text>
            {p.goalsDone > 0 && <Text style={s.sub}>{p.goalsDone} completed this game</Text>}
          </View>
          <CloseBtn c={c} size={small} onPress={() => g.setDrawer(i, undefined)} />
        </View>
        <View style={[s.lbl, { justifyContent: 'flex-start', alignItems: 'center' }]}>
          <Text style={s.lblTxt}>How many Tasks </Text>
          <Icon name="paw" size={15} color={C.inkSoft} sw={1.4} />
          <Text style={s.lblTxt}> does the card have?</Text>
        </View>
        <View style={[s.countGrid, compact && { flexWrap: 'nowrap', gap: 4 }]}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <Pressable key={n} onPress={() => { g.act({ t: 'goal-new', i, count: n }); buzz.tap(); }}
              style={({ pressed }) => [s.count, { borderColor: c.ln, height: compact ? 34 : 44 }, compact ? { flex: 1 } : { width: '23%' }, pressed && { backgroundColor: c.bg }]}>
              <Text style={[s.countTxt, { color: c.fg }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </Drawer>
    );
  }

  const done = goal.tasks.filter(Boolean).length;
  const all = done === goal.tasks.length;
  const many = goal.tasks.length > 4;
  const toggle = (k: number) => {
    const next = g.act({ t: 'goal-task', i, k });
    buzz.tap();
    const ng = next.players[i].goal;
    if (ng && ng.tasks.every(Boolean)) { g.rain(30); buzz.win(); }
  };
  const clear = () => {
    if (!armed) {
      setArmed(true);
      clearTimeout(armT.current);
      armT.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    setArmed(false);
    g.act({ t: 'goal-clear', i });
  };

  return (
    <Drawer c={c}>
      <View style={[s.top, compact && { marginBottom: 6 }]}>
        <MapBadge size={small} />
        <TextInput
          value={goal.name}
          onChangeText={t => g.act({ t: 'goal-name', i, name: t })}
          placeholder="Card name (optional)"
          placeholderTextColor={C.inkSoft}
          maxLength={28}
          style={[s.input, { borderColor: c.ln, height: small, borderRadius: 12, fontFamily: F.s }]}
          accessibilityLabel="Card name"
        />
        <CloseBtn c={c} size={small} onPress={() => g.setDrawer(i, undefined)} />
      </View>

      <View style={[s.tasks, { borderColor: c.ln }, compact ? s.tasksChips : many && s.tasksGrid]}>
        {goal.tasks.map((t, k) => (
          <Pressable key={k} onPress={() => toggle(k)} accessibilityRole="checkbox" accessibilityState={{ checked: t }}
            style={[
              compact ? [s.chip, { borderColor: tint(c.ln, 0.3) }, t && { backgroundColor: c.bg }]
                : [s.task, many && { width: '50%', paddingHorizontal: 4 }, (many ? k > 1 : k > 0) && { borderTopWidth: 1, borderTopColor: tint(c.ln, 0.4), borderStyle: 'dashed' }],
            ]}>
            <Icon name={t ? 'pawFill' : 'paw'} size={compact ? 22 : 28} color={t ? c.fg : c.ln} sw={1.6} />
            <Text style={[s.taskTxt, { fontSize: many || compact ? 15 : 16 }, t && !compact && s.taskDone, t && compact && { color: c.fg }]}>
              {compact ? '' : 'Task '}{k + 1}
            </Text>
            {t && !compact && !many && (
              <View style={[s.feita, { borderColor: c.ln, backgroundColor: c.bg }]}><Text style={{ fontFamily: F.r, fontSize: 12, color: c.fg }}>done</Text></View>
            )}
          </Pressable>
        ))}
      </View>

      <View style={[s.foot, compact && { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
        <View style={[s.reward, { borderColor: c.ln, backgroundColor: tint(c.bg, 0.55) }, compact && { flex: 1, minHeight: 34, paddingVertical: 3 },
          all && { backgroundColor: c.bg, borderStyle: 'solid' }]}>
          {all ? (
            <>
              <Text style={{ fontFamily: F.s, color: c.fg, fontSize: 15 }}>{compact ? 'All Tasks done!' : 'All Tasks done! Get the Reward.'}</Text>
              <Pressable onPress={() => g.act({ t: 'goal-finish', i })} style={[s.rewardBtn, { borderColor: c.ln }]}>
                <Text style={{ fontFamily: F.s, color: c.fg, fontSize: 14 }}>Send to Timeout</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: F.m, color: C.inkSoft, fontSize: 15 }}>Reward</Text>
              <Text style={{ fontFamily: F.m, color: C.inkSoft, fontSize: 13, marginLeft: 'auto' }}>{done} of {goal.tasks.length} Tasks</Text>
            </>
          )}
        </View>
        <Pressable onPress={clear} style={[s.clearBtn, { borderColor: armed ? C.danger[1] : c.ln, backgroundColor: armed ? C.danger[0] : C.cream },
          !compact && { alignSelf: 'flex-start', marginTop: 8 }]}>
          <Text style={{ fontFamily: F.m, fontSize: 13, color: armed ? C.danger[2] : C.inkSoft }}>{armed ? 'Tap again to clear' : 'Clear Goal'}</Text>
        </Pressable>
      </View>
    </Drawer>
  );
}

const s = StyleSheet.create({
  drawer: { position: 'absolute', left: 10, right: 10, top: 10, bottom: 10, borderRadius: 18, backgroundColor: C.cream, zIndex: 6, overflow: 'hidden' },
  drawerIn: { padding: 10, paddingTop: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  round: { borderRadius: 999, borderWidth: HAIR, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  mapBadge: { borderRadius: 12, borderWidth: HAIR, borderColor: C.map[1], backgroundColor: C.map[0], alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, height: 40, borderRadius: 999, borderWidth: HAIR, backgroundColor: '#fff', paddingHorizontal: 14, fontFamily: F.m, fontSize: 16, color: C.ink },
  title: { fontFamily: F.s },
  sub: { fontFamily: F.r, fontSize: 13, color: C.inkSoft },
  lbl: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 6 },
  lblTxt: { fontFamily: F.m, fontSize: 13, color: C.inkSoft },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  step: { flex: 1, height: 38, borderRadius: 12, borderWidth: HAIR, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontFamily: F.m, fontSize: 15 },
  stepNum: { flex: 1.3, textAlign: 'center', fontFamily: F.s, fontSize: 23 },
  press: { transform: [{ scale: 0.92 }] },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: HAIR },
  swatchOn: { borderWidth: 3, borderColor: C.ink },
  countGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  count: { borderRadius: 14, borderWidth: HAIR, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  countTxt: { fontFamily: F.s, fontSize: 19 },
  tasks: { backgroundColor: '#fff', borderWidth: HAIR, borderRadius: 16, paddingHorizontal: 4, paddingVertical: 2 },
  tasksGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  tasksChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingLeft: 6, paddingRight: 8, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  taskTxt: { fontFamily: F.m, color: C.ink },
  taskDone: { textDecorationLine: 'line-through', color: C.inkSoft },
  feita: { marginLeft: 'auto', borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 1 },
  foot: { marginTop: 8 },
  reward: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, borderRadius: 14, borderWidth: HAIR, borderStyle: 'dashed' },
  rewardBtn: { marginLeft: 'auto', height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: HAIR, backgroundColor: C.cream, justifyContent: 'center' },
  clearBtn: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: HAIR, justifyContent: 'center' },
});
