/**
 * RQ 02 — authored counterfactual cases.
 *
 * Two branches start from the same state and separate only at the event, so the
 * consequence of an extra signal is visible rather than asserted. Both the
 * trajectories and the signal sketches are authored for legibility: this module
 * holds no measurement, and the figure says so.
 *
 * The unit is a tabletop world, roughly a metre across. Time is seconds, with
 * the event at `EVENT`.
 */

import type { Bi } from '@/content'

export const DURATION = 8
export const EVENT = 3.2

/**
 * Where the shared approach path ends, in the tabletop frame, as a plain tuple.
 * Exported so the world can plant the socket and the crate exactly at the pose
 * the hand arrives at instead of at hand-tuned coordinates.
 */
export const CONTACT_END: Vec3 = [-0.95 + 1.33, 0.28, 0.3 - 0.4]
/** The crate the hand closes on, and its resting height. */
export const LOAD_CRATE: Vec3 = [0.2, 0.1, -0.04]

export type Vec3 = [number, number, number]

/** What one branch does with the hand, as a function of clip time. */
export interface BranchDef {
  trajectory: (time: number) => Vec3
  /** Where the predicted path is heading, stated as an outcome. */
  outcome: Bi
}

export interface EventCaseDef {
  id: 'contact' | 'load'
  tab: Bi
  task: Bi
  /** The instrument feeding the second branch. */
  signal: 'EEG' | 'EMG'
  accent: 'violet' | 'amber'
  /** Object being manipulated, drawn in the paired worlds. */
  target: { kind: 'socket' | 'crate'; label: Bi }
  branches: { vision: BranchDef; extra: BranchDef }
  /** Illustrative signal series over the whole clip, in 0–100 display units. */
  sketch: number[]
  /** Time at which the sketch leaves its baseline, before the hand moves. */
  leadAt: number
  event: Bi
  lead: Bi
  role: Bi
}

/* ---------------- trajectory helpers ---------------- */

const ease = (a: number, b: number, t: number) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/**
 * Deterministic noise for the signal sketches. A fixed seed keeps the figure
 * identical across renders, so it does not shimmer when a tab is revisited.
 */
function noise(seed: number, n: number): number[] {
  let s = seed >>> 0
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out.push(s / 4294967296 - 0.5)
  }
  return out
}

/** Baseline wander plus noise, so a sketch reads as a signal and not a ruler. */
function baseline(seed: number, n: number, level: number, amp: number): number[] {
  const nz = noise(seed, n)
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1)
    return level + nz[i] * amp + Math.sin(u * 21 + seed) * amp * 0.5
  })
}

const N = 480

/**
 * Blocked contact. The second branch reads a transient that starts slightly
 * before the hand reverses; the first branch has no such input, so it keeps
 * pushing into the obstruction.
 */
function contactSketch(): number[] {
  const base = baseline(17, N, 54, 2.6)
  const lead = 2.86
  return base.map((v, i) => {
    const t = (i / (N - 1)) * DURATION
    // Pre-movement negativity: the part a vision-only model cannot see.
    const pre = -13 * Math.exp(-(((t - lead) / 0.22) ** 2))
    // Event-related deflection at the blocked contact, then decay.
    const post = t >= EVENT
      ? 30 * Math.exp(-(((t - (EVENT + 0.24)) / 0.34) ** 2)) - 9 * Math.exp(-((t - (EVENT + 0.85)) / 1.5))
      : 0
    return v + pre + post
  })
}

/**
 * Load ambiguity. Two crates look identical; the heavier one announces itself
 * as a step in recruitment at contact, before the lift speed shows it.
 */
function loadSketch(): number[] {
  const base = baseline(41, N, 46, 2.2)
  const lead = 3.02
  return base.map((v, i) => {
    const t = (i / (N - 1)) * DURATION
    const step = 22 * ease(lead, EVENT + 0.12, t)
    const spike = 26 * Math.exp(-(((t - (EVENT + 0.1)) / 0.18) ** 2))
    return v + step + spike
  })
}

/* ---------------- the two cases ---------------- */

/*
 * Both branches share one pre-event path, written once so the two cannot drift
 * apart: any separation in the figure is the post-event term and nothing else.
 */

/** Contact case, before the obstruction: reach from a start pose to the socket. */
function contactPre(time: number): Vec3 {
  const u = ease(0, EVENT, time)
  return [-0.95 + u * 1.33, 0.28, 0.3 - u * 0.4]
}

/** Contact case: push straight on, so the failed contact is carried forward. */
const contactVision: BranchDef = {
  trajectory: (time) => {
    const [x, y, z] = contactPre(time)
    const after = Math.max(0, time - EVENT)
    return [x + after * 0.11, y - after * 0.012, z]
  },
  outcome: { en: 'Keeps advancing into the obstruction', zh: '持续推进，顶住障碍' },
}

/** Contact case: retract, arc over to realign, then insert on the retry. */
const contactExtra: BranchDef = {
  trajectory: (time) => {
    const [x, y, z] = contactPre(time)
    const after = Math.max(0, time - EVENT)
    if (after <= 0) return [x, y, z]
    const retract = ease(0, 1.4, after)
    const retry = ease(1.9, 4.4, after)
    return [
      x - 0.42 * retract + 0.58 * retry,
      y + 0.12 * Math.sin(retry * Math.PI),
      z + 0.14 * retract - 0.14 * retry,
    ]
  },
  outcome: { en: 'Retracts, realigns, inserts on the retry', zh: '回撤、重新对齐，再插成功' },
}

/** Load case, before contact: reach down onto the crate and close the grip. */
function loadPre(time: number): Vec3 {
  const u = ease(0, EVENT, time)
  return [-0.3 + u * 0.5, 0.55 - u * 0.29, 0.25 - u * 0.29]
}

/** Load case: lift as though the crate were light. */
const loadVision: BranchDef = {
  trajectory: (time) => {
    const [x, y, z] = loadPre(time)
    const after = Math.max(0, time - EVENT)
    return [x, y + after * 0.3, z + after * 0.03]
  },
  outcome: { en: 'Lifts at the speed a light crate would allow', zh: '按轻物的速度抬起' },
}

/** Load case: recruitment holds the load, so the lift is slower and steadier. */
const loadExtra: BranchDef = {
  trajectory: (time) => {
    const [x, y, z] = loadPre(time)
    const after = Math.max(0, time - EVENT)
    const wobble = Math.sin(after * 3.4) * 0.005 * Math.exp(-after / 2.4)
    return [x + wobble, y + after * 0.135, z + after * 0.015]
  },
  outcome: { en: 'Grip holds the load, so the crate rises slowly and evenly', zh: '握力承受负载，箱子缓慢而平稳地升起' },
}

export const EVENT_CASES: EventCaseDef[] = [
  {
    id: 'contact',
    tab: { en: 'Blocked contact · + EEG', zh: '接触受阻 · + 脑电' },
    task: { en: 'Seat the connector; the first attempt is blocked', zh: '插入接口；第一次尝试受阻' },
    signal: 'EEG',
    accent: 'violet',
    target: { kind: 'socket', label: { en: 'Socket', zh: '插座' } },
    branches: { vision: contactVision, extra: contactExtra },
    sketch: contactSketch(),
    leadAt: 2.86,
    event: {
      en: 'The connector is blocked. Vision alone sees a hand that is still moving, so its prediction carries the failed push forward.',
      zh: '接口受阻。仅凭视觉看到的是一只仍在移动的手，因此它的预测把这次失败的推进继续外推。',
    },
    lead: {
      en: 'Event-related activity leaves baseline about a third of a second before the hand reverses. That gap is the whole point: it is the part of the recovery a vision-only model cannot see.',
      zh: '事件相关活动在手改变方向前约三分之一秒就离开了基线。这个时间差正是关键：它是仅视觉模型看不到的那部分恢复过程。',
    },
    role: {
      en: 'EEG is not reading intent. It carries a time-stamped marker that a failed contact has been registered, and that marker arrives before the retraction does.',
      zh: '脑电并不读取意图。它给出的是一个带时间戳的标记，说明失败接触已被察觉，而这个标记比回撤动作更早到达。',
    },
  },
  {
    id: 'load',
    tab: { en: 'Load ambiguity · + EMG', zh: '负载歧义 · + 肌电' },
    task: { en: 'Two crates look identical; one is heavy', zh: '两个箱子外观相同，其中一个更重' },
    signal: 'EMG',
    accent: 'amber',
    target: { kind: 'crate', label: { en: 'Crate', zh: '箱子' } },
    branches: { vision: loadVision, extra: loadExtra },
    sketch: loadSketch(),
    leadAt: 3.02,
    event: {
      en: 'Contact is made. Vision sees the same crate either way, so its prediction lifts at the one speed the appearance supports.',
      zh: '接触发生。无论轻重，视觉看到的箱子都一样，因此它的预测只会按外观所支持的那一种速度抬起。',
    },
    lead: {
      en: 'Recruitment steps up at contact and stays up, before the lift height reveals any difference. The load is legible in the muscle while the motion still looks the same.',
      zh: '肌电募集在接触时阶跃上升并保持，而抬升高度此时还没有显出差别。当动作看起来仍一样时，负载已经在肌肉上读出。',
    },
    role: {
      en: 'EMG measures activation, not weight. What it adds is the effort the hand is exerting, which is exactly the quantity appearance cannot report.',
      zh: '肌电测量的是激活，不是重量。它补充的是手正在付出的力——恰好是外观无法报告的那个量。',
    },
  },
]
