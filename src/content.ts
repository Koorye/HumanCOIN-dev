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
  { id: 'format', num: '05', label: { en: 'Format', zh: '数据格式' } },
  { id: 'pipeline', num: '06', label: { en: 'Pipeline', zh: '处理流程' } },
  { id: 'community', num: '07', label: { en: 'Community', zh: '合作机构' } },
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

/**
 * Named authors of the report, in its order. The draft leaves several industry
 * slots as "TBD"; those placeholders cannot appear in a citation, so only the
 * named authors are carried into the BibTeX entry.
 */
export const AUTHORS = [
  'Shihan Wu', 'You Liu', 'Chunyu He', 'Minghui Qin', 'Xiang Yang', 'Longhan Jiao',
  'Shaoxuan Xie', 'Runtian Xu', 'Tengfei Pan', 'Yance Jiao', 'Yunyan Zhang',
  'Kaiqian Tian', 'Wenjie Chen', 'Jingrui Pang', 'Zhiwei Yu', 'Yihang Li',
  'Jiangmiao Pang', 'Kai Zhu', 'Jianxing Chen', 'Sihan Liu', 'Xiaofeng Wang',
  'Zheng Zhu', 'Jie Zhao', 'Jing Li', 'Zhongpu Xia', 'Jianwei Niu', 'Wei Li',
  'Zhexuan Yang', 'Yue Cao', 'Ji Zhao', 'Dongsheng Jiang', 'Yongwei Wang',
  'Yunge Liu', 'Bo Lei', 'Huan Yang', 'Tiejun Huang', 'Zhongyuan Wang',
  'Guocai Yao',
] as const

/**
 * The report's citation record. It is an institutional technical report with
 * no venue or DOI, so the entry carries the institution and the report URL.
 */
export const CITATION = {
  key: 'wu2026humancoin',
  type: 'techreport',
  title: 'HumanCOIN: The Human-Signal Dataset at the Scale of Egocentric Manipulation',
  year: '2026',
  institution: 'Beijing Academy of Artificial Intelligence',
  reportType: 'Technical Report',
  url: 'https://koorye.github.io/HumanCOIN-dev',
  license: 'CC BY-NC 4.0',
} as const

export const ABSTRACT = {
  title: { en: 'Abstract', zh: '摘要' },
  body: {
    en: [
      'HumanCOIN is a large-scale egocentric multimodal dataset for embodied manipulation. Beyond conventional first-person observation — head-mounted multi-view RGB, wrist cameras, and hand and body pose — it records the state of the operator: gaze, surface electromyography, electroencephalography, and glove-level finger kinematics, all under one clock and one spatiotemporal reference. The data is organised in three tiers — visual intention, motor intention, and cognitive intention — each adding the modalities the layer below does not carry, so that scene coverage and signal depth can be studied together rather than as competing axes.',
    ],
    zh: [
      'HumanCOIN 是面向具身操作的大规模第一人称多模态数据集。除常规第一人称观测（头戴多目 RGB、腕部相机、手部与身体姿态）外，它同步记录操作者自身的状态信号：注视、表面肌电、脑电与手套级手指运动学，全部在统一时钟与统一时空参考下采集。数据按视觉意图、动作意图、认知意图三层组织，每层加入下一层不具备的模态，使"场景覆盖"与"信号深度"可以一并研究，而非相互竞争。',
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
  after: Bi
}

export const MOTIVATION = {
  tabsLabel: { en: 'Choose a task', zh: '选择任务' },
  keyMoment: { en: 'Key moment', zh: '关键时刻' },
  adds: { en: 'What it adds', zh: '它补充了什么' },
  hint: { en: 'Plays on its own · hover to pause', zh: '自动播放 · 悬停暂停' },
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
      after: { en: 'Watch the connector pull back, realign, and go in.', zh: '接口回撤、重新对齐，再次插入。' },
    },
  ] as MotivationCase[],
}

export const ACQUISITION = {
  num: '02',
  kicker: { en: 'Acquisition architecture', zh: '采集体系' },
  title: { en: 'One pyramid: breadth at the base, measurement density at the apex.', zh: '一座金字塔：底座是广度，顶端是测量密度。' },
  aside: {
    en: 'Downwards, the pyramid widens: more scenes, more hours, more everyday variation. Upwards, it narrows: fewer hours, but the signals move inwards — where the eyes fall on the world, how the muscles execute, what the cortex is doing. Every tier shares the same task ontology.',
    zh: '向下，金字塔变宽：场景更多、时长更长、日常变化更丰富。向上，它收窄：时长更短，但信号来源向内推进——眼睛落向世界哪里，肌肉如何执行，皮层正在做什么。三层共享同一套任务本体。',
  },
  tierAxis: { en: 'Measurement density', zh: '测量密度' },
  scaleAxis: { en: 'Scene coverage and volume', zh: '场景覆盖与规模' },
  tiersTitle: { en: 'Select a tier', zh: '选择层级' },
  hardwareTitle: { en: 'New at this tier', zh: '本层新增' },
  inheritTitle: { en: 'Carried from below', zh: '继承设备' },
  inheritNote: { en: 'Names only; detailed on the tier it came from.', zh: '仅列名称；详细配置见来源层。' },
} as const

/**
 * Body-worn instrument ids. Shared between the tier inventory and the anatomy
 * view, so the two panels cannot drift apart.
 */
export type DeviceId = 'rgb' | 'eeg' | 'gaze' | 'emg' | 'gloves' | 'vive' | 'wrist'

export interface Tier {
  id: 'L1' | 'L2' | 'L3'
  name: Bi
  hours: string
  hoursLabel: Bi
  accent: 'blue' | 'teal' | 'violet'
  summary: Bi
  seats: Bi
  devices: { id: DeviceId; name: Bi; detail: Bi }[]
  /** Tiers already carrying these instruments; listed in shorthand, not repeated. */
  inherits: { from: 'L1' | 'L2'; ids: DeviceId[] }[]
}

export const TIERS: Tier[] = [
  {
    id: 'L1',
    name: { en: 'Visual intention', zh: '视觉意图' },
    hours: '10,000',
    hoursLabel: { en: 'hours planned', zh: '规划小时' },
    accent: 'blue',
    summary: {
      en: 'The visual target the operator intends to acquire — the shallowest signal, read from the world. Head-mounted capture of heterogeneous everyday environments; gaze is inferred from the views, marking where visual attention falls before the hand moves.',
      zh: '操作者意图看向的目标——最浅的一层信号，从世界本身读出。头戴采集异构日常环境，注视由画面推断，在手动作之前标记视觉注意的落点。',
    },
    seats: { en: 'No fixed rig · head-mounted capture, gaze estimated from the views', zh: '无固定席位 · 头戴采集，注视由画面估计' },
    devices: [
      {
        id: 'rgb',
        name: { en: 'Head-mounted capture', zh: '头戴采集' },
        detail: {
          en: '4-camera headband · 2 / 4 / 4+ lens configurations · provenance recorded per source',
          zh: '四目头环 · 2 / 4 / 4+ 目配置 · 逐来源记录出处',
        },
      },
    ],
    inherits: [],
  },
  {
    id: 'L2',
    name: { en: 'Motor intention', zh: '动作意图' },
    hours: '2,000',
    hoursLabel: { en: 'hours planned', zh: '规划小时' },
    accent: 'teal',
    summary: {
      en: 'How the motor intention is carried out: surface EMG at the muscle — the last link of the motor command — plus near-hand wrist views, over semi-structured tasks that leave the desk.',
      zh: '动作意图如何被执行：肌肉处的表面肌电——运动指令的最后一环——以及近手腕视角，覆盖离开桌面的半结构化任务。',
    },
    seats: { en: '8 stations · portable EMG kits plus a shared pool of headbands and wrist cameras', zh: '8 席位 · 便携肌电套件与共享头环、腕相机池' },
    devices: [
      { id: 'emg', name: { en: 'Bilateral surface EMG', zh: '双侧表面肌电' }, detail: { en: '2 sensors per kit, 8 kits', zh: '2 只/套，8 套' } },
      { id: 'wrist', name: { en: 'Wrist cameras', zh: '双腕相机' }, detail: { en: '2 per station · shared pool', zh: '2 只/席位 · 共享设备池' } },
    ],
    inherits: [{ from: 'L1', ids: ['rgb'] }],
  },
  {
    id: 'L3',
    name: { en: 'Cognitive intention', zh: '认知意图' },
    hours: '500',
    hoursLabel: { en: 'hours planned', zh: '规划小时' },
    accent: 'violet',
    summary: {
      en: 'The cognitive intention behind the act: gaze measured rather than inferred, and EEG at the cortex, on controlled tabletop manipulation where calibration quality matters most.',
      zh: '动作背后的认知意图：注视由估计变为实测，脑电直达皮层，用于受控桌面操作任务，对标定质量要求最高。',
    },
    seats: { en: '11 stations · 3 research-grade, 8 portable EEG · tabletop tasks', zh: '11 席位 · 3 研究级、8 便携 EEG · 桌面任务' },
    devices: [
      { id: 'eeg', name: { en: '128 / 32 / 8-channel EEG', zh: '128 / 32 / 8 通道 EEG' }, detail: { en: 'Research-grade amplifier at 3 stations · portable 8-channel caps at 8 stations', zh: '研究级放大器 3 席位 · 便携 8 通道 8 席位' } },
      { id: 'gaze', name: { en: 'Wearable eye tracker', zh: '可穿戴眼动仪' }, detail: { en: 'Binocular gaze, 3 units', zh: '双目注视，3 套' } },
      { id: 'gloves', name: { en: 'Haptic motion-capture gloves', zh: '触觉动捕手套' }, detail: { en: 'MANUS Metaglove Pro · 20 joint angles per hand at capture, released as a 25-node skeleton per hand · 3 pairs', zh: 'MANUS Metaglove Pro · 采集每手 20 个关节角，发布为每手 25 节点骨架 · 3 副' } },
      { id: 'vive', name: { en: 'VIVE Tracker 3.0', zh: 'VIVE Tracker 3.0' }, detail: { en: 'Head and both wrists, 3 per kit', zh: '头部与双腕，3 只/套' } },
    ],
    inherits: [
      { from: 'L1', ids: ['rgb', 'wrist'] },
      { from: 'L2', ids: ['emg'] },
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
  { id: 'rgb', name: { en: 'Head-mounted capture', zh: '头戴采集' }, location: { en: 'Head', zh: '头部' }, code: 'CAM' },
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
  figureLabel: { en: 'Worn rig, front view', zh: '穿戴实拍，正面' },
  cardsLabel: { en: 'Worn instruments', zh: '佩戴仪器' },
  microTop: { en: 'FRONT / WORN RIG', zh: '正面 / 实拍穿戴' },
  microBottom: { en: 'NOT TO SCALE · AI RENDER', zh: '非等比 · AI 渲染' },
  hint: { en: 'Hover to preview; click to pin an instrument.', zh: '悬停预览，点击可固定某件仪器。' },
  activeLabel: { en: 'Pinned', zh: '已固定' },
  noneLabel: { en: 'Nothing pinned.', zh: '未固定任何仪器。' },
} as const

export const DATA = {
  num: '03',
  kicker: { en: 'Data distribution', zh: '数据分布' },
  title: { en: 'Depth for signal, breadth for the world.', zh: '深度取信号，广度取世界。' },
  body: {
    en: [
      'The corpus is cut twice: by signal depth, and by the places people actually work. The 12,500 hours fall into three tiers — 10,000, 2,000 and 500 — and each deeper tier carries every modality of the one before it. The deeper the tier, the smaller its share and the larger the part recorded under a controlled protocol: all of L1 is open, 60% of L2, 30% of L3.',
      'Breadth runs the other way. L1 reaches all eighteen scene classes; L3 narrows to a handful of fixed stations. Between them sit 500+ task entries, a verb lexicon with a short head and a long tail, and 600 object records that grow from a name at L1 into a measured record at L2 and L3.',
    ],
    zh: [
      '语料被切分两次：一次按信号深度，一次按人真正工作的地方。12,500 小时分为三层——10,000、2,000 与 500——每加深一层，都保留前一层的全部模态。层级越深，占比越小，受控协议所占的比例越大：L1 全部开放采集，L2 为 60%，L3 为 30%。',
      '广度则朝相反方向展开。L1 覆盖全部十八类场景，L3 收窄到少数几个固定工位。两者之间是 500+ 任务条目、一条头短尾长的动词词表，以及 600 条物体记录——在 L1 只是一个名称，在 L2 与 L3 成为实测记录。',
    ],
  },
  depthTitle: { en: 'Three tiers, two settings', zh: '三层深度，两种采集' },
  depthAside: { en: '12,500 h · 80 / 16 / 4', zh: '12,500 小时 · 80 / 16 / 4' },
  depthNote: {
    en: 'Hours are the release plan: 10,000 / 2,000 / 500 h, or 80 / 16 / 4% of the corpus. The outer band splits each tier between open and controlled collection; the two photographs are illustrative reconstructions of the settings, not corpus frames.',
    zh: '时长为发布计划：10,000 / 2,000 / 500 小时，占全库 80 / 16 / 4%。外环把每层时长拆分为开放与受控采集；两张照片为采集方式的示意重建，并非语料画面。',
  },
  sceneTitle: { en: 'Eighteen scene classes, three zones', zh: '十八类场景，三个区域' },
  sceneAside: { en: '18 classes · 3 zones', zh: '18 类 · 3 区域' },
  sceneNote: {
    en: 'The chart is the report’s Fig. 2b: eighteen classes, grouped into three zones, each bar stacked by tier. The panel beside it turns through one photograph per class; hovering or focusing a row holds the turn, and the arrows or play control move it by hand. Per-class hours reconstruct the allocation in Fig. 2b, and the photographs are illustrative reconstructions of the classes, not corpus frames.',
    zh: '左侧为报告 Fig. 2b 的场景分布：18 类场景按区域分组，条形按层级堆叠。右侧按顺序自动轮播每一类的照片；悬停或聚焦某行会暂停轮播，箭头与播放键可手动切换。各类小时数按 Fig. 2b 的分配重建；照片为场景类别的示意重建，并非语料画面。',
  },
  verbTitle: { en: 'Eighty verbs, one long tail', zh: '八十个动词，一条长尾' },
  verbAside: { en: '80 of 100+ types', zh: '100+ 种中的 80 个' },
  verbNote: {
    en: 'Counts are annotated step entries from a lexicon of more than 100 verb types; the eighty most frequent are shown, reconstructing the distribution in the report’s Fig. 2c. The first ten carry 47% of the entries plotted here. Colour marks the tier in which an occurrence is recorded, the pointer reads the three counts, and verb labels keep the lexicon’s English entries.',
    zh: '计数为标注步骤条目，取自 100 余种动词的词表；此处显示最常用的八十个，按报告 Fig. 2c 的分布重建。前十个占图中所绘条目的 47%。颜色表示该次出现所属层级，移动指针可读取三层计数；动词标签保留词表中的英文原词。',
  },
  objectTitle: { en: 'Six hundred objects, measured by depth', zh: '六百个物体，按深度记录' },
  objectAside: { en: '600 entries · one opened', zh: '600 条 · 展开一个' },
  objectNote: {
    en: 'Object entries are ordered by instance count and keep the index’s own names; colour is the tier that records the instance. The frequency curve is modelled on the report’s Fig. 2d. The inset opens the report’s example: a cup is a name at L1, and at L2 and L3 it carries shape, colour, material, size and weight. The cup photograph is illustrative.',
    zh: '物体条目按实例数排序，名称保留索引中的英文原词；颜色表示记录该实例的层级。频率曲线参照报告 Fig. 2d 的形态绘制。插图展开报告中的例子：杯子在 L1 只是一个名称，在 L2 与 L3 则带有形状、颜色、材质、尺寸与重量。杯子照片为示意。',
  },
} as const

export const ANNOTATION = {
  num: '04',
  kicker: { en: 'Annotation and inspection', zh: '标注与查看' },
  title: { en: 'One moment, seven kinds of evidence.', zh: '一个时刻，七种证据。' },
  body: {
    en: 'A processed L3 episode, opened. One moment of it is covered by the four headband views, the two wrist views, the third-person camera and the reconstructed depth map, plus gaze, head and wrist 6-DoF pose, glove finger kinematics, surface EMG and EEG — each arriving at its own rate. Over that same moment sits the annotator’s own step sequence, with the action, the hand in use and the objects each step touches.',
    zh: '打开一段处理完成的 L3 片段。同一时刻由四路头环视角、两路腕部视角、第三人称相机与重建深度图覆盖，另有注视、头与腕 6 自由度位姿、手套手指运动学、表面肌电与脑电——各自以自己的速率到达。同一时刻上还叠着标注者自己的步骤序列，含动作、所用手与每步涉及的物体。',
  },
  loading: { en: 'Loading recording…', zh: '正在载入录制…' },
  loadingData: { en: 'Loading signals…', zh: '正在载入信号…' },
  play: { en: 'Play', zh: '播放' },
  pause: { en: 'Pause', zh: '暂停' },
  viewsTitle: { en: 'Synchronised views', zh: '同步视角' },
  timeline: { en: 'Timeline', zh: '时间轴' },
  browseTitle: { en: 'Released recordings', zh: '已发布录制' },
  browseHint: { en: 'Select an episode to load it into the viewer.', zh: '选择一段 episode，载入查看器。' },
  viewLeft: { en: 'Left', zh: '左' },
  viewRight: { en: 'Right', zh: '右' },
  viewBackLeft: { en: 'Rear left', zh: '后左' },
  viewBackRight: { en: 'Rear right', zh: '后右' },
  viewWristLeft: { en: 'Wrist left', zh: '左腕' },
  viewWristRight: { en: 'Wrist right', zh: '右腕' },
  viewThird: { en: 'Third person', zh: '第三人称' },
  viewDepth: { en: 'Depth', zh: '深度' },
  signalEeg: { en: 'EEG', zh: '脑电' },
  signalEmgLeft: { en: 'EMG · left', zh: '肌电 · 左' },
  signalEmgRight: { en: 'EMG · right', zh: '肌电 · 右' },
  hands: { en: 'Fingers', zh: '手指' },
  gaze: { en: 'Gaze', zh: '注视' },
  trail: { en: 'Trail', zh: '轨迹' },
  pose: { en: 'Pose', zh: '位姿' },
  signal: { en: 'Signals', zh: '信号' },
  camera: { en: 'Camera', zh: '相机' },
  cloud: { en: 'RGB cloud', zh: 'RGB 点云' },
  reset: { en: 'Reset view', zh: '重置视角' },
  windowCamera: { en: 'Head camera', zh: '头部相机' },
  windowGaze: { en: 'Eye gaze', zh: '眼动注视' },
  windowGlove: { en: 'Finger kinematics', zh: '手指运动学' },
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
  unsupported3d: {
    en: 'The 3D scene needs WebGL. The camera views and all signal plots remain available.',
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

/**
 * The capture's own step sentences, in English.
 *
 * The upstream annotation is written in Chinese and ships no translation, so
 * these are the release's eleven distinct instructions rendered into English by
 * hand; the Chinese string is the key, because that is what the recording
 * actually contains. Anything not listed here falls through to the recorded
 * text unchanged, so an unseen sentence is shown as-is rather than dropped.
 */
export const STEP_SENTENCES: Record<string, Bi> = {
  把桌上的筷子筒拿到面前: {
    en: 'Bring the chopstick holder on the table to the front',
    zh: '把桌上的筷子筒拿到面前',
  },
  把筷子拿出来放到桌子上: {
    en: 'Take the chopsticks out and set them on the table',
    zh: '把筷子拿出来放到桌子上',
  },
  把筷子都摆放成一个方向: {
    en: 'Lay every chopstick pointing the same way',
    zh: '把筷子都摆放成一个方向',
  },
  把筷子放回筷子筒: {
    en: 'Put the chopsticks back in the holder',
    zh: '把筷子放回筷子筒',
  },
  观察桌子上的卡片: {
    en: 'Look at the card on the table',
    zh: '观察桌子上的卡片',
  },
  取对应的饮品放到卡片上面: {
    en: 'Take the matching drink and place it on the card',
    zh: '取对应的饮品放到卡片上面',
  },
  观察桌子上的饮品: {
    en: 'Look at the drink on the table',
    zh: '观察桌子上的饮品',
  },
  从卡片包中拿出对应的卡片放到饮品边: {
    en: 'Draw the matching card from the deck and lay it beside the drink',
    zh: '从卡片包中拿出对应的卡片放到饮品边',
  },
  根据药的使用说明: {
    en: 'Read the dosage instructions on the medicine',
    zh: '根据药的使用说明',
  },
  往收纳盒里装一天的量: {
    en: 'Fill a single day’s dose into the storage box',
    zh: '往收纳盒里装一天的量',
  },
  '配置好药品，药品位置统一放到左上角': {
    en: 'Set out the medicine, every dose aligned to the top-left',
    zh: '配置好药品，药品位置统一放到左上角',
  },
}

/** Display text for a recorded step sentence, in the active locale. */
export function stepLabel(text: string, lang: L): string {
  return STEP_SENTENCES[text]?.[lang] ?? text
}

/**
 * Group nominals the step sentences reach through — a set noun such as
 * 饮品 ("drinks") that stands for objects the sentence never names. Kept
 * beside `OBJECT_NAMES` rather than in it, because a set noun is not itself an
 * object in the scene.
 */
export const GROUP_NOMINALS: Record<string, Bi> = {
  筷子: { en: 'Chopsticks', zh: '筷子' },
  卡片: { en: 'Cards', zh: '卡片' },
  饮品: { en: 'Drinks', zh: '饮品' },
  药品: { en: 'Medicine', zh: '药品' },
}

/** Display text for a group nominal, in the active locale. */
export function groupLabel(word: string, lang: L): string {
  return GROUP_NOMINALS[word]?.[lang] ?? word
}

export const RESEARCH = {
  num: '05',
  kicker: { en: 'Research questions', zh: '研究问题' },
  title: { en: 'Does one more signal buy one more unit of understanding?', zh: '多一种信号，是否多一份理解？' },
  lead: {
    en: 'The claim is not that more channels help. A signal earns its place only where vision cannot decide on its own, so each question is answered by a group of figures rather than by one: a comparison against a baseline for the first, and a mechanism read at the moment a contact fails for the second.',
    zh: '这里要主张的并不是"通道越多越好"。只有当视觉无法独断时，一路信号才配得上它的位置；因此每个问题都由一组图而非单张图来回答：第一个问题与基线相比，第二个问题在接触失败的那一刻读出机制。',
  },
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
  num: '05',
  kicker: { en: 'Data organisation', zh: '数据组织' },
  title: { en: 'Keep the native rate. Align on demand.', zh: '保留原始节奏，按需对齐。' },
  body: {
    en: [
      'Sensors run at different rates. Resampling everything onto the slowest channel destroys the high-frequency detail the physiological signals exist to provide, and pre-synchronising the corpus is lossy and permanent.',
      'So each feature keeps its own parquet file, timestamps and sampling grid, and a master index holds one row per frame. Alignment is decided per feature at query time, not baked into storage — so one episode answers a nearest-neighbour pose query and a windowed EEG query without degrading either.',
    ],
    zh: [
      '各传感器采样率不同。把所有信号重采样到最慢通道，恰好摧毁生理信号存在的意义——高频细节；预先同步整份数据有损且不可逆。',
      '因此每个特征各持一份 parquet、时间戳与采样栅格，主索引按帧记录一行。对齐在查询时按特征决定，不写入存储——同一段 episode 既能以最近邻回答位姿，又能以窗口回答脑电，两者都不被降级。',
    ],
  },

  /* ---- animated write / read figure ---- */
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
    en: 'The release stores every stream at its native rate — gaze 200 Hz, pose 120 Hz, finger kinematics 200 Hz, EMG 2000 Hz, EEG 256 or 1000 Hz — and never resamples it. This browser preview replays a reduced copy at 100 Hz, so a one-frame window at 30 fps holds three samples at some frames and four at others, and none at the clip’s first frame. The phase pattern comes from those two rates as served here, read off the payload rather than assumed.',
    zh: '发布数据保留每个流的原始采样率——注视 200 Hz、位姿 120 Hz、手指运动学 200 Hz、肌电 2000 Hz、脑电 256 或 1000 Hz——且从不重采样。本网页预览播放的是一份 100 Hz 的缩减副本，因此 30 fps 下的一帧窗口在某些帧含三个样本、另一些帧含四个，片段第一帧为空。该相位模式来自网页实际提供的两个速率，直接从负载读出，而非假定。',
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
  num: '06',
  kicker: { en: 'Processing and provenance', zh: '处理与溯源' },
  title: { en: 'Many streams, one spatiotemporal reference.', zh: '多条信号流，汇入一个时空参考。' },
  aside: {
    en: [
      'Six measured signals plus the annotation layer each keep their native rate, passing a pair of modules chosen for that modality; nothing is resampled to make the columns line up.',
      'They then meet one shared contract — explicit clock, explicit coordinate frame, quality gate, query-time fusion. Outputs keep their provenance, so a signal that fails the gate is quarantined rather than averaged into the rest.',
    ],
    zh: [
      '六路实测信号加一层标注，各自保留原生采样率，经一对为该模态选定的模块处理；不会为了对齐列宽而重采样。',
      '随后汇入同一份契约——显式时钟、显式坐标系、质量门控与查询时融合。输出保留溯源，通不过门控的信号会被隔离，而不会被平均进其余数据。',
    ],
  },
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
  num: '07',
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

export const COMMUNITY = {
  num: '07',
  kicker: { en: 'Community', zh: '生态' },
  title: { en: 'Collaborating institutions', zh: '合作机构' },
} as const

export const INSTALL = {
  kicker: { en: 'Get started', zh: '开始使用' },
  title: { en: 'One line to install. One episode to begin.', zh: '一行安装，一段 episode 即刻开始。' },
  aside: {
    en: 'The client reads the release in place: no resampling, no pre-synchronised copy. Point it at an episode and every stream arrives at its own rate.',
    zh: '客户端直接读取发布数据：不做重采样，也不预先生成同步副本。指定一段 episode，各条信号便以各自原生采样率到达。',
  },
  /** Typed into the terminal one character at a time. */
  command: 'pip install humancoin',
  /** Printed on the next line once the command has been entered. */
  output: {
    en: 'HumanCOIN ready — start working with the release now.',
    zh: 'HumanCOIN 已就绪 —— 即刻开始使用。',
  },
  replay: { en: 'Run again', zh: '重新运行' },
  cta: { en: 'Explore the released episodes', zh: '浏览已发布片段' },
  ctaHref: '#annotation',
} as const

export const FOOTER = {
  tagline: { en: 'Recording the action, and the person behind it.', zh: '记录操作，也记录操作背后的人。' },
  citeTitle: { en: 'Cite this work', zh: '引用本文' },
  licenseTitle: { en: 'License', zh: '许可' },
  licenseBody: {
    en: 'Code is released under Apache-2.0; documentation and released data are distributed under CC BY-NC 4.0. Non-commercial research and educational use is permitted with attribution; commercial use requires separate agreement.',
    zh: '代码采用 Apache-2.0 许可；文档与已发布数据采用 CC BY-NC 4.0 许可。允许署名后的非商业研究与教学使用；商业使用需另行协商。',
  },
  consentTitle: { en: 'Data statement', zh: '数据声明' },
  consentBody: {
    en: 'Participants in all three tiers gave written informed consent before recording and could withdraw at any time. Episodes are released de-identified: no personally identifying information is included, and faces are blurred in every released view. L1, L2 and L3 follow the same consent protocol.',
    zh: '三个层级的参与者在录制前均签署书面知情同意，并可随时退出。发布片段均已去标识化：不含可识别个人身份的信息，所有发布视角中的人脸均已模糊处理。L1、L2、L3 遵循同一套知情同意流程。',
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
