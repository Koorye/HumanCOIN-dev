/**
 * The cover band: the journal-cover reading at the top of the page.
 *
 * Structure follows a printed cover rather than a landing page. A masthead rule
 * with the project name and issue line, then the paper title set in the display
 * serif — a cover carries the title, and the claim and the standfirst belong to
 * the abstract, where there is room to argue them.
 *
 * The figure is the acquisition itself: four real camera views from the
 * released L3 headband, shown as a 2 × 2 grid, and beside them the structure of
 * the non-visual channels. The channels are read from the same stream list the
 * viewer uses, so the cover cannot describe a different sensor set than the
 * release.
 */

import type { Bi } from '@/content'

export const COVER = {
  masthead: { en: 'HumanCOIN', zh: 'HumanCOIN' },
  issue: { en: 'Dataset release · 2026', zh: '数据集发布 · 2026' },
  discipline: {
    en: 'Egocentric multimodal human signals',
    zh: '第一人称多模态人体信号',
  },
  /* The cover carries the paper title and nothing else. */
  title: {
    en: 'HumanCOIN: A Large-Scale Egocentric Multimodal Human-Signal Dataset for Embodied Manipulation',
    zh: 'HumanCOIN：面向具身操作的大规模第一人称多模态人体信号数据集',
  },
  figureLabel: { en: 'Cover figure', zh: '封面图' },
  figureNote: {
    en: 'Four synchronised views from the released L3 headband, with the non-visual channels read beside them. One recorded moment, one clock.',
    zh: '已发布 L3 头环的四路同步视角，旁边是同一瞬间的非视觉通道。同一个被记录的时刻，共用一个时钟。',
  },
  scroll: { en: 'Read the release', zh: '开始阅读' },
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
 * The cover's figure metadata: the four real camera views and the structure of
 * the channels that have no image of their own.
 */
export const COVER_FIGURE = {
  /* The RGB view is the video grid itself; these are the streams that are not
     the camera, so `modality` counts them rather than repeating the camera. */
  modality: { en: 'Other streams · one instant', zh: '其余信号 · 同一瞬间' },
  camsLabel: { en: 'Headband views', zh: '头环视角' },
  plateLabel: { en: 'Recorded episodes', zh: '已录制片段' },
  signalsLabel: { en: 'Non-visual channels', zh: '非视觉通道' },
  signalsNote: {
    en: 'One representative window per channel, drawn at its own native rate; all windows and the four views are aligned to the same instant.',
    zh: '每通道一段代表性窗口，按各自原生采样率绘制；所有窗口与四路视角对齐到同一瞬间。',
  },
  cameras: [
    { id: 'L', file: 'real/main-headband-left.mp4', poster: 'real/poster-left.jpg', label: { en: 'Left', zh: '左目' } },
    { id: 'R', file: 'real/main-headband-right.mp4', poster: 'real/poster-right.jpg', label: { en: 'Right', zh: '右目' } },
    { id: 'BL', file: 'real/main-headband-bleft.mp4', poster: 'real/poster-bleft.jpg', label: { en: 'Left · wide', zh: '左广角' } },
    { id: 'BR', file: 'real/main-headband-bright.mp4', poster: 'real/poster-bright.jpg', label: { en: 'Right · wide', zh: '右广角' } },
  ] as { id: string; file: string; poster: string; label: Bi }[],
  /* Twelve released L3 takes, as a plate under the live views. */
  plate: [
    'thumb-01', 'thumb-02', 'thumb-03', 'thumb-04', 'thumb-05', 'thumb-06',
    'thumb-07', 'thumb-08', 'thumb-09', 'thumb-10', 'thumb-11', 'thumb-12',
  ],
  /* One entry per non-visual channel: identity, colour token, native rate. */
  streams: [
    { id: 'gaze', label: { en: 'Gaze', zh: '注视' }, color: 'var(--k-teal)', rate: '120 Hz' },
    { id: 'pose', label: { en: 'Pose', zh: '位姿' }, color: 'var(--k-violet)', rate: '60 Hz' },
    { id: 'glove', label: { en: 'Glove', zh: '手套' }, color: 'var(--k-amber)', rate: '60 Hz' },
    { id: 'emg', label: { en: 'EMG', zh: '肌电' }, color: 'var(--k-amber)', rate: '1000 Hz' },
    { id: 'eeg', label: { en: 'EEG', zh: '脑电' }, color: 'var(--k-violet)', rate: '500 Hz' },
  ] as { id: string; label: Bi; color: string; rate: string }[],
} as const
