/**
 * The processing framework figure, authored as data.
 *
 * Seven pathways enter on the left — six measured signals plus the annotation
 * layer. Each keeps its own native rate and passes a pair of processing modules
 * chosen for that modality, then all of them meet one shared contract before an
 * episode field exists.
 *
 * Field names and formulas stay in English in both languages: they are schema
 * identifiers, not prose. Only lane, stage and node titles are translated.
 *
 * Every lane here has a counterpart in the acquisition inventory, so this
 * figure and the hardware list cannot disagree about what was recorded.
 */
import type { Bi } from '@/content'

export type PfTone = 'blue' | 'teal' | 'rose' | 'violet' | 'amber' | 'slate' | 'ink'

export interface PfBox {
  /** Module name; translated. */
  title: Bi
  /** Schema field names and formulas; identifiers, kept in English. */
  lines: readonly string[]
}

export interface PfLane {
  id: string
  /** Lane title; translated. */
  title: Bi
  tone: PfTone
  /** What this pathway contributes, in one sentence. */
  prose: Bi
  /** The named route or model this pathway runs, where one is chosen. */
  method?: string
  /** What the sensor emits, before any processing. */
  raw: readonly string[]
  /** First processing module. */
  a: PfBox
  /** Second processing module. */
  b: PfBox
  /** The fields this lane contributes to an episode. */
  out: readonly string[]
}

export const PF_LANES: PfLane[] = [
  {
    id: 'geometry',
    title: { en: 'Scene geometry', zh: '场景几何' },
    tone: 'blue',
    prose: {
      en: 'Camera frames become world points, with the metric scale anchored from calibration so clouds from different sessions are comparable.',
      zh: '相机帧转为世界点，米制尺度由标定锚定，不同场次的点云因此可以相互比较。',
    },
    method: 'Depth Anything 3 / Fast-FoundationStereo',
    raw: ['RGB · head / wrist [M]', 'native frames · cam'],
    a: {
      title: { en: 'Depth · alternative routes', zh: '深度 · 二选一' },
      lines: ['mono + stereo depth', 'metric scale anchoring'],
    },
    b: {
      title: { en: 'Unproject → point cloud', zh: '反投影 → 点云' },
      lines: ['X = z · K⁻¹ · p', 'stereo: z = fB / disparity'],
    },
    out: ['rgb_frame, depth_m', 'points_world, valid'],
  },
  {
    id: 'gaze',
    title: { en: 'Gaze & attention', zh: '注视与注意' },
    tone: 'teal',
    prose: {
      en: 'Measured gaze and predicted gaze stay in separate fields, and each carries the transform that placed it in the ego frame.',
      zh: '实测注视与预测注视分列不同字段，各自携带将其映射到第一人称坐标系的变换。',
    },
    method: 'Gaze prediction: EgoM2P',
    raw: ['Eye tracker [M] + RGB', 't_native · gaze_conf'],
    a: {
      title: { en: 'Keep sources separate', zh: '来源分别保留' },
      lines: ['measured gaze [M]', 'predicted gaze [E]'],
    },
    b: {
      title: { en: 'Heatmap & spatial ray', zh: '热图与空间射线' },
      lines: ['density → gaze_heatmap', 'K⁻¹p → ray / depth hit'],
    },
    out: ['gaze_uv, heatmap', 'gaze_ray, source_kind'],
  },
  {
    id: 'hand',
    title: { en: 'Hands & kinematics', zh: '手部与运动学' },
    tone: 'rose',
    prose: {
      en: 'Hand joints come from vision in the open tiers and from glove plus tracker at the top tier; both routes write the same joint convention and a per-joint confidence.',
      zh: '手部关节在开放层级来自视觉，在最高层级来自手套与追踪器；两条路径写入同一套关节约定，并给出逐关节置信度。',
    },
    method: 'MANUS gloves + VIVE Tracker',
    raw: ['RGB + glove + tracker', 'joints_local · pose'],
    a: {
      title: { en: 'Vision / wearable routes', zh: '视觉与穿戴双路径' },
      lines: ['RGB → 2D → 3D joints [E]', 'glove + tracker poses [M]'],
    },
    b: {
      title: { en: 'Kinematics & transforms', zh: '运动学与坐标变换' },
      lines: ['glove ↔ tracker calib.', 'wrist / head pose'],
    },
    out: ['hand_joints, wrist_pose', 'joint_conf, frame_id'],
  },
  {
    id: 'eeg',
    title: { en: 'Brain activity', zh: '脑活动' },
    tone: 'violet',
    prose: {
      en: 'EEG is re-referenced, band-passed and screened for bad channels; band power comes from the cleaned signal, and any reconstructed channel goes to its own field instead of overwriting the measured one.',
      zh: 'EEG 经重参考、带通滤波与坏道筛查；频带功率由清洗后的信号计算，重建通道写入独立字段，不覆盖实测信号。',
    },
    method: 'Channel reconstruction: ZUNA',
    raw: ['EEG channels [M]', 'native Hz · electrode'],
    a: {
      title: { en: 'Filter & channel QC', zh: '滤波与通道质检' },
      lines: ['re-reference · bandpass', 'notch · bad-channel mask'],
    },
    b: {
      title: { en: 'Measured / rebuilt', zh: '实测与重建分立' },
      lines: ['QC EEG [M] → recon [R]', 'kept in separate fields'],
    },
    out: ['eeg_clean, bandpower', 'eeg_recon [R], mask'],
  },
  {
    id: 'emg',
    title: { en: 'Bilateral muscle', zh: '双侧肌电' },
    tone: 'amber',
    prose: {
      en: 'EMG is band-passed, rectified and enveloped, then reduced to windowed RMS, MAV and activation, with clipping and dropout masks carried alongside.',
      zh: 'EMG 经带通、整流与包络，再归约为窗口 RMS、MAV 与激活值，并同时携带饱和与丢失掩码。',
    },
    method: 'Filter bands set by the acquisition protocol',
    raw: ['EMG channels [M]', 'native Hz · muscle'],
    a: {
      title: { en: 'Signal conditioning', zh: '信号调理' },
      lines: ['bandpass → rectify', 'envelope · per native rate'],
    },
    b: {
      title: { en: 'Windowed features', zh: '窗口特征' },
      lines: ['RMS · MAV · activation', 'clipping / dropout masks'],
    },
    out: ['emg_envelope, rms', 'emg_mav, act_mask'],
  },
  {
    id: 'audio',
    title: { en: 'Audio', zh: '音频' },
    tone: 'slate',
    prose: {
      en: 'Audio is framed into log-mel features; each frame keeps its centre time and span, so the features can be placed back on the master clock.',
      zh: '音频分帧转为 log-mel 特征；每帧保留中心时刻与时长，特征因此可以放回主时钟。',
    },
    raw: ['PCM audio [M]', 'native Hz · channel_id'],
    a: {
      title: { en: 'Framing & spectrum', zh: '分帧与频谱' },
      lines: ['window → STFT → log-mel', 'keep centre / span'],
    },
    b: {
      title: { en: 'Acoustic features', zh: '声学特征' },
      lines: ['spectral energy · onset', 'clipping / silence / QC'],
    },
    out: ['audio_logmel, rms', 'audio_onset, bounds'],
  },
  {
    id: 'semantic',
    title: { en: 'Tasks & semantics', zh: '任务与语义' },
    tone: 'ink',
    prose: {
      en: 'The task protocol, the object registry and human labels supply the action, object and hand fields, each bound to the interval it describes.',
      zh: '任务协议、物体注册表与人工标注给出动作、物体与手别字段，各自绑定其所描述的区间。',
    },
    method: 'Automatic labelling + sampled human review',
    raw: ['task protocol · registry', 'action / object [A]'],
    a: {
      title: { en: 'Semantic annotation', zh: '语义标注' },
      lines: ['action intervals', 'object_id · annotator'],
    },
    b: {
      title: { en: 'Registry & label checks', zh: '注册表与标签检查' },
      lines: ['object identity · ontology', 'label version · validity'],
    },
    out: ['action_id, object_id', 'hand, task_id [A]'],
  },
]

export interface PfNode {
  id: string
  title: Bi
  lines: readonly string[]
  tone: PfTone
  /** Hangs off the quality gate as a side branch, not part of the main chain. */
  branch?: boolean
}

/** The shared contract every lane passes through, in order. */
export const PF_NODES: PfNode[] = [
  {
    id: 'temporal',
    title: { en: 'Temporal calibration', zh: '时间校准' },
    tone: 'ink',
    lines: [
      '(1+drift)·t_native + offset',
      'anchors → offset / drift',
      'nearest: |Δt| ≤ tolerance',
      'window [t₀, t₁] → aggregate',
    ],
  },
  {
    id: 'spatial',
    title: { en: 'Spatial calibration', zh: '空间校准' },
    tone: 'ink',
    lines: [
      'X_world = T_wc · X_cam',
      'K · extrinsics · scale',
      'glove ↔ tracker ↔ world',
      'unknown calibration → mask',
    ],
  },
  {
    id: 'qc',
    title: { en: 'Quality gate', zh: '质量门控' },
    tone: 'ink',
    lines: [
      'confidence · saturation',
      'gaps · bad channels',
      'reprojection error',
      'pass → retain; fail → flag',
    ],
  },
  {
    id: 'fusion',
    title: { en: 'Query fusion & slicing', zh: '按查询融合与切片' },
    tone: 'ink',
    lines: [
      'time join + transforms',
      'native rates; no fill',
      'M / E / R / A separate',
      'episode_id · valid_mask',
    ],
  },
  {
    id: 'reject',
    title: { en: 'Reject branch', zh: '拒绝支路' },
    tone: 'rose',
    branch: true,
    lines: ['qc_reason · raw_ref'],
  },
]

export interface PfStage {
  n: string
  title: Bi
  sub: Bi
}

export const PF_STAGES: PfStage[] = [
  {
    n: '01',
    title: { en: 'Native input', zh: '原生输入' },
    sub: { en: 'Async samples · raw kept', zh: '异步采样 · 保留原始' },
  },
  {
    n: '02',
    title: { en: 'Modality processing', zh: '模态处理' },
    sub: { en: 'One module pair per signal', zh: '每路信号一对模块' },
  },
  {
    n: '03',
    title: { en: 'Calibration, QC & fusion', zh: '校准、质量与融合' },
    sub: { en: 'One shared clock and frame contract', zh: '共享的时钟与坐标契约' },
  },
  {
    n: '04',
    title: { en: 'Unified episode', zh: '统一片段' },
    sub: { en: 'Conceptual fields · on demand', zh: '概念字段 · 按需查询' },
  },
]

/** Provenance footer: what every output field carries with it. */
export const PF_PROV: readonly string[] = [
  'raw_ref · device_id · native_rate_hz · t_native / t_ref · offset / drift · K · T_world_camera · units / frame_id',
  'source_kind [M/E/R/A] · confidence · valid_mask · qc_reason · method version · calibration_id · annotation_version',
]

export const PF_FOOT: Bi = {
  en: 'Every field above keeps the raw reference, the clock and frame it was expressed in, and the quality flags that survived the gate. A lane that fails the gate leaves on the reject branch instead of being averaged into the rest.',
  zh: '上述每个字段都保留原始引用、它所用的时钟与坐标系，以及通过门控后留下的质量标记；通不过门控的通路走向拒绝支路，而不会被平均进其余数据。',
}
