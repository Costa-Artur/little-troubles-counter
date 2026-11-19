import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { CookieArt } from './icons';

export type Drop = { size: number; x: number; drift: number; delay: number; dur: number; spin: number; variant: number };

// Sorteia os cookies na hora em que a chuva começa (fora da renderização). x vai de 0 a 1.
export function makeDrops(count: number): Drop[] {
  return Array.from({ length: count }, (_, k) => ({
    size: 24 + Math.random() * 26,
    x: Math.random(),
    drift: (Math.random() - 0.5) * 60,
    delay: Math.random() * 900,
    dur: 1600 + Math.random() * 1400,
    spin: (Math.random() - 0.5) * 720,
    variant: k % 4,
  }));
}

/* Chuva de cookies: cada cookie cai do topo girando e balançando de leve. */
export function CookieRain({ drops, onDone }: { drops: Drop[]; onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const [anims] = useState(() => drops.map(() => new Animated.Value(0)));
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!alive) return;
      if (reduce) { done.current(); return; }
      Animated.parallel(anims.map((t, k) => Animated.timing(t, {
        toValue: 1, duration: drops[k].dur, delay: drops[k].delay, easing: Easing.in(Easing.quad), useNativeDriver: true,
      }))).start(() => done.current());
    });
    return () => { alive = false; };
  }, [anims, drops]);

  return (
    <>
      {drops.map((p, k) => (
        <Animated.View
          key={k}
          pointerEvents="none"
          style={[s.cookie, {
            left: p.x * W - p.size / 2,
            transform: [
              { translateY: anims[k].interpolate({ inputRange: [0, 1], outputRange: [-p.size - 20, H + p.size] }) },
              { translateX: anims[k].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift, p.drift * 0.3] }) },
              { rotate: anims[k].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }]}
        >
          <CookieArt size={p.size} variant={p.variant} />
        </Animated.View>
      ))}
    </>
  );
}

const s = StyleSheet.create({
  cookie: { position: 'absolute', top: 0, zIndex: 30 },
});
