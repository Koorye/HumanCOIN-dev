/**
 * The cover band: the journal-cover reading at the top of the page.
 *
 * Structure follows a printed cover rather than a landing page: the paper title
 * set in the display serif, then the figure — a cover carries the title, and the
 * claim and the standfirst belong to the abstract, where there is room to argue
 * them.
 *
 * The figure is the release, shown three ways at once. A carousel carries one
 * marquee row per acquisition tier — L3, L2, L1 — and choosing a take opens the
 * moment beside it: the four headband views as footage, the non-visual channels
 * drawn from that take's own samples, and the annotation of the moment the
 * playhead sits on. All three bands read one clock, so "one moment" is a mark
 * rather than a claim.
 *
 * Each row is built from its own tier's captures, reduced by
 * `scripts/build_cover_tiers.py`: L3 carries every channel, L2 carries the wrist
 * bands' EMG, and L1 carries no physiological channel at all. What each row
 * measures is stated per tier in `TIER_PROVENANCE` and is stamped on every cell,
 * so a channel a tier does not carry is drawn as a labelled gap rather than as
 * a curve the capture never measured.
 */

import type { Bi } from '@/content'

export const COVER = {
  /* The cover carries the report's title and nothing else. */
  title: {
    en: 'HumanCOIN: The Human-Signal Dataset at the Scale of Egocentric Manipulation',
    zh: 'HumanCOIN：第一人称操作规模下的人体信号数据集',
  },
  figureLabel: { en: 'Cover figure', zh: '封面图' },
  figureNote: {
    en: 'One take, read three ways at once: the tier’s own synchronised views, the non-visual channels its capture ships, and the annotation of the moment the playhead sits on. Every band reads one clock.',
    zh: '同一段录制，同时给出三种读法：该层级自身的同步视角、该次采集实际提供的非视觉通道、以及播放头所在时刻的标注。三条带共用同一个时钟。',
  },
  scroll: { en: 'Read the release', zh: '开始阅读' },
  /**
   * The cover's actions.
   *
   * None of the release's destinations are published yet, so `href` is a
   * placeholder and the row renders inert. The list is the shape the links will
   * take: the primary one is the dataset itself, and the rest are the report and
   * the code that accompany it.
   */
  actions: [
    { id: 'seek', label: { en: 'Seek & Download', zh: '检索与下载' }, href: '#install', primary: true },
    {
      id: 'report',
      label: { en: 'Technical Report', zh: '技术报告' },
      href: 'humancoin.pdf',
      primary: false,
    },
    { id: 'code', label: { en: 'Code', zh: '代码' }, href: '#', primary: false },
  ] as { id: string; label: Bi; href: string; primary: boolean }[],
  /* Metric strip under the cover. */
  metrics: [
    {
      value: 12500,
      decimals: 0,
      suffix: { en: ' h', zh: ' 小时' },
      label: { en: 'Recording volume', zh: '采集规模' },
      sub: { en: 'planned, three tiers', zh: '规划，三层合计' },
    },
    {
      value: 7,
      decimals: 0,
      suffix: { en: '', zh: '' },
      label: { en: 'Sensor modalities', zh: '传感器模态' },
      sub: { en: 'complementary channels', zh: '互补通道' },
    },
    {
      value: 3,
      decimals: 0,
      suffix: { en: '', zh: '' },
      label: { en: 'Acquisition tiers', zh: '采集层级' },
      sub: { en: 'breadth × density', zh: '广度 × 密度' },
    },
    {
      value: 1,
      decimals: 0,
      suffix: { en: '', zh: '' },
      label: { en: 'Spatiotemporal reference', zh: '统一时空参考' },
      sub: { en: 'shared clock and frame', zh: '共用时钟与坐标系' },
    },
  ] as {
    value: number
    decimals: number
    suffix: Bi
    label: Bi
    sub: Bi
  }[],
} as const

/**
 * The carousel of takes.
 *
 * Three marquee rows, one per tier. L3 and L1 travel left; L2 travels right, so
 * two adjacent rows never read as one long strip and a reader can tell at a
 * glance which row a card belongs to. Motion is a single continuous translation
 * rather than a step per card, and it stops while a card is hovered, so a take
 * can be read without chasing it.
 */
export const COVER_CAROUSEL = {
  label: { en: 'Takes, by acquisition tier', zh: '按采集层级浏览片段' },
  hint: {
    en: 'Hover a take to open its moment; click to keep it open.',
    zh: '悬浮查看该片段的时刻；点击可固定。',
  },
  close: { en: 'Close', zh: '收起' },
  pinned: { en: 'Pinned', zh: '已固定' },
} as const

/**
 * What each tier actually measures, and how the stand-in reads.
 *
 * `state` is per stream: `measured` where the tier's own instruments record it,
 * `estimated` where the tier only infers it, and `absent` where the tier does
 * not carry it. The note says plainly that the moving panel is an L3 capture
 * standing in, so a reader is never shown estimated channels as if they were
 * recorded at that tier.
 */
export type StreamState = 'measured' | 'estimated' | 'absent'

export interface TierProvenance {
  id: 'L3' | 'L2' | 'L1'
  name: Bi
  hours: Bi
  note: Bi
  streams: Record<'rgb' | 'gaze' | 'pose' | 'glove' | 'emg' | 'eeg', StreamState>
  /**
   * Whether the tier's rig carries the two near-hand wrist cameras. L3 and the
   * action tier do; L1 is head-mounted only, so its row shows the headband
   * views alone rather than a wrist view the tier never records.
   */
  wrist: boolean
}

export const TIER_PROVENANCE: TierProvenance[] = [
  {
    id: 'L3',
    name: { en: 'Cognitive intention', zh: '认知意图' },
    hours: { en: '500 h planned', zh: '规划 500 小时' },
    note: {
      en: 'The layer that reads the cognitive intention. Four headband views, two wrist views, gaze, head and wrist pose, glove skeleton, 16 EMG lanes, 8 EEG lanes and the capture’s own step notes are recorded on each take; every channel in the panel below is measured, not inferred.',
      zh: '读取认知意图的一层。每段录制同时记录四路头环视角、两路腕部视角、注视、头与腕部位姿、手套骨架、16 路肌电、8 路脑电与采集自带的步骤标注；下方面板中的每一路都是实测，而非推断。',
    },
    wrist: true,
    streams: {
      rgb: 'measured',
      gaze: 'measured',
      pose: 'measured',
      glove: 'measured',
      emg: 'measured',
      eeg: 'measured',
    },
  },
  {
    id: 'L2',
    name: { en: 'Motor intention', zh: '动作意图' },
    hours: { en: '2,000 h planned', zh: '规划 2,000 小时' },
    note: {
      en: 'The layer that reads the motor intention. Four synchronised wide views, two wrist views and the two wrist bands’ 16 EMG lanes are recorded; EEG belongs to the tier above. Gaze, head/wrist pose and finger kinematics are predicted from the video (EgoM2P for gaze, HaMeR for hands) and ship with the data — this viewer draws measured streams only.',
      zh: '读取动作意图的一层。记录四路同步广角视角、两路腕部视角与两条腕带的 16 路肌电；脑电属于上一层。注视、头/腕位姿与手指运动学由视频预测（注视用 EgoM2P，手部用 HaMeR），随数据一并发布——本查看器只绘制实测流。',
    },
    wrist: true,
    streams: {
      rgb: 'measured',
      gaze: 'estimated',
      pose: 'estimated',
      glove: 'estimated',
      emg: 'measured',
      eeg: 'absent',
    },
  },
  {
    id: 'L1',
    name: { en: 'Visual intention', zh: '视觉意图' },
    hours: { en: '10,000 h planned', zh: '规划 10,000 小时' },
    note: {
      en: 'The layer that reads the visual intention, from heterogeneous everyday environments captured by varied head-mounted rigs. The capture is head-mounted views only; gaze, head/wrist pose and finger kinematics are predicted from those views and ship with the data, while no muscle or cortical channel exists at this tier. This viewer draws measured streams only.',
      zh: '读取视觉意图的一层：来自多种头戴设备的异构日常环境。采集本身只有头戴视角；注视、头/腕位姿与手指运动学由这些视角预测，随数据一并发布；该层级不含肌肉与脑电通道。本查看器只绘制实测流。',
    },
    wrist: false,
    streams: {
      rgb: 'measured',
      gaze: 'estimated',
      pose: 'estimated',
      glove: 'estimated',
      emg: 'absent',
      eeg: 'absent',
    },
  },
]

/**
 * The moment panel: the three bands that read one clock.
 *
 * A band is a row, because the three are read across rather than down — the
 * views are what happened, the channels are what the body did, and the
 * annotation is what the release says it was. All three carry the same
 * playhead mark, so the "same instant" is drawn rather than asserted.
 */
export const COVER_MOMENT = {
  viewsBand: { en: 'Views · one clock', zh: '视角 · 同一时钟' },
  channelsBand: { en: 'Channels · same samples', zh: '通道 · 同一段样本' },
  annotationBand: { en: 'Annotation · this moment', zh: '标注 · 此刻' },
  play: { en: 'Play', zh: '播放' },
  pause: { en: 'Pause', zh: '暂停' },
  pinned: { en: 'Pinned', zh: '已固定' },
  timeline: { en: 'Timeline', zh: '时间轴' },
  loading: { en: 'Loading take…', zh: '正在载入…' },
  loadError: { en: 'This take’s signals could not be loaded.', zh: '无法载入该片段的信号。' },
  selectPrompt: {
    en: 'Hover a take to open its moment.',
    zh: '悬浮一段片段以展开其时刻。',
  },
  stepOf: { en: 'step', zh: '步骤' },
  hand: { en: 'Hand in use', zh: '所用手' },
  handLeft: { en: 'Left', zh: '左' },
  handRight: { en: 'Right', zh: '右' },
  handBoth: { en: 'Both', zh: '双手' },
  handNone: { en: 'Not determined', zh: '未判定' },
  handNote: {
    en: 'Measured from wrist-tracker travel inside the step; the recording carries no hand label.',
    zh: '由步骤内腕部跟踪器位移测得；采集数据无显式手别标注。',
  },
  objects: { en: 'Objects', zh: '物体' },
  objectNone: { en: 'No object named in this step.', zh: '该步骤未指名物体。' },
  groupOf: { en: 'group', zh: '集合' },
  colour: { en: 'Colour', zh: '颜色' },
  shape: { en: 'Shape', zh: '形状' },
  size: { en: 'Size', zh: '尺寸' },
  material: { en: 'Material', zh: '材质' },
  weight: { en: 'Weight', zh: '重量' },
  notRecorded: { en: 'not recorded', zh: '未记录' },
  estimatedGap: { en: 'estimated from video · not drawn here', zh: '由视频估计 · 此处不绘制' },
  stepsAll: { en: 'All steps', zh: '全部步骤' },
  noSteps: {
    en: 'This tier’s captures ship no step annotation.',
    zh: '该层级的采集不含步骤标注。',
  },
  /* Per-channel labels and provenance words. */
  streams: {
    rgb: { en: 'RGB', zh: 'RGB' },
    gaze: { en: 'Gaze', zh: '注视' },
    pose: { en: 'Pose', zh: '位姿' },
    glove: { en: 'Finger', zh: '手指' },
    emg: { en: 'EMG', zh: '肌电' },
    eeg: { en: 'EEG', zh: '脑电' },
  } as Record<'rgb' | 'gaze' | 'pose' | 'glove' | 'emg' | 'eeg', Bi>,
  state: {
    measured: { en: 'measured', zh: '实测' },
    estimated: { en: 'estimated', zh: '估计' },
    absent: { en: 'not at this tier', zh: '该层级无' },
  } as Record<StreamState, Bi>,
  views: {
    left: { en: 'Left', zh: '左目' },
    right: { en: 'Right', zh: '右目' },
    bleft: { en: 'Left · wide', zh: '左广角' },
    bright: { en: 'Right · wide', zh: '右广角' },
    wleft: { en: 'Left wrist', zh: '左腕' },
    wright: { en: 'Right wrist', zh: '右腕' },
  } as Record<'left' | 'right' | 'bleft' | 'bright' | 'wleft' | 'wright', Bi>,
} as const

/**
 * The five non-visual streams, one sentence each: what the stream measures and
 * what the release does not claim about it. Read by `CoverSignals.vue`, the
 * standalone signals plate, which is retained as a detail view of the same five
 * channels; the cover figure itself is `CoverMoment.vue`, which draws them
 * beside the footage and the annotation on one clock.
 */
export const COVER_STREAMS = {
  gaze: {
    label: { en: 'Gaze', zh: '注视' },
    color: 'var(--k-teal)',
    note: {
      en: 'The eye camera’s x and y over the clip, and a 22 × 22 map of where the gaze dwelt. Both lanes share one scale because both coordinates are eye-camera pixels, and the rule across the map marks the frame the whole strip is read at.',
      zh: '整段眼动相机的 x 与 y，以及一张 22 × 22 的注视停留分布图。两行共用同一尺度，因为两个坐标都是眼动相机像素；分布图上的横向细线标出整条信号带所读的那一帧。',
    },
  },
  pose: {
    label: { en: 'Pose', zh: '位姿' },
    color: 'var(--k-teal)',
    note: {
      en: 'Three 6-DoF trackers — head and both wrists — over the clip, drawn in one horizontal plane at one scale on both axes, so reach is comparable between rigs. The figure under each name is how far that rig travelled, in the capture’s own undocumented position units, not in metres.',
      zh: '三个 6 自由度追踪器（头部与双腕）在整段中的轨迹，画在同一个水平面内、两轴同尺度，因此各刚体的行程可直接比较。名称下方的数字是该刚体的行程，单位是采集本身未说明的原始单位，不是米。',
    },
  },
  glove: {
    label: { en: 'Glove', zh: '手套' },
    color: 'var(--k-amber)',
    note: {
      en: 'Both 25-node blocks at one frame, in the glove’s own coordinates, with each fingertip’s last stretch drawn behind it. Links follow node index order: the release declares no finger topology, so the chains are a drawing convention rather than a claim about which node is which finger.',
      zh: '两个 25 节点数据块在同一帧的姿态，用手套自身坐标系绘制，指尖后为其最近一段轨迹。连线按节点序号连接：发布数据未声明手指拓扑，因此连线属于绘图约定，并不主张哪个节点对应哪根手指。',
    },
  },
  emg: {
    label: { en: 'EMG', zh: '肌电' },
    color: 'var(--k-rose)',
    note: {
      en: 'Both wrist bands, every channel, one lane each, with the left band’s lanes above the rule and the right band’s below. All sixteen lanes share one scale, so the ratio beside the name — hardest-swinging channel against the quietest — is visible as height rather than only stated. The capture documents no amplifier gain, so that spread is a property of this recording and not a calibrated muscle amplitude.',
      zh: '两条腕带逐通道各占一行，横线上方为左腕的通道、下方为右腕的通道。十六条通道共用同一尺度，因此名称旁的倍数（摆幅最大通道与最小通道之比）在高度上直接可见，而不只是一个数字。采集未标注放大器增益，因此该差异属于本段记录自身的特征，不能作为标定过的肌肉幅度解读。',
    },
  },
  eeg: {
    label: { en: 'EEG', zh: '脑电' },
    color: 'var(--k-violet)',
    note: {
      en: 'All eight scalp electrodes, one lane each, on one shared scale. The electrodes keep the names the capture gives them, and the spread between the loudest and quietest electrode is read off this clip rather than assumed — with no amplifier gain documented, it is a property of the recording and not a calibrated scalp voltage.',
      zh: '八个头皮电极逐通道各一行，共用同一尺度。电极沿用采集给出的命名，最响与最静电极之间的差异直接由本片段读出而非假定——由于未标注放大器增益，这属于记录自身的特征，不是标定过的头皮电压。',
    },
  },
} as const
