import React from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { bittenCookie, chips, handLine, handLoop, smoothPath, starPts } from './hand';
import { C } from './theme';

/* Cada ícone é uma lista de traços num quadro 24×24 (dados: 48×48).
   "fill" = preenchido na cor do ícone; "soft" = preenchimento bem leve. */
type Part = { d: string; fill?: boolean; soft?: number; sw?: number; dash?: string };

const pawPath = handLoop(12, 15.8, 4.3, 71, { jit: 0.1, n: 7, closed: true }) +
  chips([[6.4, 10.6, 1.8], [9.6, 6.7, 1.9], [14.4, 6.7, 1.9], [17.6, 10.6, 1.8]], 72);

const ICONS = {
  sliders: [{ d: handLine([[4, 8], [12.8, 8.3]], 11) + handLine([[17.3, 8.1], [20, 7.8]], 12) + handLine([[4, 16.1], [6.8, 15.9]], 13) + handLine([[11.2, 16], [20, 16.2]], 14) + handLoop(15, 8, 2.2, 15) + handLoop(9, 16, 2.2, 16) }],
  plus: [{ d: handLine([[5.4, 12.2], [18.6, 11.8]], 31) + handLine([[11.8, 5.4], [12.2, 18.6]], 32), sw: 2.2 }],
  minus: [{ d: handLine([[5.4, 12.2], [18.6, 11.8]], 33), sw: 2.2 }],
  close: [{ d: handLine([[6.2, 6.4], [17.8, 17.5]], 34) + handLine([[17.6, 6.2], [6.3, 17.8]], 35), sw: 2 }],
  check: [{ d: handLine([[5, 12.4], [9.6, 17.2], [19.2, 7]], 36, { wob: 0.1 }), sw: 2.4 }],
  cookie: [
    { d: bittenCookie(12, 12, 8.6, 41), sw: 1.6 },
    { d: chips([[8.8, 10, 1.05], [13, 11.6, 1.05], [10, 15.3, 1], [14.9, 15.6, 0.85]], 42) + chips([[22.6, 12.8, 0.6], [18.3, 2.4, 0.55]], 43), fill: true },
  ],
  paw: [{ d: pawPath, sw: 1.6 }],
  pawFill: [{ d: pawPath, fill: true }],
  // mapa das cartas de Objetivo: folha ondulada com o canto enrolado, rolo embaixo, trilha e X
  map: [
    { d: smoothPath([[4.9, 16.4], [4.4, 13.6], [5, 11.2], [4.2, 8.6], [4.5, 5.9], [6.3, 3.9], [10, 4.2], [14, 4.5], [17.6, 4.8], [20.4, 5.3], [18.7, 7.2], [18.1, 9.6], [18.8, 12.1], [18.3, 14.6], [18.9, 17.3]]), soft: 0.08 },
    { d: smoothPath([[6.3, 3.9], [7.6, 4.8], [7.1, 6.3], [5.5, 6.5]]) },
    { d: smoothPath([[3.4, 16.3], [8.4, 16.7], [13.6, 17.1], [19.2, 17.5], [20.5, 18.9], [19.5, 20.5], [13.4, 20.2], [8, 19.7], [3.3, 19.3], [2.6, 17.8]], true), soft: 0.22 },
    { d: smoothPath([[19.2, 17.5], [18.3, 18.8], [19, 19.9]]) },
    { d: 'M11.6 14.6C8.8 14.2 7.6 11.6 8.4 9.8C9 8.5 10.3 8 11.4 8.3', sw: 1.15, dash: '1.2 1.5' },
    { d: handLine([[12.7, 6.6], [15, 8.9]], 86) + handLine([[15, 6.6], [12.7, 8.9]], 87) },
  ],
  // mamadeira (ícone de lutas nas cartas): bico, anel, corpo com leite e marquinhas de medida
  bottle: [
    { d: smoothPath([[8.9, 12.6], [12, 12], [15.2, 12.8], [15.6, 19.4], [14.4, 21], [9.6, 21], [8.4, 19.4]], true), soft: 0.18, sw: 0 },
    { d: smoothPath([[10.3, 6.3], [10.5, 3.9], [12, 2.5], [13.5, 3.9], [13.7, 6.3]]) },
    { d: handLine([[8.3, 6.3], [15.7, 6.2], [15.8, 8.7], [8.2, 8.8]], 95, { closed: true, wob: 0.05 }) },
    { d: smoothPath([[8.7, 8.8], [7.7, 11], [7.8, 19.4], [9.3, 21.3], [14.7, 21.3], [16.2, 19.4], [16.3, 11], [15.3, 8.7]]) },
    { d: handLine([[10, 13.6], [11.8, 13.6]], 96) + handLine([[10, 16.2], [11.8, 16.2]], 97) + handLine([[10, 18.8], [11.8, 18.8]], 98), sw: 1.3 },
  ],
  layout: [{ d: handLine([[4, 4], [20, 4], [20, 20], [4, 20]], 91, { closed: true, wob: 0.06 }) + handLine([[12, 4.4], [12, 19.6]], 92) + handLine([[4.4, 12], [19.6, 12]], 93), sw: 1.6 }],
} satisfies Record<string, Part[]>;

export type IconName = keyof typeof ICONS;

// ícones desenhados inclinados (graus, girando em torno do centro)
const TILT: Partial<Record<IconName, number>> = { bottle: 30 };

export function Icon({ name, size = 22, color = C.ink, sw = 1.8 }: { name: IconName; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform={TILT[name] ? `rotate(${TILT[name]} 12 12)` : undefined}>
      {(ICONS[name] as Part[]).map((p, k) => (
        <Path
          key={k}
          d={p.d}
          fill={p.fill ? color : p.soft ? color : 'none'}
          fillOpacity={p.soft ?? 1}
          stroke={p.fill ? 'none' : color}
          strokeWidth={p.sw ?? sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={p.dash}
        />
      ))}
      </G>
    </Svg>
  );
}

/* ---- Dados do menu, desenhados à mão (quadro 48×48) ---- */
const L = (pts: [number, number][], seed: number, closed = true) => handLine(pts, seed, { closed });
export const DICE = [
  { n: 4, label: 'D4', d: L([[24, 5], [44, 40], [4, 40]], 41) },
  { n: 6, label: 'D6', d: L([[8, 8], [40, 8], [40, 40], [8, 40]], 61) },
  { n: 8, label: 'D8', d: L([[24, 3], [44, 24], [24, 45], [4, 24]], 81) + L([[5, 24], [43, 24]], 82, false) },
  { n: 10, label: 'D10', d: L([[24, 3], [44, 20], [24, 45], [4, 20]], 101) + L([[5, 20], [24, 28], [43, 20]], 102, false) + L([[24, 28], [24, 44]], 103, false) },
  { n: 12, label: 'D12', d: L([[24, 3], [44, 17], [37, 42], [11, 42], [4, 17]], 121) },
  { n: 20, label: 'D20', d: L([[24, 2], [44, 13], [44, 35], [24, 46], [4, 35], [4, 13]], 201) + L([[24, 3], [12, 30], [36, 30]], 202) + L([[12, 30], [24, 45], [36, 30]], 203, false) },
  { n: 100, label: 'D100', d: handLoop(24, 24, 20, 1001, { jit: 0.04, n: 10 }) + L([[14, 24], [34, 24]], 1002, false) },
];
export const COIN = handLoop(24, 24, 20, 3001, { jit: 0.04, n: 10 }) + handLoop(24, 24, 13, 3002, { jit: 0.06 });

export function Die({ d, size = 40, color }: { d: string; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ---- Cookie colorido (botão central e chuva de cookies) ---- */
const COOKIE_VARIANTS = [51, 731, 762, 793].map((seed, v) => {
  const R = (() => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const spot = (max: number, size: number): [number, number, number] => {
    const a = R() * Math.PI * 2, dd = R() * max;
    return [23 + Math.cos(a) * dd, 25 + Math.sin(a) * dd, size];
  };
  const body = v % 2 === 0 ? bittenCookie(24, 24, 20, seed) : handLoop(24, 24, 20, seed, { jit: 0.05, n: 10, closed: true });
  const chipsD = v === 0
    ? chips([[16, 17, 2.3], [27, 15, 2], [13.5, 28, 2.1], [24.5, 26, 2.4], [34, 31, 2.1], [21, 36, 1.9]], 52)
    : chips(Array.from({ length: 7 }, () => spot(12, 2 + R())), seed + 2);
  const specks = v === 0
    ? chips([[20, 21, 1], [31, 22.5, 1], [28, 35, 0.9], [12, 22, 0.8]], 53)
    : chips(Array.from({ length: 5 }, () => spot(14, 0.8)), seed + 3);
  return { body, chipsD, specks };
});

export function CookieArt({ size = 46, variant = 0 }: { size?: number; variant?: number }) {
  const v = COOKIE_VARIANTS[variant % COOKIE_VARIANTS.length];
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d={v.body} fill={C.cookie.dough} stroke={C.cookie.edge} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d={v.chipsD} fill={C.cookie.chip} />
      <Path d={v.specks} fill={C.cookie.speck} />
    </Svg>
  );
}

/* ---- Rabiscos de fundo (cookie, estrela, dado, coração, brilhos), repetidos em grade ---- */
const TILE = 170;
const DOODLE_LINES = [
  bittenCookie(32, 34, 13, 61),
  handLine(starPts(118, 31, 12, 5.5), 63, { closed: true, wob: 0.1 }),
  handLine([[100, 102], [123, 98], [127, 121], [104, 125]], 64, { closed: true }),
  smoothPath([[42, 141], [34, 134], [29, 127], [30, 121], [36, 118.5], [41.5, 122.5], [47, 118], [53, 120], [54.5, 126], [50, 133]], true),
  handLine([[78, 69], [80.5, 76.5], [88, 79], [80.5, 81.5], [78, 89], [75.5, 81.5], [68, 79], [75.5, 76.5]], 66, { closed: true, wob: 0.12 }),
  handLoop(150, 72, 2.7, 67) + handLoop(72, 154, 2.7, 68),
].join('');
const DOODLE_DOTS = chips([[27, 31, 1.7], [35, 33, 1.7], [30, 40, 1.6]], 62) + chips([[107, 106, 1.7], [113.5, 111.5, 1.7], [120, 117, 1.7]], 65);

export const Doodles = React.memo(function Doodles({ width, height, color, opacity }: { width: number; height: number; color: string; opacity: number }) {
  if (!width || !height) return null;
  const cols = Math.ceil(width / TILE), rows = Math.ceil(height / TILE);
  const tiles = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    tiles.push(
      <G key={`${x}-${y}`} transform={`translate(${x * TILE} ${y * TILE})`}>
        <Path d={DOODLE_LINES} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={DOODLE_DOTS} fill={color} />
      </G>,
    );
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none" opacity={opacity}>
      {tiles}
    </Svg>
  );
});
