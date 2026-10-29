/**
 * RQ 02 — event-centred evaluation, as a controlled comparison.
 *
 * `eventDemo.ts` shows the mechanism on one pair of authored trajectories; this
 * module is the other half of the answer: the same question asked of a set of
 * controls, so a reader can see that an extra signal moves the number and that
 * the movement is not an artefact of adding any channel at all.
 *
 * The numbers here are **simulated, not measured**. They are the means ± sample
 * SD of five synthetic runs under a fixed seed, derived below exactly as the
 * ablation table is, so the figure cannot drift from its stated rule. They are
 * deliberately kept apart from the authored 3D trajectories in `eventDemo.ts`:
 * nothing in the demo is a measurement, and nothing in this table is drawn from
 * the demo.
 */

import type { Bi } from '@/content'

/** Five runs per cell, the same n the ablation table reports. */
export const RUNS = 5
/** Fixed seed, so the table is identical on every render. */
export const SEED = 73

export interface EventTarget {
  id: string
  label: Bi
  /**
   * Time window the target is measured over, kept out of `label` because table
   * headers are set in uppercase and a unit symbol must not be upper-cased
   * ("1 s" is seconds; "1 S" is siemens).
   */
  window?: Bi
  unit: Bi
  /** `up` means larger is better. */
  direction: 'up' | 'down'
  /** Three decimals for AUROC, two for the rest. */
  digits: number
  /**
   * Centre of the synthetic distribution per control row, in `EVENT_CONTROLS`
   * order. The two ablation controls (shuffled, constant) are centred just off
   * the vision-only baseline on purpose: a weak, non-significant gain is what
   * they are there to show.
   */
  centres: [number, number, number, number]
  /** Spread of the five synthetic runs around each centre. */
  noise: number
}

export const EVENT_TARGETS: EventTarget[] = [
  {
    id: 'auroc',
    label: { en: 'Blocked-event AUROC', zh: '受阻事件 AUROC' },
    unit: { en: '', zh: '' },
    direction: 'up',
    digits: 3,
    centres: [0.66, 0.85, 0.67, 0.66],
    noise: 0.025,
  },
  {
    id: 'f1',
    label: { en: 'Recovery-action F1', zh: '恢复动作 F1' },
    unit: { en: '%', zh: '%' },
    direction: 'up',
    digits: 2,
    centres: [58, 81, 59, 58],
    noise: 2,
  },
  {
    id: 'ade',
    label: { en: 'Post-event ADE', zh: '事件后 ADE' },
    window: { en: '1 s', zh: '1 s' },
    unit: { en: 'cm', zh: 'cm' },
    direction: 'down',
    digits: 2,
    centres: [9.8, 5.1, 9.5, 9.7],
    noise: 0.5,
  },
  {
    id: 'fde',
    label: { en: 'Post-event FDE', zh: '事件后 FDE' },
    window: { en: '1 s', zh: '1 s' },
    unit: { en: 'cm', zh: 'cm' },
    direction: 'down',
    digits: 2,
    centres: [16.4, 8.5, 16.0, 16.2],
    noise: 0.7,
  },
]

export interface EventControl {
  id: string
  label: Bi
  /** The row the claim is about, drawn apart from its controls. */
  proposedRow?: boolean
  /** The two rows that must *not* improve: no temporal information in either. */
  ablationControl?: boolean
}

export const EVENT_CONTROLS: EventControl[] = [
  { id: 'vision', label: { en: 'Vision only', zh: '仅视觉' } },
  {
    id: 'eeg',
    label: { en: 'Vision + EEG', zh: '视觉 + 脑电' },
    proposedRow: true,
  },
  {
    id: 'shuffled',
    label: { en: 'Vision + shuffled EEG', zh: '视觉 + 时间打乱脑电' },
    ablationControl: true,
  },
  {
    id: 'constant',
    label: { en: 'Vision + constant EEG', zh: '视觉 + 常量脑电' },
    ablationControl: true,
  },
]

export interface EventCell {
  mean: number
  sd: number
}

/**
 * Deterministic LCG shared by every cell. The stream is consumed target-major
 * (all four rows of a target, then the next target), so the draws are a pure
 * function of the seed and the target index — replaying the table cannot shift
 * a value because a row was added.
 */
function stream(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Mean and sample SD (ddof = 1) of `RUNS` draws from ±`noise`/2 about `centre`. */
export function sample(centre: number, noise: number, next: () => number): EventCell {
  const runs = Array.from({ length: RUNS }, () => centre + (next() - 0.5) * noise)
  const mean = runs.reduce((a, b) => a + b, 0) / RUNS
  const sd = Math.sqrt(runs.reduce((a, b) => a + (b - mean) ** 2, 0) / (RUNS - 1))
  return { mean, sd }
}

/**
 * The whole table, derived in one pass: rows of controls, columns of targets.
 * Computed rather than typed out, so the caption and the cells cannot disagree.
 */
export function eventResults(): EventCell[][] {
  const next = stream(SEED)
  const byTarget = EVENT_TARGETS.map((target) =>
    target.centres.map((centre) => sample(centre, target.noise, next)),
  )
  /* Transpose to row-major, which is the order the table reads. */
  return EVENT_CONTROLS.map((_, row) => byTarget.map((col) => col[row]))
}

/** Row index of the proposed signal, for the rows and columns keyed off it. */
export const PROPOSED_ROW = EVENT_CONTROLS.findIndex((c) => c.proposedRow)

/** ADE column index, for the reduction column the demo most directly answers. */
export const ADE_TARGET = EVENT_TARGETS.findIndex((t) => t.id === 'ade')

/**
 * Absolute change from the vision-only row, in the target's own direction, as a
 * percentage. Errors use the inverse, so a positive number is always better —
 * the same convention the ablation matrix uses.
 */
export function changeVsVision(row: number, target: number): number {
  const cells = eventResults()
  const base = cells[0][target].mean
  const v = cells[row][target].mean
  if (!base) return 0
  return ((EVENT_TARGETS[target].direction === 'up' ? v - base : base - v) / base) * 100
}

/**
 * ADE reduction of each control against vision-only, as a percentage. The
 * trajectory error is what the demo's two paths are about, so it is the column
 * a reader will want to set beside the 3D branch.
 */
export function adeReduction(row: number): number | null {
  if (row === 0 || ADE_TARGET < 0) return null
  const cells = eventResults()
  const base = cells[0][ADE_TARGET].mean
  return ((base - cells[row][ADE_TARGET].mean) / base) * 100
}
