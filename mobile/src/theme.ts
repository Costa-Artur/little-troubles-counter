// Visual inspirado nas cartas: papel creme, molduras pastel e traços finos.
export const C = {
  paper: '#fdf4e3',
  cream: '#fffaf0',
  ink: '#4a3426',
  inkSoft: '#8a6a4a',
  line: '#dcc29c',
  doodle: '#e2cba6',
  danger: ['#f8b4a8', '#e06f5a', '#8a2b1e'] as const,
  orange: ['#f9c98f', '#d9772f', '#8a3d12'] as const,
  purple: ['#c9b6ec', '#7a5bc0', '#4b2f86'] as const,
  map: ['#ecd3b0', '#a0703f', '#5a3a1c'] as const,
  cookie: { dough: '#f3c88c', edge: '#9a6a3a', chip: '#6b4226', speck: '#d9a35f' },
};

export const HAIR = 1.5;

// [fundo pastel, tinta (texto), traço fino] — tons tirados das molduras das cartas
export const COLORS = {
  orange: ['#f9cd9c', '#7a340c', '#d9772f'],
  purple: ['#cdbdf0', '#432a7c', '#7a5bc0'],
  blue: ['#b9d6f3', '#1f4479', '#4f86c6'],
  yellow: ['#fbe3a0', '#6e4a00', '#d8a22a'],
  red: ['#f8bcae', '#80261a', '#e06f5a'],
  lilac: ['#f5c3dc', '#7c2350', '#d97aa7'],
  green: ['#c8e6b6', '#2b5a22', '#6aae55'],
  teal: ['#b5e3dc', '#1b5850', '#4aa99c'],
} as const;
export type ColorKey = keyof typeof COLORS;
export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];
export const DEFAULT_COLORS: ColorKey[] = ['orange', 'purple', 'blue', 'green', 'lilac', 'teal'];

export type Palette = { bg: string; fg: string; ln: string };
export const pal = (k: ColorKey): Palette => {
  const [bg, fg, ln] = COLORS[k] ?? COLORS.orange;
  return { bg, fg, ln };
};

// Fredoka: no React Native cada peso é uma família própria.
export const F = {
  r: 'Fredoka_400Regular',
  m: 'Fredoka_500Medium',
  s: 'Fredoka_600SemiBold',
  b: 'Fredoka_700Bold',
};

// Mistura simples de cor hex com branco (para fundos clarinhos).
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Ocupa todo o pai (o StyleSheet.absoluteFillObject saiu no React Native 0.88).
export const FILL = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;
