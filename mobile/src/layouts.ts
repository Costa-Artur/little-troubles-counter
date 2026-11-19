/* Disposições da mesa, no estilo do Lotus.
   Cada disposição é uma lista de linhas (de cima para baixo); cada célula é um jogador
   e diz para que lado o conteúdo fica virado:
   0 = de pé (jogador embaixo), 180 = de cabeça para baixo (jogador em cima),
   90 / 270 = de lado (jogador à esquerda / à direita). */

export type Rot = 0 | 90 | 180 | 270;
export type Row = { flex: number; cells: Rot[] };
export type Layout = { id: string; rows: Row[] };

const side: Rot[] = [90, 270];
const r = (cells: Rot[], flex = 1): Row => ({ flex, cells });

export const LAYOUTS: Record<number, Layout[]> = {
  2: [
    { id: '2-face', rows: [r([180]), r([0])] },
    { id: '2-side', rows: [r(side)] },
    { id: '2-same', rows: [r([0]), r([0])] },
  ],
  3: [
    { id: '3-sides-bottom', rows: [r(side), r([0], 0.75)] },
    { id: '3-top-sides', rows: [r([180], 0.75), r(side)] },
    { id: '3-stack', rows: [r([180]), r([0]), r([0])] },
  ],
  4: [
    { id: '4-grid', rows: [r(side), r(side)] },
    { id: '4-cross', rows: [r([180], 0.7), r(side, 1.3), r([0], 0.7)] },
    { id: '4-ends', rows: [r([180, 180]), r([0, 0])] },
  ],
  5: [
    { id: '5-sides-bottom', rows: [r(side), r(side), r([0], 0.7)] },
    { id: '5-top-sides', rows: [r([180], 0.7), r(side), r(side)] },
    { id: '5-top-ends', rows: [r([180], 0.7), r(side, 1.2), r([0, 0])] },
  ],
  6: [
    { id: '6-grid', rows: [r(side), r(side), r(side)] },
    { id: '6-cross', rows: [r([180], 0.6), r(side), r(side), r([0], 0.6)] },
    { id: '6-ends', rows: [r([180, 180]), r(side), r([0, 0])] },
  ],
};

export const PLAYER_COUNTS = [2, 3, 4, 5, 6];

export function getLayout(n: number, id?: string): Layout {
  const list = LAYOUTS[n] ?? LAYOUTS[2];
  return list.find(l => l.id === id) ?? list[0];
}
