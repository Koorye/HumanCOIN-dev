/**
 * Figure data for the research figures.
 *
 * Everything here is derived from `stats.ts` by a stated rule, so no figure can
 * disagree with another about the same quantity and a reader can recompute any
 * of them from the ablation table the section prints underneath.
 */

import { ABLATION, COMBOS, type Modality } from './stats'

/* ---------------- scatter: modality count vs gain ---------------- */

export interface ScatterPoint {
  x: number
  y: number
  id: string
  combo: Modality[]
  metric: string
  color: string
}

const METRIC_COLOR = [
  'var(--p-1)',
  'var(--p-2)',
  'var(--p-3)',
  'var(--p-4)',
  'var(--p-5)',
  'var(--p-6)',
]

/**
 * Every (combination, metric) pair plotted as one point: how many non-vision
 * modalities the input had, against how much that bought over vision-only.
 * Gains are normalised by each metric's own baseline and signed so that
 * "better" is always up, which is the only way six metrics with three
 * different units can share one axis.
 */
export function scatterPoints(): ScatterPoint[] {
  const pts: ScatterPoint[] = []
  ABLATION.forEach((m, mi) => {
    const base = m.points[0].mean
    COMBOS.forEach((combo, ci) => {
      if (ci === 0) return
      const v = m.points[ci].mean
      const rel = (m.direction === 'up' ? v - base : base - v) / base
      pts.push({
        x: combo.length,
        y: rel * 100,
        id: `${m.id}-${ci}`,
        combo,
        metric: m.id,
        color: METRIC_COLOR[mi % METRIC_COLOR.length],
      })
    })
  })
  return pts
}

/** Ordinary least squares over the scatter, plus r². */
export function fitLine(pts: ScatterPoint[]) {
  const n = pts.length
  const mx = pts.reduce((a, p) => a + p.x, 0) / n
  const my = pts.reduce((a, p) => a + p.y, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const p of pts) {
    sxy += (p.x - mx) * (p.y - my)
    sxx += (p.x - mx) ** 2
    syy += (p.y - my) ** 2
  }
  const slope = sxx ? sxy / sxx : 0
  const intercept = my - slope * mx
  const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0
  return { slope, intercept, r2, mx, my }
}

/** Mean gain at each modality count, with its spread — the bars over the dots. */
export function gainByCount(pts: ScatterPoint[]) {
  const by = new Map<number, number[]>()
  for (const p of pts) {
    const arr = by.get(p.x) ?? []
    arr.push(p.y)
    by.set(p.x, arr)
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, arr]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length
      const sd = Math.sqrt(
        arr.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, arr.length - 1),
      )
      return { k, mean, sd, n: arr.length }
    })
}

/* ---------------- heatmap: cross-metric correlation ---------------- */

/**
 * Rank correlation between metrics across their eight combinations. Computed
 * rather than authored: a reader can recompute it from the table, which is the
 * point of showing it.
 */
export function metricCorrelation(): number[][] {
  const cols = ABLATION.map((m) => {
    const sign = m.direction === 'up' ? 1 : -1
    return m.points.map((p) => sign * p.mean)
  })
  const ranked = cols.map(rank)
  return ranked.map((a) => ranked.map((b) => pearson(a, b)))
}

function rank(v: number[]): number[] {
  const idx = v.map((x, i) => ({ x, i })).sort((p, q) => p.x - q.x)
  const out = new Array<number>(v.length)
  idx.forEach((e, r) => (out[e.i] = r))
  return out
}

function pearson(a: number[], b: number[]): number {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let sab = 0
  let saa = 0
  let sbb = 0
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb)
    saa += (a[i] - ma) ** 2
    sbb += (b[i] - mb) ** 2
  }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0
}

export const METRIC_SHORT = ABLATION.map((m) => m.id)
