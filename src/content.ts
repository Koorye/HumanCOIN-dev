/**
 * Bilingual copy for the HumanCOIN display site.
 * English is the primary language; Chinese is a full parallel translation.
 * Keys are stable; each entry carries both locales side by side so they
 * cannot drift apart.
 */

export type L = 'en' | 'zh'
export type Bi = Record<L, string>

export const SITE = {
  name: 'HumanCOIN',
  short: 'HumanCOIN',
  version: 'v2.0',
} as const

export const NAV: { id: string; label: Bi; num: string }[] = [
  { id: 'overview', num: '01', label: { en: 'Overview', zh: '总览' } },
  { id: 'acquisition', num: '02', label: { en: 'Acquisition', zh: '采集体系' } },
  { id: 'data', num: '03', label: { en: 'Data', zh: '数据集' } },
  { id: 'annotation', num: '04', label: { en: 'Viewer', zh: '查看器' } },
  { id: 'research', num: '05', label: { en: 'Research', zh: '研究问题' } },
  { id: 'format', num: '06', label: { en: 'Format', zh: '数据格式' } },
  { id: 'pipeline', num: '07', label: { en: 'Pipeline', zh: '处理流程' } },
  { id: 'access', num: '08', label: { en: 'Access', zh: '获取数据' } },
]

export const HERO = {
  eyebrow: { en: 'Egocentric · Embodied · Human signals', zh: '第一人称 · 具身 · 人体信号' },
  title: { en: 'HumanCOIN', zh: 'HumanCOIN' },
  subtitle: {
    en: 'From visible action to hidden signals.',
    zh: '从可见动作，到内隐信号。',
  },
  abstractLine: {
    en: 'A large-scale egocentric multimodal dataset that records not only what a person does, but what the body is doing while they do it.',
    zh: '面向具身操作的大规模第一人称多模态数据集，不仅记录人做了什么，也记录做的时候身体在发生什么。',
  },
  meta: {
    en: 'Three acquisition tiers · seven sensor modalities · one spatiotemporal reference',
    zh: '三层采集体系 · 七类传感器模态 · 一个统一时空参考',
  },
  ctaPrimary: { en: 'Explore the dataset', zh: '探索数据集' },
  ctaSecondary: { en: 'Read the abstract', zh: '阅读摘要' },
} as const

/** Headline figures shown under the hero. */
export interface Stat {
  value: string
  unit?: Bi
  label: Bi
}
export const HERO_STATS: Stat[] = [
  { value: '12,500', unit: { en: 'h', zh: '小时' }, label: { en: 'Recording volume', zh: '采集规模' } },
  { value: '3', unit: { en: 'tiers', zh: '层' }, label: { en: 'Scale × measurement density', zh: '规模 × 测量密度' } },
  { value: '7', unit: { en: 'modalities', zh: '类' }, label: { en: 'Complementary sensor channels', zh: '互补传感维度' } },
  { value: '1', unit: { en: 'reference', zh: '个' }, label: { en: 'Unified spatiotemporal frame', zh: '统一时空参考' } },
]

export const AUTHORS = [
  'Shihan Wu', 'Xuecheng Liu', 'Shaoxuan Xie', 'Pengwei Wang', 'Xinghang Li',
  'Bowen Yang', 'Zhe Li', 'Kai Zhu', 'Hongyu Wu', 'Yiheng Liu', 'Zhaoye Long',
  'Yue Wang', 'Chong Liu', 'Dihan Wang', 'Ziqiang Ni', 'Xiang Yang', 'You Liu',
  'Ruoxuan Feng', 'Runtian Xu', 'Lei Zhang', 'Denghang Huang', 'Chenghao Jin',
  'Anlan Yin', 'Xinlong Wang', 'Zhenguo Sun', 'Junkai Zhao', 'Mengfei Du',
  'Mingyu Cao', 'Xiansheng Chen', 'Hongyang Cheng', 'Xiaojie Zhang', 'Yankai Fu',
  'Ning Chen', 'Cheng Chi', 'Sixiang Chen', 'Huaihai Lyu', 'Xiaoshuai Hao',
  'Yequan Wang', 'Bo Lei', 'Dong Liu', 'Xi Yang', 'Yance Jiao', 'Tengfei Pan',
  'Yunyan Zhang', 'Songjing Wang', 'Ziqian Zhang', 'Xu Liu', 'Ji Zhang',
  'Caowei Meng', 'Zhizheng Zhang', 'Jiyang Gao', 'Song Wang', 'Xiaokun Leng',
  'Zhiqiang Xie', 'Zhenzhen Zhou', 'Peng Huang', 'Wu Yang', 'Yandong Guo',
  'Yichao Zhu', 'Suibing Zheng', 'Hao Cheng', 'Xinmin Ding', 'Yang Yue',
  'Huanqian Wang', 'Chi Chen', 'Jingrui Pang', 'YuXi Qian', 'Haoran Geng',
  'Lianli Gao', 'Haiyuan Li', 'Bin Fang', 'Gao Huang', 'Yaodong Yang', 'Hao Dong',
  'He Wang', 'Hang Zhao', 'Yadong Mu', 'Di Hu', 'Hao Zhao', 'Tiejun Huang',
  'Shanghang Zhang', 'Yonghua Lin', 'Zhongyuan Wang', 'Guocai Yao',
] as const

export const CITATION = {
  key: 'RoboCOINReport',
  type: 'article',
  title: 'HumanCOIN: A Large-Scale Egocentric Multimodal Human-Signal Dataset for Embodied Manipulation',
  year: '2026',
  license: 'CC BY-NC 4.0',
} as const

export const ABSTRACT = {
  title: { en: 'Abstract', zh: '摘要' },
  body: {
    en: [
      'HumanCOIN is a large-scale egocentric multimodal dataset for embodied manipulation. Beyond conventional first-person observation — head-mounted multi-view RGB, wrist cameras, and hand and body pose — it records the state of the operator: gaze, surface electromyography, electroencephalography, and glove-level finger kinematics, all under one clock and one spatiotemporal reference. The data is organised in three tiers — open scene, enhanced modality, and perceptual construction — so that scene coverage and signal depth can be studied together rather than as competing axes.',
    ],
    zh: [
      'HumanCOIN 是面向具身操作的大规模第一人称多模态数据集。除常规第一人称观测（头戴多目 RGB、腕部相机、手部与身体姿态）外，它同步记录操作者自身的状态信号：注视、表面肌电、脑电与手套级手指运动学，全部在统一时钟与统一时空参考下采集。数据按开放场景、增强模态、知觉建构三层组织，使"场景覆盖"与"信号深度"可以一并研究，而非相互竞争。',
    ],
  },
} as const

export const OVERVIEW = {
  num: '01',
  kicker: { en: 'Motivation', zh: '研究动机' },
  title: { en: 'Seeing the action is not the same as understanding the manipulation.', zh: '看见动作，不等于理解操作。' },
  lead: {
    en: 'A camera records the consequences of a decision: the fingers close, the object lifts, the wrist rotates. It does not record the decision itself. The three clips below stop at the moment that difference matters, and read the signal that carries it.',
    zh: '相机记录的是决策的结果：手指收拢、物体抬起、手腕转动。它记录不到决策本身。下面三段片段停在这个差别变得重要的那一刻，并读出承载它的信号。',
  },
  points: [
    { n: '01', t: { en: 'Where the eyes go', zh: '注视落点' }, d: { en: 'The eyes settle on the object before the hand starts to move, naming the target ahead of the reach.', zh: '手还没动，视线已经落在目标上，先于伸展动作给出候选目标。' } },
    { n: '02', t: { en: 'Object weight', zh: '物体重量' }, d: { en: 'Two objects can look identical and load the hand differently. Surface EMG reports grip force directly, so weight is read from the hand rather than inferred from motion.', zh: '两个物体外观可能相同，对手部的负载却不同。表面肌电直接报告握力，因此重量可以从手上读出来，而不必从运动反推。' } },
    { n: '03', t: { en: 'Failed attempts', zh: '失败尝试' }, d: { en: 'A blocked insertion, a slipped grip: event-related EEG activity marks the failure and the decision to retry before the hand changes direction.', zh: '插入受阻、抓握打滑：事件相关脑电活动标记了失败本身与重试决策，早于手部改变方向。' } },
  ],
} as const

/**
 * Three short task clips that stop at a decisive moment so the signal can be
 * read, then continue. Order matters: the tabs follow the section's own
 * numbering (gaze, EMG, EEG).
 */
export interface MotivationCase {
  id: 'gaze' | 'emg' | 'eeg'
  tab: Bi
  task: Bi
  signal: string
  accent: 'teal' | 'amber' | 'violet'
  /** Anchor on the clip, in percent of frame width / height. */
  point: { x: number; y: number }
  anchor: Bi
  /** Seconds into the clip where playback stops for the annotation. */
  freezeAt: number
  observe: Bi
  event: Bi
  role: Bi
  after: Bi
}

export const MOTIVATION = {
  tabsLabel: { en: 'Choose a task', zh: '选择任务' },
  play: { en: 'Play', zh: '播放' },
  pause: { en: 'Pause', zh: '暂停' },
  jump: { en: 'Jump to the moment', zh: '跳到关键时刻' },
  cont: { en: 'Continue', zh: '继续播放' },
  replay: { en: 'Replay', zh: '重新播放' },
  keyMoment: { en: 'Key moment', zh: '关键时刻' },
  adds: { en: 'What it adds', zh: '它补充了什么' },
  steps: [
    { en: 'Observe', zh: '观察' },
    { en: 'Freeze', zh: '冻结' },
    { en: 'Read signal', zh: '读取信号' },
    { en: 'Continue', zh: '继续行动' },
  ],
  cases: [
    {
      id: 'gaze',
      tab: { en: 'Target selection', zh: '目标选择' },
      task: { en: 'Select the blue block, then reach for it', zh: '选择蓝色方块，再伸手抓取' },
      signal: 'GAZE',
      accent: 'teal',
      point: { x: 60, y: 54 },
      anchor: { en: 'Target fixation', zh: '目标注视点' },
      freezeAt: 2.5,
      observe: { en: 'Watch the hand approach the three options.', zh: '先看手部朝三个候选物体靠近。' },
      event: { en: 'Gaze reaches the target before the hand starts moving.', zh: '注视先到达目标，此时手部尚未启动。' },
      role: {
        en: 'Line of sight fixes the candidate target before any motion is visible, so intent can be read ahead of the hand.',
        zh: '视线在任何动作可见之前就锁定了候选目标，因此意图可以先于手部被读出。',
      },
      after: { en: 'Watch the hand reach for the block the eyes already selected.', zh: '手伸向眼睛已经选定的方块。' },
    },
    {
      id: 'emg',
      tab: { en: 'Object weight', zh: '物体重量' },
      task: { en: 'Grip a box and lift it', zh: '抓握箱子并抬起' },
      signal: 'EMG',
      accent: 'amber',
      point: { x: 56, y: 62 },
      anchor: { en: 'Hand effort window', zh: '手部施力窗口' },
      freezeAt: 2.5,
      observe: { en: 'Two boxes look identical; only one is heavy.', zh: '两个箱子外观相同，其中一个更重。' },
      event: { en: 'Grip force steps up at contact: the load shows in the muscle before it shows in the lift.', zh: '接触瞬间握力阶跃上升：负载先出现在肌肉上，而不是抬升动作里。' },
      role: {
        en: 'Surface EMG reports grip force, so an object\u2019s weight is read from the hand rather than inferred from how it moves.',
        zh: '表面肌电直接报告握力，因此物体重量可以从手部读出，而不必从运动反推。',
      },
      after: { en: 'Watch the grip hold steady and the heavier box rise more slowly.', zh: '握持保持稳定，较重的箱子抬升更慢。' },
    },
    {
      id: 'eeg',
      tab: { en: 'Blocked contact', zh: '接触受阻' },
      task: { en: 'Insert the connector; the first attempt is blocked', zh: '插入接口；第一次尝试受阻' },
      signal: 'EEG',
      accent: 'violet',
      point: { x: 65, y: 48 },
      anchor: { en: 'Blocked-contact moment', zh: '接触受阻时刻' },
      freezeAt: 2.5,
      observe: { en: 'Watch the connector approach the socket.', zh: '先看接口朝插座靠近。' },
      event: { en: 'Insertion is blocked. This is the moment the operator registers the failure.', zh: '插入受阻。这一刻操作者察觉到了失败。' },
      role: {
        en: 'Event-related EEG activity marks the failed attempt and the decision to retract, arriving before the hand changes direction.',
        zh: '事件相关脑电活动标记了失败尝试与回撤决策，在手改变方向之前就已经出现。',
      },
      after: { en: 'Watch the connector pull back, realign, and go in.', zh: '接口回撤、重新对齐，再次插入。' },
    },
  ] as MotivationCase[],
}

export const ACQUISITION = {
  num: '02',
  kicker: { en: 'Acquisition architecture', zh: '采集体系' },
  title: { en: 'One pyramid: breadth at the base, measurement density at the apex.', zh: '一座金字塔：底座是广度，顶端是测量密度。' },
  aside: {
    en: 'Downwards, the pyramid widens: more scenes, more hours, more everyday variation. Upwards, it narrows: fewer hours, but denser instrumentation and tighter calibration. Every tier shares the same task ontology.',
    zh: '向下，金字塔变宽：场景更多、时长更长、日常变化更丰富。向上，它收窄：时长更短，但仪器更密、标定更严。三层共享同一套任务本体。',
  },
  tierAxis: { en: 'Measurement density', zh: '测量密度' },
  scaleAxis: { en: 'Scene coverage and volume', zh: '场景覆盖与规模' },
  tiersTitle: { en: 'Select a tier', zh: '选择层级' },
  hardwareTitle: { en: 'Instrumentation', zh: '设备配置' },
} as const

/**
 * Body-worn instrument ids. Shared between the tier inventory and the anatomy
 * view, so the two panels cannot drift apart.
 */
export type DeviceId = 'rgb' | 'rig' | 'eeg' | 'gaze' | 'emg' | 'gloves' | 'vive' | 'wrist'

export interface Tier {
  id: 'L1' | 'L2' | 'L3'
  name: Bi
  hours: string
  hoursLabel: Bi
  accent: 'blue' | 'teal' | 'violet'
  summary: Bi
  seats: Bi
  devices: { id: DeviceId; name: Bi; detail: Bi }[]
}

export const TIERS: Tier[] = [
  {
    id: 'L1',
    name: { en: 'Open scene', zh: '开放场景' },
    hours: '10,000',
    hoursLabel: { en: 'hours planned', zh: '规划小时' },
    accent: 'blue',
    summary: {
      en: 'Heterogeneous everyday environments, aggregated from varied sources, preserving the continuity of ordinary life.',
      zh: '异构日常环境汇总，保留日常生活原本的连续性。',
    },
    seats: { en: 'No fixed rig · external and in-house head-mounted capture', zh: '无固定席位 · 自研与外部头戴采集' },
    devices: [
      { id: 'rgb', name: { en: 'In-house 4-camera headband', zh: '自研四目头环' }, detail: { en: 'Head-mounted visual and auditory capture · 4 lenses', zh: '头部视觉与听觉采集 · 4 目' } },
      { id: 'rig', name: { en: 'Third-party head-mounted rigs', zh: '外部异构头环' }, detail: { en: '2-lens, 4-lens and higher configurations · provenance recorded per source', zh: '2 目 / 4 目 / 4 目以上配置 · 逐来源记录出处' } },
    ],
  },
  {
    id: 'L2',
    name: { en: 'Enhanced modality', zh: '增强模态' },
    hours: '2,000',
    hoursLabel: { en: 'hours planned', zh: '规划小时' },
    accent: 'teal',
    summary: {
      en: 'Semi-structured tasks with portable physiological sensing, designed for longer continuous sessions.',
      zh: '半结构化任务，配备便携式生理传感，面向更长的连续采集。',
    },
    seats: { en: '8 stations · portable EEG plus a shared pool of enhanced rigs', zh: '8 席位 · 便携 EEG 与共享增强设备池' },
    devices: [
      { id: 'eeg', name: { en: '8-channel EEG', zh: '8 通道 EEG' }, detail: { en: 'Portable, 8 stations', zh: '便携式，8 席位' } },
      { id: 'emg', name: { en: 'Bilateral surface EMG', zh: '双侧表面肌电' }, detail: { en: '2 sensors per kit · shared pool', zh: '2 只/套 · 共享设备池' } },
      { id: 'rgb', name: { en: 'In-house 4-camera headband', zh: '自研四目头环' }, detail: { en: 'Shared pool', zh: '共享设备池' } },
      { id: 'wrist', name: { en: 'Wrist cameras', zh: '双腕相机' }, detail: { en: '2 per station · shared pool', zh: '2 只/席位 · 共享设备池' } },
    ],
  },
  {
    id: 'L3',
    name: { en: 'Perception construction', zh: '知觉建构' },
    hours: '500',
    hoursLabel: { en: 'hours planned', zh: '规划小时' },
    accent: 'violet',
    summary: {
      en: 'High-density, research-grade instrumentation on controlled tabletop manipulation, where calibration quality matters most.',
      zh: '高密度研究级仪器，用于受控桌面操作任务，对标定质量要求最高。',
    },
    seats: { en: '3 stations · research-grade instruments · tabletop tasks', zh: '3 席位 · 研究级设备 · 桌面任务' },
    devices: [
      { id: 'eeg', name: { en: '128 / 32-channel EEG', zh: '128 / 32 通道 EEG' }, detail: { en: 'Research-grade amplifier, 1 unit', zh: '研究级放大器，1 套' } },
      { id: 'gaze', name: { en: 'Wearable eye tracker', zh: '可穿戴眼动仪' }, detail: { en: 'Binocular gaze, 3 units', zh: '双目注视，3 套' } },
      { id: 'emg', name: { en: 'Bilateral surface EMG', zh: '双侧表面肌电' }, detail: { en: '2 sensors per kit, 3 kits', zh: '2 只/套，3 套' } },
      { id: 'gloves', name: { en: 'Haptic motion-capture gloves', zh: '触觉动捕手套' }, detail: { en: '50 nodes per hand, 3 pairs', zh: '每手 50 节点，3 副' } },
      { id: 'vive', name: { en: 'VIVE Tracker 3.0', zh: 'VIVE Tracker 3.0' }, detail: { en: 'Head and both wrists, 3 per kit', zh: '头部与双腕，3 只/套' } },
      { id: 'rgb', name: { en: 'In-house 4-camera headband', zh: '自研四目头环' }, detail: { en: 'Head-mounted visual and auditory capture', zh: '头部视觉与听觉采集' } },
      { id: 'wrist', name: { en: 'Wrist cameras', zh: '双腕相机' }, detail: { en: '2 per station, near-hand view', zh: '2 只/席位，近手视角' } },
    ],
  },
]

/**
 * Placement metadata for the body view. Names match the tier inventory, so a
 * card and its marker always read the same; the figure carries only the short
 * mono code, which is language-independent.
 */
export interface DeviceMeta {
  id: DeviceId
  name: Bi
  location: Bi
  code: string
}

export const DEVICE_META: DeviceMeta[] = [
  { id: 'rgb', name: { en: 'In-house 4-camera headband', zh: '自研四目头环' }, location: { en: 'Forehead', zh: '额部' }, code: 'RGB' },
  { id: 'rig', name: { en: 'Third-party head-mounted rigs', zh: '外部异构头环' }, location: { en: 'Head', zh: '头部' }, code: 'RIG' },
  { id: 'eeg', name: { en: 'EEG electrode cap', zh: 'EEG 电极帽' }, location: { en: 'Scalp', zh: '头皮' }, code: 'EEG' },
  { id: 'gaze', name: { en: 'Wearable eye tracker', zh: '可穿戴眼动仪' }, location: { en: 'Eyes', zh: '眼部' }, code: 'GAZE' },
  { id: 'emg', name: { en: 'Bilateral surface EMG', zh: '双侧表面肌电' }, location: { en: 'Both forearms', zh: '双侧前臂' }, code: 'EMG' },
  { id: 'gloves', name: { en: 'Haptic motion-capture gloves', zh: '触觉动捕手套' }, location: { en: 'Both hands', zh: '双手' }, code: 'HAND' },
  { id: 'vive', name: { en: 'VIVE Tracker 3.0', zh: 'VIVE Tracker 3.0' }, location: { en: 'Head and both wrists', zh: '头部与双腕' }, code: 'TRK' },
  { id: 'wrist', name: { en: 'Wrist cameras', zh: '双腕相机' }, location: { en: 'Both wrists', zh: '双腕' }, code: 'WRIST' },
]

export const ANATOMY = {
  kicker: { en: 'Body × instruments', zh: '身体 × 仪器' },
  title: { en: 'Every signal starts somewhere on the body.', zh: '每一路信号，都有它在身体上的位置。' },
  lead: {
    en: 'The tier you select above also decides what is worn. Each instrument keeps its own clock, its own native rate and its own coordinate frame; what links them is the shared spatiotemporal reference, not a shared enclosure.',
    zh: '上面选中的层级，同时决定了佩戴什么。每件仪器保留自己的时钟、原生采样率与坐标框架；把它们连接起来的是统一的时空参考，而不是同一个外壳。',
  },
  figureLabel: { en: 'Schematic of instrument placement', zh: '仪器佩戴位置示意' },
  cardsLabel: { en: 'Worn instruments', zh: '佩戴仪器' },
  microTop: { en: 'FRONT / SCHEMATIC PLACEMENT', zh: '正面 / 佩戴示意' },
  microBottom: { en: 'NOT TO SCALE', zh: '非等比' },
  hint: { en: 'Hover to preview; click to pin an instrument.', zh: '悬停预览，点击可固定某件仪器。' },
  activeLabel: { en: 'Pinned', zh: '已固定' },
  noneLabel: { en: 'Nothing pinned.', zh: '未固定任何仪器。' },
  note: {
    en: 'Placement is schematic, not to scale, and does not claim that the listed instruments are worn simultaneously. Counts and simultaneous configurations follow the acquisition protocol.',
    zh: '佩戴位置为示意，非等比，也不代表所列仪器会同时佩戴。数量与同时配置以采集协议为准。',
  },
} as const

export const DATA = {
  num: '03',
  kicker: { en: 'Data composition', zh: '数据构成' },
  title: { en: 'Volume is not the only axis.', zh: '规模不是唯一的轴。' },
  body: {
    en: [
      'A dataset of this shape cannot be summarised by a single hour count. The useful question is how the hours are distributed across environments, and how much measured signal each hour carries.',
      'Hours grow towards the base of the pyramid while measurement density grows towards the apex. The same task ontology links both ends, so a kitchen counter in the open-scene tier and a tabletop in the perception-construction tier are related by task, not merely by sensor kit.',
    ],
    zh: [
      '这种形态的数据集无法用单一小时数概括。更有用的问题是：这些小时如何分布在不同环境上，以及每小时携带了多少实测信号。',
      '时长向金字塔底部增长，测量密度向顶端增长。同一套任务本体连接两端，因此开放场景层里的厨房台面与知觉建构层里的桌面，是通过任务关联的，而不仅仅共享传感器套装。',
    ],
  },
  hoursChart: { en: 'Planned hours by tier', zh: '各层规划时长' },
  sceneChart: { en: 'Scene allocation', zh: '场景分配' },
  durationChart: { en: 'Episode duration distribution', zh: '片段时长分布' },
  taskChart: { en: 'Tasks per tier', zh: '各层任务数' },
  tierCol: { en: 'Tier', zh: '层级' },
  shareCol: { en: 'Share', zh: '占比' },
  hoursCol: { en: 'Hours', zh: '小时' },
  tasksCol: { en: 'Tasks', zh: '任务' },
  scenesCol: { en: 'Representative scenes', zh: '代表场景' },
  scenes: [
    { en: 'Kitchen', zh: '厨房' },
    { en: 'Workshop', zh: '工作台' },
    { en: 'Desk', zh: '书桌' },
    { en: 'Laundry', zh: '洗衣' },
    { en: 'Market', zh: '超市' },
    { en: 'Café', zh: '咖啡' },
  ],
} as const

export const ANNOTATION = {
  num: '04',
  kicker: { en: 'Annotation and inspection', zh: '标注与查看' },
  title: { en: 'One moment, six kinds of evidence.', zh: '一个时刻，六种证据。' },
  body: {
    en: 'A released L3 episode, opened. One moment of it is covered by six streams that measure six different things — head-mounted RGB, eye gaze, head and wrist 6-DoF pose, glove finger kinematics, surface EMG and EEG — each arriving at its own rate. Over that same moment sits a textual annotation that is not only the subtask sentence: it names the action, the hand in use, and every object involved, with its colour, shape, size, material and, where the task design records one, its weight.',
    zh: '打开一段已发布的 L3 片段。其中的一个时刻由六条数据流共同覆盖，它们测量六种不同的量——头戴 RGB、眼动注视、头与腕的 6 自由度位姿、手套手指运动学、表面肌电与脑电——各自以自己的速率到达。同一时刻上还叠加了一份文本标注，它不只有子任务描述：还给出动作名、所用手，以及涉及的每个物体及其颜色、形状、尺寸、材质，并在任务设计有所记录时给出重量。',
  },
  loading: { en: 'Loading recording…', zh: '正在载入录制…' },
  loadingData: { en: 'Loading signals…', zh: '正在载入信号…' },
  play: { en: 'Play', zh: '播放' },
  pause: { en: 'Pause', zh: '暂停' },
  viewsTitle: { en: 'Head-mounted views', zh: '头戴视角' },
  timeline: { en: 'Timeline', zh: '时间轴' },
  browseTitle: { en: 'Released recordings', zh: '已发布录制' },
  browseHint: { en: 'Select an episode to load it into the viewer.', zh: '选择一段 episode，载入查看器。' },
  viewLeft: { en: 'Left', zh: '左' },
  viewRight: { en: 'Right', zh: '右' },
  viewBackLeft: { en: 'Rear left', zh: '后左' },
  viewBackRight: { en: 'Rear right', zh: '后右' },
  signalEeg: { en: 'EEG', zh: '脑电' },
  signalEmgLeft: { en: 'EMG · left', zh: '肌电 · 左' },
  signalEmgRight: { en: 'EMG · right', zh: '肌电 · 右' },
  hands: { en: 'Hands', zh: '手部' },
  gaze: { en: 'Gaze', zh: '注视' },
  trail: { en: 'Trail', zh: '轨迹' },
  pose: { en: 'Pose', zh: '位姿' },
  signal: { en: 'Signals', zh: '信号' },
  camera: { en: 'Camera', zh: '相机' },
  cloud: { en: 'RGB cloud', zh: 'RGB 点云' },
  reset: { en: 'Reset view', zh: '重置视角' },
  windowCamera: { en: 'Head camera', zh: '头部相机' },
  windowGaze: { en: 'Eye gaze', zh: '眼动注视' },
  windowGlove: { en: 'Glove kinematics', zh: '手套运动学' },
  windowEeg: { en: 'EEG', zh: '脑电' },
  windowEmg: { en: 'Surface EMG', zh: '表面肌电' },
  gazeNow: { en: 'at the playhead', zh: '播放头处' },
  gazeNote: {
    en: 'Eye-camera coordinates normalised over this clip, so the cross sits where the recording put it relative to the rest of the clip rather than against a calibrated screen.',
    zh: '眼动相机坐标按本片段自身范围归一，因此十字落点相对于整段的其余部分成立，而不是相对于一块标定过的屏幕。',
  },
  stepsTitle: { en: 'Task steps', zh: '任务步骤' },
  stepSource: { en: 'Source', zh: '来源' },
  gloveBlockA: { en: 'Block 00 · nodes 00–24', zh: '数据块 00 · 节点 00–24' },
  gloveBlockB: { en: 'Block 01 · nodes 25–49', zh: '数据块 01 · 节点 25–49' },
  gloveNote: {
    en: 'Both glove blocks as stored, in the glove’s own coordinates and scaled to this clip — the release does not fuse them to the scene frame, so this window does not either. Links follow node index order and are a drawing convention, not a declared finger topology. The pale line behind each fingertip is that tip’s last half second.',
    zh: '两个手套数据块按原始存储绘制，使用手套自身坐标系并按本片段缩放——发布数据未将其与世界坐标系融合，此窗口也不做融合。连线按节点序号连接，属于绘图约定，并非已声明的指节拓扑。指尖后的浅色线为该指尖最近半秒的轨迹。',
  },

  /* ---- moment annotation ---- */
  momentTitle: { en: 'Over this moment', zh: '覆盖这个时刻' },
  momentFollow: { en: 'follows the playhead', zh: '跟随播放头' },
  annTitle: { en: 'Text annotation', zh: '文本标注' },
  momentWindow: { en: 'Window', zh: '区间' },
  stepOf: { en: 'step', zh: '步骤' },
  attrAction: { en: 'Action', zh: '动作' },
  attrHand: { en: 'Hand in use', zh: '所用手' },
  attrObject: { en: 'Objects', zh: '涉及物体' },
  attrColor: { en: 'Colour', zh: '颜色' },
  attrShape: { en: 'Shape', zh: '形状' },
  attrSize: { en: 'Size', zh: '尺寸' },
  attrWeight: { en: 'Weight', zh: '重量' },
  attrMaterial: { en: 'Material', zh: '材质' },
  actionNone: { en: 'not stated in the step', zh: '步骤未给出' },
  handLeft: { en: 'Left hand', zh: '左手' },
  handRight: { en: 'Right hand', zh: '右手' },
  handBoth: { en: 'Both hands', zh: '双手' },
  handNone: { en: 'not determined', zh: '未判定' },
  handNote: {
    en: 'Hand in use is read from wrist-tracker displacement inside this step; the recording carries no explicit hand label.',
    zh: '所用手由该步骤内腕部跟踪器的位移读出；采集数据中没有显式的手别标注。',
  },
  objectNone: { en: 'No object named in this step.', zh: '该步骤未指名物体。' },
  groupLabelled: { en: 'referred to as a group', zh: '以集合指代' },
  groupMembers: { en: 'candidates placed in this scene', zh: '本场景中可能的候选' },
  weightAbsent: { en: 'not recorded', zh: '未记录' },
  colorAbsent: { en: 'not recorded', zh: '未记录' },
  weightNote: {
    en: 'Weight is shown only where the task-design library matches the object on name, shape, material and size; the session metadata itself has no weight field, so most objects leave it blank.',
    zh: '重量仅在任务设计库按名称、形状、材质与尺寸匹配到该物体时给出；采集元数据本身没有重量字段，因此多数物体留空。',
  },

  /* ---- the streams covering one moment ---- */
  modTitle: { en: 'Streams covering this moment', zh: '覆盖该时刻的数据流' },
  modCarries: { en: 'Quantity', zh: '物理量' },
  modHere: { en: 'In this window', zh: '本区间' },
  modRate: { en: 'Rate', zh: '采样率' },
  modCaptured: { en: 'captured at', zh: '采集于' },
  modFrames: { en: 'frames', zh: '帧' },
  modSamples: { en: 'samples', zh: '采样点' },
  modRgb: { en: 'Head-mounted RGB', zh: '头戴 RGB' },
  modGaze: { en: 'Eye gaze', zh: '眼动注视' },
  modPose: { en: 'Head and wrist pose', zh: '头部与腕部位姿' },
  modGlove: { en: 'Glove kinematics', zh: '手套运动学' },
  modEmg: { en: 'Surface EMG', zh: '表面肌电' },
  modEeg: { en: 'EEG', zh: '脑电' },
  modRgbQuantity: { en: 'views · colour video', zh: '路 · 彩色视频' },
  modGazeQuantity: { en: 'sample · x, y in eye-camera px', zh: '采样点 · x、y（眼动相机像素）' },
  modPoseQuantity: { en: 'sample · head + 2 wrists, x,y,z + roll,pitch,yaw', zh: '采样点 · 头部 + 双腕，x,y,z + 横滚,俯仰,偏航' },
  modGloveQuantity: { en: 'nodes · 6 DoF each', zh: '节点 · 每节点 6 自由度' },
  modEmgQuantity: { en: 'channels · both arms', zh: '通道 · 双臂' },
  modEegQuantity: { en: 'channels · scalp sites', zh: '通道 · 头皮位点' },
  modNote: {
    en: 'Six streams cover a single moment, and no two of them measure the same quantity: pixels, gaze coordinates, 6-DoF rig poses, joint kinematics, muscle activation and scalp voltage. RGB, gaze, pose and glove kinematics are released on the episode frame grid, so their rows agree by construction; the EMG and EEG lanes keep their own 100 Hz grid. Nothing is resampled to make the columns match.',
    zh: '一个时刻由六条数据流共同覆盖，而其中没有两条在测同一个量：像素、注视坐标、6 自由度刚体位姿、关节运动学、肌肉激活与头皮电压。RGB、注视、位姿与手套运动学按 episode 帧网格发布，因此这几行天然对齐；肌电与脑电保留各自的 100 Hz 网格。这里不做任何重采样来让各列看起来一致。',
  },
  unsupported3d: {
    en: 'The 3D scene needs WebGL. The four camera views and all signal plots below remain available.',
    zh: '三维场景需要 WebGL 支持。四路相机视角与下方全部信号曲线不受影响。',
  },
  syncNote: {
    en: 'Per-stream arrival offsets recorded during capture.',
    zh: '采集时记录的逐流到达时间偏差。',
  },
  hint: {
    en: 'Drag to orbit · scroll to zoom · right-drag to pan',
    zh: '拖拽旋转 · 滚轮缩放 · 右键拖拽平移',
  },
  channelMean: { en: 'all 8 channels · native units', zh: '全部 8 通道 · 原始单位' },
  streamCol: { en: 'stream', zh: '数据流' },
  deltaCol: { en: 'Δt (ms)', zh: 'Δt（毫秒）' },
  deg: { en: 'deg', zh: '度' },
} as const

/**
 * Action verbs as they occur in the capture's own step sentences. The readout
 * picks the token that starts earliest in the sentence and, on a tie, the
 * longest one, so "拿出来放到…" reports the leading action rather than the
 * trailing one.
 */
export const ACTION_VERBS: { token: string; label: Bi }[] = [
  { token: '摆放成', label: { en: 'arrange into one direction', zh: '摆放成同向' } },
  { token: '拿出来', label: { en: 'take out', zh: '拿出来' } },
  { token: '放回', label: { en: 'put back', zh: '放回' } },
  { token: '放到', label: { en: 'place onto', zh: '放到' } },
  { token: '放在', label: { en: 'place at', zh: '放在' } },
  { token: '放进', label: { en: 'place into', zh: '放进' } },
  { token: '取出', label: { en: 'take out', zh: '取出' } },
  { token: '拿出', label: { en: 'take out', zh: '拿出' } },
  { token: '拿到', label: { en: 'bring over', zh: '拿到' } },
  { token: '观察', label: { en: 'observe', zh: '观察' } },
  { token: '摆放', label: { en: 'arrange', zh: '摆放' } },
  { token: '配置', label: { en: 'configure', zh: '配置' } },
  { token: '整理', label: { en: 'tidy up', zh: '整理' } },
  { token: '分装', label: { en: 'dispense', zh: '分装' } },
  { token: '清扫', label: { en: 'sweep', zh: '清扫' } },
  { token: '取', label: { en: 'pick', zh: '取' } },
  { token: '装', label: { en: 'load', zh: '装' } },
  { token: '拿', label: { en: 'take', zh: '拿' } },
  { token: '放', label: { en: 'place', zh: '放' } },
]

/** Object names as the capture records them, keyed by their un-numbered stem. */
export const OBJECT_NAMES: Record<string, Bi> = {
  花: { en: 'Flower', zh: '花' },
  筷子: { en: 'Chopstick', zh: '筷子' },
  筷子筒: { en: 'Chopstick holder', zh: '筷子筒' },
  电热水壶: { en: 'Electric kettle', zh: '电热水壶' },
  水杯: { en: 'Glass', zh: '水杯' },
  水杯架: { en: 'Cup rack', zh: '水杯架' },
  可乐: { en: 'Cola', zh: '可乐' },
  旺仔牛奶: { en: 'Sweet milk', zh: '旺仔牛奶' },
  橙汁: { en: 'Orange juice', zh: '橙汁' },
  葡萄汁: { en: 'Grape juice', zh: '葡萄汁' },
  菠萝汁: { en: 'Pineapple juice', zh: '菠萝汁' },
  西柚汁: { en: 'Grapefruit juice', zh: '西柚汁' },
  青柠汁: { en: 'Lime juice', zh: '青柠汁' },
  蔓越莓汁: { en: 'Cranberry juice', zh: '蔓越莓汁' },
  水蜜桃饮料: { en: 'Peach drink', zh: '水蜜桃饮料' },
  番茄汁: { en: 'Tomato juice', zh: '番茄汁' },
  柠檬水: { en: 'Lemonade', zh: '柠檬水' },
  乌龙茶: { en: 'Oolong tea', zh: '乌龙茶' },
  药: { en: 'Medicine', zh: '药' },
  收纳盒: { en: 'Storage box', zh: '收纳盒' },
  '（可乐）卡片': { en: '"Cola" card', zh: '（可乐）卡片' },
  '（茶水）卡片': { en: '"Tea" card', zh: '（茶水）卡片' },
  '（牛奶）卡片': { en: '"Milk" card', zh: '（牛奶）卡片' },
  '（清水）卡片': { en: '"Water" card', zh: '（清水）卡片' },
  '（橙汁）卡片': { en: '"Orange juice" card', zh: '（橙汁）卡片' },
  '（葡萄汁）卡片': { en: '"Grape juice" card', zh: '（葡萄汁）卡片' },
  '（菠萝汁）卡片': { en: '"Pineapple juice" card', zh: '（菠萝汁）卡片' },
  '（柠檬汁）卡片': { en: '"Lemon juice" card', zh: '（柠檬汁）卡片' },
  '（蔓越莓汁）卡片': { en: '"Cranberry juice" card', zh: '（蔓越莓汁）卡片' },
  '（番茄汁）卡片': { en: '"Tomato juice" card', zh: '（番茄汁）卡片' },
  '（西柚汁）卡片': { en: '"Grapefruit juice" card', zh: '（西柚汁）卡片' },
  '（水蜜桃饮料）卡片': { en: '"Peach drink" card', zh: '（水蜜桃饮料）卡片' },
  '（青柠汁）卡片': { en: '"Lime juice" card', zh: '（青柠汁）卡片' },
}

/** Primitive geometry names, covering the whole upstream vocabulary. */
export const SHAPE_NAMES: Record<string, Bi> = {
  box: { en: 'Box', zh: '长方体' },
  cyl: { en: 'Cylinder', zh: '圆柱' },
  sph: { en: 'Sphere', zh: '球体' },
  ellipsoid: { en: 'Ellipsoid', zh: '椭球' },
  hemisphere: { en: 'Hemisphere', zh: '半球' },
  cone: { en: 'Cone', zh: '圆锥' },
  octant: { en: 'Octant', zh: '八分体' },
}

/** Material names, covering the whole upstream vocabulary. */
export const MATERIAL_NAMES: Record<string, Bi> = {
  塑料: { en: 'Plastic', zh: '塑料' },
  金属: { en: 'Metal', zh: '金属' },
  木头: { en: 'Wood', zh: '木头' },
  木: { en: 'Wood', zh: '木' },
  竹: { en: 'Bamboo', zh: '竹' },
  纸质: { en: 'Paper', zh: '纸质' },
  纸: { en: 'Paper', zh: '纸' },
  玻璃: { en: 'Glass', zh: '玻璃' },
  陶瓷: { en: 'Ceramic', zh: '陶瓷' },
  橡胶: { en: 'Rubber', zh: '橡胶' },
  皮质: { en: 'Leather', zh: '皮质' },
  布: { en: 'Fabric', zh: '布' },
  布质: { en: 'Fabric', zh: '布质' },
  棉: { en: 'Cotton', zh: '棉' },
  无纺布: { en: 'Non-woven fabric', zh: '无纺布' },
  超细纤维: { en: 'Microfibre', zh: '超细纤维' },
  海绵: { en: 'Sponge', zh: '海绵' },
  泡沫: { en: 'Foam', zh: '泡沫' },
  铝箔: { en: 'Aluminium foil', zh: '铝箔' },
  石蜡: { en: 'Paraffin', zh: '石蜡' },
  胶: { en: 'Adhesive', zh: '胶' },
  食物: { en: 'Food', zh: '食物' },
  食材: { en: 'Ingredient', zh: '食材' },
  液体: { en: 'Liquid', zh: '液体' },
  垃圾: { en: 'Waste', zh: '垃圾' },
  空: { en: 'Empty', zh: '空' },
}

/** Dimension keys, in the order they should be printed. */
export const DIM_ORDER = ['l', 'w', 'h', 'd', 'r', 'rx', 'ry', 'rz'] as const
export const DIM_LABELS: Record<string, Bi> = {
  l: { en: 'l', zh: '长' },
  w: { en: 'w', zh: '宽' },
  h: { en: 'h', zh: '高' },
  d: { en: '⌀', zh: '⌀' },
  r: { en: 'r', zh: '半径' },
  rx: { en: 'rx', zh: '长半轴' },
  ry: { en: 'ry', zh: '中半轴' },
  rz: { en: 'rz', zh: '短半轴' },
}

/**
 * Display name for a recorded object. Siblings are stored numbered ("筷子",
 * "筷子2", "筷子3"), so the trailing index is split off and re-attached as a
 * superscript rather than being dropped — the three chopsticks are genuinely
 * three objects with different dimensions.
 */
export function objectLabel(name: string, lang: L): string {
  const m = /^(.*?)(\d+)$/.exec(name)
  const stem = m ? m[1] : name
  const suffix = m ? ` ${m[2]}` : ''
  const entry = OBJECT_NAMES[stem]
  const base = entry ? entry[lang] : stem
  return `${base}${suffix}`
}

export function shapeLabel(shape: string | null, lang: L): string | null {
  if (!shape) return null
  return SHAPE_NAMES[shape]?.[lang] ?? shape
}

export function materialLabel(material: string | null, lang: L): string | null {
  if (!material) return null
  return MATERIAL_NAMES[material]?.[lang] ?? material
}

/**
 * The verb a step sentence leads with. The token occurring earliest in the
 * sentence wins, and ties go to the longest, so "拿出来放到…" reports taking
 * out rather than putting down.
 */
export function actionLabel(text: string, lang: L): string | null {
  let best: { at: number; token: string; label: Bi } | null = null
  for (const v of ACTION_VERBS) {
    const at = text.indexOf(v.token)
    if (at < 0) continue
    if (!best || at < best.at || (at === best.at && v.token.length > best.token.length)) {
      best = { at, token: v.token, label: v.label }
    }
  }
  return best ? best.label[lang] : null
}


export const RESEARCH = {
  num: '05',
  kicker: { en: 'Research questions', zh: '研究问题' },
  title: { en: 'Does one more signal buy one more unit of understanding?', zh: '多一种信号，是否多一份理解？' },
  rq1: { en: 'RQ 01', zh: '问题 01' },
  rq1Title: { en: 'Do human signals improve general manipulation understanding, and are they complementary?', zh: '人体信号能否提升通用操作理解，并产生互补性？' },
  rq1Body: {
    en: 'Under a fixed task split and training budget, we compare a vision-only baseline against modality combinations across six prediction targets. Evaluation isolates participants, objects and scenes to prevent adjacent-clip leakage.',
    zh: '在固定任务划分与训练预算下，针对六个预测目标，对比仅视觉基线与不同模态组合。评估按参与者、物体与场景隔离，避免相邻片段泄漏。',
  },
  metric: { en: 'Prediction target', zh: '预测指标' },
  ablationChart: { en: 'Modality ablation', zh: '模态消融' },
  gainChart: { en: 'Gain over vision-only', zh: '相对仅视觉的增益' },
  rq2: { en: 'RQ 02', zh: '问题 02' },
  rq2Title: { en: 'When visual evidence is insufficient, does an extra signal change the prediction?', zh: '视觉证据不足时，额外信号能否改变预测？' },
  rq2Body: {
    en: 'From average scores to critical moments: behavioural recovery after a failed contact, and load ambiguity when object mass is not visually apparent.',
    zh: '从平均分数走向关键节点：接触失败后的行为恢复，以及物体重量在视觉上不明确时的负载歧义。',
  },
  caseA: { en: 'Failed contact · + EEG', zh: '接触失败 · + EEG' },
  caseB: { en: 'Load ambiguity · + EMG', zh: '负载歧义 · + EMG' },
  visionOnly: { en: 'Vision only', zh: '仅视觉' },
  withSignal: { en: 'Vision + signal', zh: '视觉 + 信号' },
  eventTimeline: { en: 'Event timeline', zh: '事件时间轴' },

  /* ---- RQ 02 critical-moment demo ---- */
  casesLabel: { en: 'Choose a critical moment', zh: '选择关键节点' },
  play: { en: 'Play', zh: '播放' },
  pause: { en: 'Pause', zh: '暂停' },
  replay: { en: 'Replay', zh: '重播' },
  jumpEvent: { en: 'Jump to the event', zh: '跳到该事件' },
  sharedClock: { en: 'Shared timeline for both branches', zh: '两条分支共用的时间轴' },
  authored: { en: 'authored sketch', zh: '示意信号' },
  afterEvent: { en: 'after the event', zh: '事件之后' },
  layerTrail: { en: 'Travelled', zh: '已走过' },
  layerPredict: { en: 'Predicted', zh: '预测' },
  layerTarget: { en: 'Event marker', zh: '事件标记' },
  resetView: { en: 'Reset view', zh: '重置视角' },
  worldHint: { en: 'Drag to orbit · both branches share the camera', zh: '拖拽旋转 · 两条分支共用同一相机' },
  leadLabel: {
    en: 'before the hand reverses. The shaded band is the window a vision-only model cannot see into.',
    zh: '早于手部反向。阴影区间即仅视觉模型看不到的那段窗口。',
  },
  roleLabel: { en: 'What the signal contributes', zh: '该信号补充了什么' },
  webglOff: {
    en: 'The paired scene needs WebGL. The signal strip, the two stated outcomes and the timeline below still work.',
    zh: '成对场景需要 WebGL 支持。下方的信号曲线、两条结果说明与时间轴仍可使用。',
  },
  eventNote: {
    en: 'Both branches start from one shared approach path, so any separation you see is the post-event term and nothing else. The trajectories and the signal strip are authored for legibility: no model was trained and no physiological response was measured. The signal pulls away from baseline before the hand paths diverge, which is the mechanism under test, not a result.',
    zh: '两条分支共用同一条接近路径，因此所见的任何分离都只来自事件后的那一项。轨迹与信号曲线为便于阅读而手工设定：未训练模型，也未测量任何生理反应。信号先于手部路径分离而离开基线，这是待检验的机制，不是结论。',
  },

  /* ---- RQ 02 event-centred evaluation table ---- */
  evalTitle: { en: 'Event-centred evaluation', zh: '事件为中心的评估' },
  evalBadge: { en: 'Simulated · not measured', zh: '模拟数据 · 非实测' },
  evalLead: {
    en: 'The pair above shows the mechanism on one authored pair of paths. The table asks the same question of a set of controls, so the separation can be read against what a channel count alone would buy.',
    zh: '上方成对场景在一对设定轨迹上展示机制；本表用一组对照提出同一个问题，使所见的分离可以与"仅增加一个通道"的收益相比较。',
  },
  evalProtocol: {
    en: 'Proposed protocol: predict one second of hand trajectory and the recovery action after a blocked contact. Splits hold out participant, object and recording; events are aligned and every condition receives the same visual input. Values are five synthetic runs at seed 73, generated rather than measured, and are not drawn from the demo above.',
    zh: '拟议协议：在接触受阻事件后预测 1 秒的手部轨迹与恢复动作。划分按参与者、物体与录制留出；事件对齐，各条件共享同一视觉输入。数值为固定种子 73 下的五次合成运行，属生成而非实测，也不取自上方 demo。',
  },
  evalColInput: { en: 'Input & control', zh: '输入与对照' },
  evalColAde: { en: 'ADE reduction vs vision', zh: '相对视觉 ADE 降幅' },
  evalProposed: { en: 'proposed', zh: '拟议' },
  evalControl: { en: 'control', zh: '对照' },
  evalValueNote: {
    en: 'Every cell is the mean ± sample SD (ddof = 1) of five runs, the same rule the ablation table states.',
    zh: '每格为五次运行的均值 ± 样本标准差（ddof = 1），与消融表所述规则一致。',
  },
  evalTableNote: {
    en: 'The two ablation controls carry no temporal information — shuffled EEG is drawn from the same channel at random times and constant EEG holds one fixed level — so they isolate what a channel count alone would buy. That they stay near the baseline is the evidence that the proposed row’s separation comes from timing rather than from the extra input. These are design numbers for a protocol that has not been run; they demonstrate how the question should be tested and do not establish that EEG carries this.',
    zh: '两个消融对照不含时间信息——打乱脑电取自同一通道但时间随机，常量脑电保持单一水平——因此它们分离出"仅增加一个通道"能带来的收益。它们停留在基线附近，正是拟议行的分离来自时序、而非来自多一路输入的证据。这些是尚未执行的方案设计数字，用来说明该问题应如何检验，不证明脑电确实携带这一信息。',
  },
} as const

export interface Metric {
  id: string
  label: Bi
  unit: Bi
  direction: 'up' | 'down'
  /** Synthetic values — replaced by real evaluation output later. */
  values: { vision: number; eeg: number; emg: number; gaze: number; all: number }
}
export const METRICS: Metric[] = [
  { id: 'gesture', label: { en: 'Gesture classification accuracy', zh: '手势分类准确率' }, unit: { en: '%', zh: '%' }, direction: 'up', values: { vision: 72.4, eeg: 74.1, emg: 78.9, gaze: 75.6, all: 81.3 } },
  { id: 'position', label: { en: 'Current hand position error', zh: '当前手部位置误差' }, unit: { en: 'cm', zh: 'cm' }, direction: 'down', values: { vision: 4.82, eeg: 4.71, emg: 4.09, gaze: 4.55, all: 3.88 } },
  { id: 'joint', label: { en: 'Current joint angle error', zh: '当前关节角误差' }, unit: { en: '°', zh: '°' }, direction: 'down', values: { vision: 11.6, eeg: 11.4, emg: 10.1, gaze: 11.2, all: 9.4 } },
  { id: 'ade', label: { en: 'Future trajectory ADE', zh: '未来轨迹 ADE' }, unit: { en: 'cm', zh: 'cm' }, direction: 'down', values: { vision: 6.31, eeg: 6.18, emg: 5.72, gaze: 5.94, all: 5.41 } },
  { id: 'fde', label: { en: 'Future trajectory FDE', zh: '未来轨迹 FDE' }, unit: { en: 'cm', zh: 'cm' }, direction: 'down', values: { vision: 12.7, eeg: 12.4, emg: 11.5, gaze: 11.9, all: 10.8 } },
  { id: 'future', label: { en: 'Future gesture accuracy', zh: '未来手势准确率' }, unit: { en: '%', zh: '%' }, direction: 'up', values: { vision: 64.8, eeg: 66.2, emg: 69.5, gaze: 67.9, all: 72.1 } },
]

export const FORMAT = {
  num: '06',
  kicker: { en: 'Data organisation', zh: '数据组织' },
  title: { en: 'Keep the native rate. Align on demand.', zh: '保留原始节奏，按需对齐。' },
  body: {
    en: [
      'Sensors do not share a sampling rate, and resampling everything onto the slowest channel destroys exactly the high-frequency detail the physiological signals exist to provide. The usual fix is to pre-synchronise the whole corpus; that fix is lossy and permanent.',
      'This dataset instead ships a small extension to LeRobot in which every feature owns its own parquet file, its own timestamps and its own sampling grid. A separate master index holds one row per frame. Alignment is not baked into the stored data — it is decided per feature at query time, which is why the same episode can answer a nearest-neighbour query for pose and a windowed query for EEG without either being degraded.',
    ],
    zh: [
      '各传感器采样率并不相同。若把所有信号重采样到最慢的通道，恰好会摧毁生理信号存在的意义——高频细节。常见做法是预先同步整份数据，但这一做法有损且不可逆。',
      '本数据集改为随 LeRobot 附带一个小型扩展：每个特征拥有自己的 parquet 文件、自己的时间戳与采样栅格，另有一份主索引按帧记录一行。对齐不写入存储数据，而是在查询时按特征决定——因此同一段 episode 既能以最近邻回答位姿，又能以窗口回答脑电，两者都不被降级。',
    ],
  },

  /* ---- animated write / read figure ---- */
  figWrite: { en: 'Write: each stream timestamps itself', zh: '写入：每条流自行打时间戳' },
  figRead: { en: 'Read: the master clock drives every lookup', zh: '读取：主时钟驱动每一次查找' },
  stepWrite: { en: 'Writing', zh: '写入中' },
  stepSaved: { en: 'On disk', zh: '已落盘' },
  stepRead: { en: 'Querying frame %n', zh: '查询第 %n 帧' },
  stepAligned: { en: 'Aligned per feature', zh: '按特征对齐完成' },
  playback: { en: 'Play the read/write cycle', zh: '播放读 / 写循环' },
  pause: { en: 'Pause', zh: '暂停' },
  replay: { en: 'Replay', zh: '重播' },
  writeHint: {
    en: 'Between two task calls every high-rate sensor writes many samples, each stamped on its own grid.',
    zh: '两次 task 调用之间，每条高速传感器都写入多条采样，各自按自己的栅格打上时间戳。',
  },
  readHint: {
    en: 'One master frame resolves into one reading per feature, read in whichever mode that feature declares.',
    zh: '一个主帧解析为每个特征的一条读数，按其自身声明的模式读取。',
  },
  masterIndex: { en: 'master_index.parquet', zh: 'master_index.parquet' },
  queryLabel: { en: 'frame 10 → t = 0.333 s', zh: '第 10 帧 → t = 0.333 s' },
  windowBand: { en: 'window (−33 ms, 0]', zh: 'window（−33 ms, 0]' },
  perFeature: { en: 'feature', zh: '特征' },
  rowsCol: { en: 'returned', zh: '返回' },
  modeCol: { en: 'read as', zh: '读取方式' },
  rowsWord: { en: 'rows', zh: '行' },
  buffering: { en: 'buffering', zh: '缓冲中' },
  episodeNote: {
    en: 'Row counts are for one 2 s episode at 30 fps: a numeric parquet holds rate × duration rows, a camera parquet one timestamp row per frame.',
    zh: '行数按一段 2 秒、30 fps 的 episode 计：数值 parquet 存放 采样率 × 时长 行，相机 parquet 每帧一行时间戳。',
  },
  modeTitle: { en: 'Alignment is a read-time decision', zh: '对齐是读取时的决定' },
  modeNote: {
    en: 'The window is not a property of the stored data. The same dataset reopened with window_overrides answers a wider band, and a feature can be switched between nearest, interpolate and range without rewriting a byte.',
    zh: '窗口不是存储数据的固有属性。用 window_overrides 重新打开同一数据集即可返回更宽的区间；同一特征可在最近邻、插值与区间查询之间切换，而无需改写任何字节。',
  },
  timingRule: {
    en: 'A feature’s timestamps are generated from its own counter: ts = timestamp_start + n / fps. The frame timestamp comes from the master clock: t = frame_index / fps.',
    zh: '特征时间戳由其自身计数器生成：ts = timestamp_start + n / fps；帧时间戳来自主时钟：t = frame_index / fps。',
  },

  /* ---- drop-in compatibility ---- */
  compatTitle: { en: 'Drop-in with LeRobot', zh: '无缝兼容 LeRobot' },
  compatLede: {
    en: 'The class inherits LeRobotDataset and overrides four methods. Loading looks like LeRobot, and what comes back is the same dict LeRobot returns — same keys, same index fields, same CHW images — so existing training code runs unchanged.',
    zh: '该类继承 LeRobotDataset 并仅重写四个方法。加载方式与 LeRobot 一致，返回的也正是 LeRobot 返回的同一个 dict——相同的键、相同的索引字段、相同的 CHW 图像——因此现有训练代码无需修改即可运行。',
  },
  compatKey: { en: 'Same dict out', zh: '输出的 dict 相同' },
  compatDiff: { en: 'What the extension changes', zh: '扩展改变了什么' },
  compatSame: [
    { en: 'Same import shape and constructor: repo_id, root, episodes, delta_timestamps', zh: '导入形式与构造参数一致：repo_id、root、episodes、delta_timestamps' },
    { en: 'Same per-frame dict: timestamp, frame_index, episode_index, index, task_index, task', zh: '每帧返回同一套 dict：timestamp、frame_index、episode_index、index、task_index、task' },
    { en: 'Cameras still return CHW tensors; torchvision transforms still apply', zh: '相机仍返回 CHW 张量；torchvision 变换仍可用' },
    { en: 'Iteration, len(dataset) and delta_timestamps behave as before', zh: '迭代、len(dataset) 与 delta_timestamps 行为不变' },
  ],
  compatAdds: [
    { en: 'add_frame(key, value) writes one field at a time, so a 1000 Hz sensor can write 33 times between two frames', zh: 'add_frame(key, value) 逐字段写入，1000 Hz 传感器可在两帧之间写入 33 次' },
    { en: 'A per-feature window: nearest, interpolate or (start, end)', zh: '按特征设置窗口：最近邻、插值或 (start, end)' },
    { en: 'A per-feature fps and tolerance_s, plus a master frame index', zh: '按特征设置 fps 与 tolerance_s，另有主帧索引' },
    { en: 'An automatic alignment report written to meta/alignment_check.jsonl', zh: '自动生成对齐报告，写入 meta/alignment_check.jsonl' },
  ],

  layoutTitle: { en: 'Episode layout on disk', zh: '磁盘上的 episode 结构' },
  formatChart: { en: 'Native sampling rates', zh: '原生采样率' },
  layoutParquet: { en: 'numeric + timestamps', zh: '数值与时间戳' },
  layoutVideo: { en: 'video', zh: '视频' },
  layoutIndex: { en: 'master frame index', zh: '主帧索引' },
  writeLabel: { en: 'Write', zh: '写入' },
  readLabel: { en: 'Read', zh: '读取' },
  readResult: { en: 'one multimodal window at time t', zh: '时刻 t 的多模态窗口' },

  /* ---- live read-out on a released episode ---- */
  readoutEpisode: { en: 'Episode', zh: '片段' },
  readoutFrame: { en: 'Frame', zh: '帧' },
  readoutAt: { en: 'at', zh: '时刻' },
  readoutSourceClock: { en: 'source clock', zh: '源时钟' },
  readoutWindow: { en: 'window (−1/FPS, 0]', zh: '窗口（−1/FPS, 0]' },
  readoutPlay: { en: 'Play clip', zh: '播放片段' },
  readoutPause: { en: 'Pause clip', zh: '暂停片段' },
  readoutCameras: {
    en: 'Four head-mounted views, decoded at this frame',
    zh: '四个头戴视角，解码到该帧',
  },
  readoutSignals: {
    en: 'One second around the frame, every released sample drawn',
    zh: '该帧前后一秒，绘制全部已发布样本',
  },
  readoutReturned: { en: 'Returned at this frame', zh: '该帧返回' },
  readoutRowsWord: { en: 'rows', zh: '行' },
  readoutEmpty: { en: 'no sample in window', zh: '窗口内无样本' },
  readoutClipStrip: {
    en: 'Samples the window returns, frame by frame across the clip',
    zh: '逐帧统计窗口返回的样本数',
  },
  readoutClipNote: {
    en: 'The master clock runs at 30 fps and these streams deliver at 100 Hz, so a one-frame window holds three samples at some frames and four at others — and none at the clip’s first frame. This is the phase pattern those two rates produce, read off the file rather than assumed.',
    zh: '主时钟为 30 fps，而这些流以 100 Hz 输出，因此一帧宽的窗口在某些帧包含三个样本、在另一些帧包含四个，且在片段第一帧为空。这是两个采样率实际形成的相位模式，直接从文件中读出，而非假定。',
  },
  readoutUnitNative: {
    en: 'Units are the capture’s own: it declares these values native and uncorrected, so no µV or mV is asserted for the traces.',
    zh: '单位沿用采集方原始声明：其元数据明言这些值为原生且未经校正，因此对波形不标注微伏或毫伏。',
  },
  readoutFig: { en: 'Reading a released episode', zh: '读取已发布 episode' },
  readoutFigAside: { en: 'decoded from the release', zh: '由发布数据解码' },
  readoutNote: {
    en: 'Nothing here is a mock-up: switch episode or drag the frame and the four views re-decode from that episode’s video files while the traces and the shaded window come from its sample.json, in the capture’s own undeclared units.',
    zh: '此处没有模拟内容：切换片段或拖动帧，四个视角会从该 episode 的视频文件重新解码，波形与阴影窗口则来自其 sample.json，使用采集方自己声明的原始单位。',
  },
} as const

export const PIPELINE = {
  num: '07',
  kicker: { en: 'Processing and provenance', zh: '处理与溯源' },
  title: { en: 'Many streams, one spatiotemporal reference.', zh: '多条信号流，汇入一个时空参考。' },
  aside: {
    en: 'Align time and coordinates first, then attach semantics. Every output keeps a record of where it came from and how good it is.',
    zh: '先对齐时间与坐标，再关联语义。每个输出都保留来源与质量记录。',
  },
  body: [
    {
      en: 'Seven pathways enter at the left — six measured signals and the annotation layer. Each keeps its own native rate and passes a pair of processing modules chosen for that modality; nothing is resampled just to make the columns line up.',
      zh: '左侧进入七条通路——六路实测信号，加上一层标注。每条通路保留自己的原生采样率，并通过一对为该模态选定的处理模块；不会为了对齐列宽而重采样。',
    },
    {
      en: 'They then meet one shared contract: an explicit clock, an explicit coordinate frame, a quality gate, and query-time fusion. Because the contract is shared and the outputs keep their provenance, a signal that fails the gate is quarantined rather than silently averaged into the rest, and a reader can always tell which fields are measured, which are estimated, and which were reconstructed.',
      zh: '随后它们汇入同一份契约：显式的时钟、显式的坐标系、质量门控与查询时融合。由于契约共享、输出保留溯源，通不过门控的信号会被隔离，而不会被静默平均进其余数据；读者也始终能分辨哪些字段是实测、哪些是估计、哪些是重建。',
    },
  ],
  figKicker: { en: 'Figure 03 / Processing framework', zh: '图 03 / 处理框架' },
  figTitle: {
    en: 'Four-stage framework from native multimodal input to unified episodes',
    zh: '从原生多模态输入到统一片段的四阶段框架',
  },
  figDesc: {
    en: 'Seven signal pathways flow left to right through per-modality processing, then one shared temporal calibration, spatial calibration, quality gate and query fusion, and out into episode fields with provenance.',
    zh: '七条信号通路自左向右经过逐模态处理，再经过共享的时间校准、空间校准、质量门控与查询融合，输出带溯源的片段字段。',
  },
  figScrollAria: {
    en: 'Full framework diagram; scroll horizontally',
    zh: '完整框架图，可左右滚动',
  },
  figLegend: {
    en: 'M measured · E estimated · R reconstructed · A annotated — the letter marks the provenance of an output field.',
    zh: 'M 实测 · E 估计 · R 重建 · A 标注——字母表示输出字段的来源。',
  },
  figKeyDashed: {
    en: 'Dashed border = route or method still to be fixed',
    zh: '虚线边框 = 路线或方法待定',
  },
  playFlow: { en: 'Play illustration', zh: '播放示意' },
  pauseFlow: { en: 'Pause illustration', zh: '暂停示意' },
  fields: { en: 'Episode fields', zh: '片段字段' },
  provTitle: { en: 'Provenance carried by every field', zh: '每个字段所携带的溯源' },
  outTitle: { en: 'Unified episode: 3D world · action · attention · signal', zh: '统一 episode：3D 世界 · 动作 · 注意 · 信号' },
  provenanceTitle: { en: 'Provenance tags', zh: '溯源标签' },
  provenance: [
    { t: { en: 'Measured', zh: '实测' }, d: { en: 'Read directly from a sensor', zh: '直接来自传感器' } },
    { t: { en: 'Estimated', zh: '估计' }, d: { en: 'Inferred by a model', zh: '由模型推断' } },
    { t: { en: 'Reconstructed', zh: '重建' }, d: { en: 'Fused or upsampled', zh: '融合或上采样' } },
    { t: { en: 'Annotated', zh: '标注' }, d: { en: 'Added by a human', zh: '由人工添加' } },
  ],
} as const

export const ACCESS = {
  num: '08',
  kicker: { en: 'Explore and access', zh: '探索与获取' },
  title: { en: 'Find the episode. Take the entry point with you.', zh: '找到片段，带走研究入口。' },
  filterTier: { en: 'Tier', zh: '层级' },
  filterModality: { en: 'Modality', zh: '模态' },
  filterSearch: { en: 'Task or scene', zh: '任务或场景' },
  filterSearchPlaceholder: { en: 'e.g. chopsticks, drinks, medication', zh: '例如：筷子、饮品、药品' },
  all: { en: 'All', zh: '全部' },
  noModality: { en: 'Any', zh: '不限' },
  results: { en: 'episodes', zh: '段' },
  clear: { en: 'Clear selection', zh: '清除选择' },
  copy: { en: 'Copy', zh: '复制' },
  copied: { en: 'Copied', zh: '已复制' },
  installLabel: { en: 'Install the client', zh: '安装客户端' },
  fetchLabel: { en: 'Fetch the selected episodes', zh: '获取所选片段' },
  manifest: { en: 'Download selection manifest', zh: '下载所选清单' },
  emptyState: { en: 'No episodes match these filters.', zh: '没有符合条件的片段。' },
} as const

export const RELEASE = {
  num: '09',
  kicker: { en: 'Release plan', zh: '发布计划' },
  title: { en: 'From research prototype to a reusable data resource.', zh: '从研究原型，走向可复用的数据资源。' },
  steps: [
    { n: '01', t: { en: 'Data', zh: '数据' }, d: { en: 'Calibrated acquisition subsets, synchronisation and extrinsics published per tier.', zh: '经标定的采集子集，逐层发布同步与外参。' } },
    { n: '02', t: { en: 'Annotation', zh: '标注' }, d: { en: 'Task stages, object indices, signal quality reports and provenance for every derived field.', zh: '任务阶段、物体索引、信号质量报告与逐字段溯源。' } },
    { n: '03', t: { en: 'Evaluation', zh: '评估' }, d: { en: 'Benchmark tasks, split protocols and reproducible baselines.', zh: 'Benchmark 任务、划分协议与可复现基线。' } },
    { n: '04', t: { en: 'Access', zh: '获取' }, d: { en: 'Data card, licensing and consent documentation, indexed download, Python interface.', zh: '数据卡、许可与授权文档、索引下载、Python 接口。' } },
  ],
} as const

export const COMMUNITY = {
  num: '10',
  kicker: { en: 'Community', zh: '生态' },
  title: { en: 'Collaborating institutions', zh: '合作机构' },
} as const

export const FOOTER = {
  tagline: { en: 'Recording the action, and the person behind it.', zh: '记录操作，也记录操作背后的人。' },
  citeTitle: { en: 'Cite this work', zh: '引用本文' },
  licenseTitle: { en: 'License', zh: '许可' },
  licenseBody: {
    en: 'Documentation and released data subsets are distributed under CC BY-NC 4.0. Non-commercial research and educational use is permitted with attribution; commercial use requires separate agreement.',
    zh: '文档与已发布数据子集采用 CC BY-NC 4.0 许可。允许署名后的非商业研究与教学使用；商业使用需另行协商。',
  },
  consentTitle: { en: 'Data statement', zh: '数据声明' },
  consentBody: {
    en: 'L3 episodes were collected from participants who gave informed consent for research use and public release of de-identified recordings. No personally identifying information is included. L1 and L2 tiers are in preparation and will follow the same consent protocol.',
    zh: 'L3 片段的参与者已签署知情同意，同意将去标识化录制用于研究与公开发布。数据中不含可识别个人身份的信息。L1 与 L2 层正在准备中，将遵循同一套知情同意流程。',
  },
  contactTitle: { en: 'Contact', zh: '联系' },
  contactBody: { en: 'Correspondence regarding data access and collaboration:', zh: '数据获取与合作事宜请联系：' },
  rights: { en: 'Public-facing research outline.', zh: '对外研究说明。' },
} as const

export const UI = {
  languageToggle: { en: '中文', zh: 'EN' },
  languageToggleAria: { en: 'Switch to Chinese', zh: '切换到英文' },
  menu: { en: 'Menu', zh: '菜单' },
  close: { en: 'Close', zh: '关闭' },
  toTop: { en: 'Back to top', zh: '回到顶部' },
  copy: { en: 'Copy', zh: '复制' },
  copied: { en: 'Copied', zh: '已复制' },
  copyFailed: { en: 'Copy failed', zh: '复制失败' },
  copyBibtex: { en: 'Copy the BibTeX entry', zh: '复制 BibTeX 条目' },
} as const
