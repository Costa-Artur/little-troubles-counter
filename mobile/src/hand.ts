/* Traço "desenhado à mão": gera caminhos SVG levemente tortos.
   Sempre iguais, pois usam uma semente fixa. */

type Pt = [number, number];

export const rng = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const f2 = (n: number) => Math.round(n * 100) / 100;
const pt = (p: Pt) => `${f2(p[0])} ${f2(p[1])}`;

// Curva suave passando por todos os pontos (Catmull-Rom → Bézier).
export function smoothPath(pts: Pt[], closed = false): string {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pt(P[1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d += `C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return closed ? d + 'Z' : d;
}

// Círculo torto; aberto, ele "passa do ponto" no fim, como um traço feito de uma vez.
export function handLoop(cx: number, cy: number, r: number, seed: number, { jit = 0.08, n = 9, closed = false } = {}): string {
  const R = rng(seed);
  const a0 = R() * Math.PI * 2;
  const span = closed ? (Math.PI * 2 * (n - 1)) / n : Math.PI * 2 + 0.5;
  const pts = Array.from({ length: n }, (_, k): Pt => {
    const a = a0 + (span * k) / (n - 1);
    const rr = r * (1 + (R() - 0.5) * 2 * jit);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  return smoothPath(pts, closed);
}

// Linha (ou polígono): cada trecho vira dois pedacinhos curvos, como mão tremida.
export function handLine(pts: Pt[], seed: number, { closed = false, wob = 0.13 } = {}): string {
  const R = rng(seed);
  const P = closed ? [...pts, pts[0]] : pts;
  let d = `M${pt([P[0][0] + (R() - 0.5) * 0.6, P[0][1] + (R() - 0.5) * 0.6])}`;
  for (let i = 0; i < P.length - 1; i++) {
    const [a, b] = [P[i], P[i + 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    const mid: Pt = [(a[0] + b[0]) / 2 + nx * (R() - 0.5) * len * 0.06, (a[1] + b[1]) / 2 + ny * (R() - 0.5) * len * 0.06];
    for (const [p, q] of [[a, mid], [mid, b]] as [Pt, Pt][]) {
      const half = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const off = (R() - 0.5) * 2 * wob * half;
      d += `Q${pt([(p[0] + q[0]) / 2 + nx * off, (p[1] + q[1]) / 2 + ny * off])} ${pt(q)}`;
    }
  }
  if (closed) {
    const [a, b] = [P[0], P[1]];
    d += `L${pt([a[0] + (b[0] - a[0]) * 0.12 + (R() - 0.5), a[1] + (b[1] - a[1]) * 0.12 + (R() - 0.5)])}`;
  }
  return d;
}

// Cookie com uma mordida no canto superior direito.
export function bittenCookie(cx: number, cy: number, r: number, seed: number): string {
  const R = rng(seed);
  const bx = cx + r * 0.8235, by = cy - r * 0.8235, br = r * 0.47;
  const dist = Math.hypot(bx - cx, by - cy);
  const ux = (bx - cx) / dist, uy = (by - cy) / dist;
  const a = (r * r - br * br + dist * dist) / (2 * dist);
  const h = Math.sqrt(r * r - a * a);
  const A: Pt = [cx + a * ux - h * uy, cy + a * uy + h * ux];
  const B: Pt = [cx + a * ux + h * uy, cy + a * uy - h * ux];
  const angA = Math.atan2(A[1] - cy, A[0] - cx);
  let angB = Math.atan2(B[1] - cy, B[0] - cx);
  if (angB < angA) angB += Math.PI * 2;
  const n = 9;
  const pts: Pt[] = [A];
  for (let k = 1; k < n; k++) {
    const t = angA + ((angB - angA) * k) / n;
    const rr = r * (1 + (R() - 0.5) * 0.1);
    pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  pts.push(B);
  const M: Pt = [bx - ux * br, by - uy * br];
  const c: Pt = [2 * M[0] - (A[0] + B[0]) / 2 + (R() - 0.5) * r * 0.08, 2 * M[1] - (A[1] + B[1]) / 2 + (R() - 0.5) * r * 0.08];
  return `${smoothPath(pts)}Q${pt(c)} ${pt(A)}Z`;
}

// Gotas de chocolate: bolinhas tortas, preenchidas.
export function chips(list: [number, number, number][], seed: number): string {
  return list.map(([x, y, r], k) => handLoop(x, y, r, seed + k * 7, { jit: 0.22, n: 5, closed: true })).join('');
}

export const starPts = (cx: number, cy: number, R1: number, R2: number): Pt[] =>
  Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R2 : R1;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
