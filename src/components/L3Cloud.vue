<script setup lang="ts">
/**
 * One recorded L3 episode, read six ways at once.
 *
 * A single clock — seconds into the clip — drives everything: the point cloud
 * (7.5 frames a second, recorded geometry), the four camera views, the eye
 * camera with its gaze trajectory and heat, the four signal traces (drawn as a
 * sliding window, so the waveform moves), and the annotation strip.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'

interface FrameMeta {
  frame: number
  time: number
  offset: number
  count: number
  hands: number[]
  bones: number[][]
  axes: number[][]
}
interface CloudMeta {
  dataset: string
  fps: number
  scale: number
  center: number[]
  radius: number
  forward: number[]
  frames: FrameMeta[]
}
interface Signals {
  fps: number
  channels: { emgL: number; emgR: number; eeg: number }
  gazeX: number[]
  gazeY: number[]
  emgL: number[][]
  emgR: number[][]
  eeg: number[][]
  eegNames: string[]
}
interface Gaze2D {
  fps: number
  x: number[]
  y: number[]
}
interface Step {
  start: number
  end: number
  label: string
  object: string
}
interface Subtask {
  start: number
  end: number
  title: string
  object: string
  actions: { label: string; start: number; end: number }[]
}
interface SceneObject {
  name: string
  attrs: string
  where: string
}
interface Steps {
  scene: string
  task: string
  steps: Step[]
  subtasks: Subtask[]
  objects: SceneObject[]
}

const CLIP = 30
const WINDOW = 10 /* seconds of signal shown at once */
const TRAIL = 3 /* seconds of gaze path drawn on the camera */

const RGB = [
  { key: 'left', src: 'real/l3/rgb-left.mp4', label: 'Headband · left' },
  { key: 'right', src: 'real/l3/rgb-right.mp4', label: 'Headband · right' },
  { key: 'wl', src: 'real/l3/rgb-wl.mp4', label: 'Left wrist' },
  { key: 'wr', src: 'real/l3/rgb-wr.mp4', label: 'Right wrist' },
]
/* gaze is measured in the rectified headband-left frame, so that is the image
   the trajectory is drawn on */
const DEPTH_SRC = 'real/l3/depth.mp4'
/* the camera the tracker writes against */
const EYE_SRC = 'real/l3/eye.mp4'

const canvas = ref<HTMLCanvasElement | null>(null)
const rgbEls = ref<HTMLVideoElement[]>([])
const depthEl = ref<HTMLVideoElement | null>(null)
const eyeEl = ref<HTMLVideoElement | null>(null)
const gazeCanvas = ref<HTMLCanvasElement | null>(null)

const meta = ref<CloudMeta | null>(null)
const signals = ref<Signals | null>(null)
const gaze2d = ref<Gaze2D | null>(null)
const steps = ref<Step[]>([])
const subtasks = ref<Subtask[]>([])
const objects = ref<SceneObject[]>([])
const task = ref('')
const sigIndex = ref(0)
let gx0 = 0
let gx1 = 1
let gy0 = 0
let gy1 = 1

const t = ref(0)
const playing = ref(true)
const speed = ref(1)
const layers = ref({ cloud: true, hands: true, bones: true, axes: true })

const frame = computed(() => Math.round(200 + t.value * 30))
const clock = computed(() => `${t.value.toFixed(2)} s`)
const step = computed(() => steps.value.find((s) => t.value >= s.start && t.value < s.end) ?? null)
const subtask = computed(() => subtasks.value.find((s) => t.value >= s.start && t.value < s.end) ?? null)
/* before the annotated stretch begins, the action row previews the next one */
const shownSub = computed(() => subtask.value ?? subtasks.value.find((s) => s.start > t.value) ?? null)

/* ---------- sliding-window traces ---------- */
const TW = 900
const TH = 24
const RH = 20


function windowed(values: number[], h = TH): string {
  const n = values.length
  const i1 = Math.min(n - 1, sigIndex.value)
  const i0 = Math.max(0, Math.round(sigIndex.value - WINDOW * (signals.value?.fps ?? 15)))
  const span = Math.max(1, i1 - i0)
  const pts: string[] = []
  for (let i = i0; i <= i1; i++) pts.push(`${(((i - i0) / span) * TW).toFixed(1)},${((1 - values[i]) * h).toFixed(1)}`)
  return pts.join(' ')
}

/* three modalities, three full-width bands; colour carries the group, so the
   left and right arms, and the four scalp regions, stay legible when stacked */
const REGION: Record<string, string> = {
  F: '#33796f',
  C: '#6f5aa0',
  P: '#8a5a6e',
  O: '#8a5a6e',
  T: '#9a7b2e',
}
const regionOf = (name: string) => REGION[name.charAt(0)] ?? '#33796f'

const bands = computed(() => {
  const s = signals.value
  if (!s) return []
  const Hz = RH
  const hz = Math.round(RH / 4)
  const row = (label: string, v: number[], color: string, h = Hz) => ({ label, color, points: windowed(v, h) })
  return [
    {
      key: 'gaze',
      rowH: Hz,
      title: 'Gaze · x / y',
      legend: [
        { label: 'x', color: '#6f5aa0' },
        { label: 'y', color: '#a8623c' },
      ],
      rows: [row('x', s.gazeX, '#6f5aa0'), row('y', s.gazeY, '#a8623c')],
    },
    {
      key: 'emg',
      rowH: hz,
      title: `EMG · ${s.channels.emgL} left + ${s.channels.emgR} right`,
      legend: [
        { label: 'left', color: '#a8623c' },
        { label: 'right', color: '#2f6f8f' },
      ],
      rows: [
        ...s.emgL.map((v, i) => row(`L${i + 1}`, v, '#a8623c', hz)),
        ...s.emgR.map((v, i) => row(`R${i + 1}`, v, '#2f6f8f', hz)),
      ],
    },
    {
      key: 'eeg',
      rowH: hz,
      title: 'EEG · 16 of 128',
      legend: [
        { label: 'frontal', color: '#33796f' },
        { label: 'central', color: '#6f5aa0' },
        { label: 'posterior', color: '#8a5a6e' },
        { label: 'temporal', color: '#9a7b2e' },
      ],
      rows: s.eeg.map((v, i) => row(s.eegNames[i] ?? `ch ${i + 1}`, v, regionOf(s.eegNames[i] ?? 'F'), hz)),
    },
  ]
})

/* ---------- gaze heat + trail ---------- */
const HEAT_W = 160
const HEAT_H = 90
let heatCanvas: HTMLCanvasElement | null = null
let heatCtx: CanvasRenderingContext2D | null = null

function drawGaze() {
  const g = gaze2d.value
  const cv = gazeCanvas.value
  if (!g || !cv) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = cv.clientWidth
  const h = cv.clientHeight
  if (!w || !h) return
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
  }
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  /* The exported eye_gaze x/y never leaves a 0.46–0.52 × 0.64–0.73 box over the
     whole clip, so it is not a scene-camera gaze point: it is the tracker's own
     frame. The plot is therefore fitted to the recorded range and labelled as
     such, instead of being laid over a camera it does not belong to. */
  const pad = 0.08
  const px = (nx: number) => ((nx - gx0) / Math.max(gx1 - gx0, 1e-6)) * w
  const py = (ny: number) => ((ny - gy0) / Math.max(gy1 - gy0, 1e-6)) * h
  void pad

  if (!heatCanvas) {
    heatCanvas = document.createElement('canvas')
    heatCanvas.width = HEAT_W
    heatCanvas.height = HEAT_H
    heatCtx = heatCanvas.getContext('2d')
  }
  const hc = heatCtx!
  hc.clearRect(0, 0, HEAT_W, HEAT_H)

  const i1 = Math.min(g.x.length - 1, Math.round(t.value * g.fps))
  const i0 = Math.max(0, Math.round((t.value - TRAIL) * g.fps))
  /* a short moving average, because raw gaze jitters between saccades */
  const sx: number[] = []
  const sy: number[] = []
  for (let i = i0; i <= i1; i++) {
    let ax = 0
    let ay = 0
    let n = 0
    for (let k = Math.max(i0, i - 4); k <= Math.min(i1, i + 4); k++) {
      ax += g.x[k]
      ay += g.y[k]
      n++
    }
    sx.push(ax / n)
    sy.push(ay / n)
  }
  const grid = new Float32Array(HEAT_W * HEAT_H)
  /* the heat is cumulative: every sample so far, not just the visible trail */
  for (let i = 0; i <= i1; i++) {
    const cx = Math.floor(((g.x[i] - gx0) / (gx1 - gx0)) * (HEAT_W - 1))
    const cy = Math.floor(((g.y[i] - gy0) / (gy1 - gy0)) * (HEAT_H - 1))
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = cx + dx
        const py = cy + dy
        if (px < 0 || py < 0 || px >= HEAT_W || py >= HEAT_H) continue
        grid[py * HEAT_W + px] += dx === 0 && dy === 0 ? 1 : 0.35
      }
    }
  }
  let max = 0
  for (let i = 0; i < grid.length; i++) if (grid[i] > max) max = grid[i]
  /* warm ramp with alpha, because this now sits on top of the camera image */
  const img = hc.createImageData(HEAT_W, HEAT_H)
  for (let i = 0; i < grid.length; i++) {
    /* stretch the low end: a few cells collect most of the dwell, and without
       this the rest of the map stays below the visibility floor */
    const t = max > 0 ? Math.min(1, grid[i] / (max * 0.3)) : 0
    const v = Math.pow(t, 0.55)
    /* cool ramp: the capture is warm, so a warm heat would disappear into the
       tablecloth */
    img.data[i * 4] = 70 + 185 * v
    img.data[i * 4 + 1] = 190 - 110 * v
    img.data[i * 4 + 2] = 255 - 40 * v
    img.data[i * 4 + 3] = 255 * v
  }
  hc.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.save()
  ctx.filter = 'blur(6px)'
  ctx.globalAlpha = 0.4
  ctx.drawImage(heatCanvas, 0, 0, w, h)
  ctx.restore()

  ctx.beginPath()
  for (let i = 0; i < sx.length; i++) {
    const x = px(sx[i])
    const y = py(sy[i])
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.4
  ctx.stroke()

  const cx = px(sx[sx.length - 1])
  const cy = py(sy[sy.length - 1])
  ctx.beginPath()
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 2.4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fill()
}

/* ---------- three.js ---------- */
let buffer: ArrayBuffer | null = null
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let cloud: THREE.Points | null = null
let handPts: THREE.Points | null = null
let bones: THREE.LineSegments | null = null
let grid: THREE.GridHelper | null = null
const axisMeshes: THREE.Mesh[] = []
let raf = 0
let last = 0
let drawn = -1

let yaw = 0
let pitch = 0
let dist = 3
let pan = 0.1
let panY = -0.05
let target = new THREE.Vector3()
const drag = { active: false, x: 0, y: 0, pan: false }
const refBase = { yaw: 0, pitch: 0, dist: 3 }

function seed() {
  if (!meta.value) return
  const [cx, cy, cz] = meta.value.center
  const [fx, fy, fz] = meta.value.forward
  const r = Math.max(meta.value.radius, 0.25)

  /* the capture's own opening view, kept as the reference every candidate
     preset is expressed against */
  const v = new THREE.Vector3(fx * -r * 1.9, fy * -r * 1.9 + r * 0.45, fz * -r * 1.9)
  refBase.yaw = Math.atan2(v.x, v.z)
  refBase.pitch = Math.asin(v.y / v.length())
  refBase.dist = v.length()

  /* aim at the hands rather than at the room: the work surface is what the
     figure is about, and the wall reads as backdrop behind it */
  let hx = 0
  let hy = 0
  let hz = 0
  let n = 0
  for (const f of meta.value.frames.slice(0, 8)) {
    for (let i = 0; i < f.hands.length; i += 6) {
      hx += f.hands[i]
      hy += f.hands[i + 1]
      hz += f.hands[i + 2]
      n++
    }
  }
  if (n) target = new THREE.Vector3(hx / n, hy / n - 0.06, hz / n)
  else target = new THREE.Vector3(cx, cy - r * 0.16, cz)

  yaw = refBase.yaw + 0.44
  pitch = refBase.pitch + 0.2
  dist = 1.55
  pan = 0.06
  applyCamera()
}

function applyCamera() {
  if (!camera) return
  camera.position.set(
    target.x + dist * Math.cos(pitch) * Math.sin(yaw),
    target.y + dist * Math.sin(pitch),
    target.z + dist * Math.cos(pitch) * Math.cos(yaw),
  )
  camera.lookAt(target)
  /* a small sideways offset of the camera, which slides the subject left in
     the frame without turning the view */
  if (pan) camera.translateX(pan)
  if (panY) camera.translateY(panY)
}

function drawCloud(index: number) {
  const f = meta.value?.frames[index]
  if (!f || !buffer || !cloud || !handPts || !bones) return
  const s = meta.value!.scale
  const cp = cloud.geometry.getAttribute('position') as THREE.BufferAttribute
  const cc = cloud.geometry.getAttribute('color') as THREE.BufferAttribute
  const ints = new Int16Array(buffer, f.offset, f.count * 3)
  const cols = new Uint8Array(buffer, f.offset + f.count * 6, f.count * 3)
  const pos = cp.array as Float32Array
  const col = cc.array as Float32Array
  for (let i = 0; i < f.count * 3; i++) {
    pos[i] = ints[i] * s
    col[i] = 0.06 + 0.56 * (cols[i] / 255)
  }
  cp.needsUpdate = true
  cc.needsUpdate = true
  cloud.geometry.setDrawRange(0, f.count)

  const hp = handPts.geometry.getAttribute('position') as THREE.BufferAttribute
  const hc = handPts.geometry.getAttribute('color') as THREE.BufferAttribute
  const hands = f.hands
  for (let i = 0, p = 0; i < hands.length; i += 6, p += 3) {
    ;(hp.array as Float32Array).set(hands.slice(i, i + 3), p)
    ;(hc.array as Float32Array).set(hands.slice(i + 3, i + 6), p)
  }
  hp.needsUpdate = true
  hc.needsUpdate = true
  handPts.geometry.setDrawRange(0, hands.length / 6)

  const up = new THREE.Vector3(0, 1, 0)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  f.axes.forEach((row, i) => {
    const mesh = axisMeshes[i]
    if (!mesh) return
    a.set(row[0], row[1], row[2])
    b.set(row[3], row[4], row[5])
    const dir = b.clone().sub(a)
    const len = dir.length() * 1.8
    dir.normalize()
    mesh.position.copy(a).addScaledVector(dir, len * 0.5)
    mesh.quaternion.setFromUnitVectors(up, dir)
    mesh.scale.set(1, len, 1)
    ;(mesh.material as THREE.MeshBasicMaterial).color.setRGB(row[6], row[7], row[8])
  })

  const gp = bones!.geometry.getAttribute('position') as THREE.BufferAttribute
  const gc = bones!.geometry.getAttribute('color') as THREE.BufferAttribute
  f.bones.forEach((row, i) => {
    ;(gp.array as Float32Array).set(row.slice(0, 6), i * 6)
    ;(gc.array as Float32Array).set(row.slice(6, 9), i * 6)
  })
  gp.needsUpdate = true
  gc.needsUpdate = true
  bones.geometry.setDrawRange(0, f.bones.length * 2)
  drawn = index
}

function resize() {
  const el = canvas.value
  if (!el || !renderer || !camera) return
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(el.clientWidth, el.clientHeight, false)
  camera.aspect = el.clientWidth / Math.max(el.clientHeight, 1)
  camera.updateProjectionMatrix()
  drawGaze()
}

function seek(to: number) {
  const vids = [...rgbEls.value, eyeEl.value].filter(Boolean) as HTMLVideoElement[]
  vids.forEach((v) => {
    if (Math.abs(v.currentTime - to) > 0.25) v.currentTime = to
  })
}

function loop(now: number) {
  raf = requestAnimationFrame(loop)
  const dt = last ? Math.min(now - last, 250) : 0
  last = now
  if (playing.value) {
    t.value += (dt / 1000) * speed.value
    if (t.value >= CLIP) t.value = 0
  }
  const fps = signals.value?.fps ?? 15
  const si = Math.round(t.value * fps)
  if (si !== sigIndex.value) sigIndex.value = si
  const n = meta.value?.frames.length ?? 0
  const idx = n ? Math.min(n - 1, Math.round((t.value / CLIP) * (n - 1))) : 0
  if (idx !== drawn) drawCloud(idx)
  drawGaze()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

watch(playing, (on) => {
  const vids = [...rgbEls.value].filter(Boolean) as HTMLVideoElement[]
  vids.forEach((v) => {
    v.playbackRate = speed.value
    if (on) void v.play().catch(() => {})
    else v.pause()
  })
  if (on) seek(t.value)
})
watch(speed, (s) => {
  ;[...rgbEls.value, eyeEl.value].forEach((v) => { if (v) v.playbackRate = s })
})
watch(t, (v) => seek(v))
watch(
  layers,
  (l) => {
    if (cloud) cloud.visible = l.cloud
    if (handPts) handPts.visible = l.hands
    if (bones) bones.visible = l.bones
    axisMeshes.forEach((m) => { m.visible = l.axes })
  },
  { deep: true },
)

function onPointerDown(e: PointerEvent) {
  drag.active = true
  drag.x = e.clientX
  drag.y = e.clientY
  drag.pan = e.button !== 0 || e.shiftKey
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!drag.active || !camera) return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  drag.x = e.clientX
  drag.y = e.clientY
  if (drag.pan) {
    const k = (2 * dist * Math.tan(Math.PI / 6)) / Math.max(canvas.value?.clientHeight ?? 1, 1)
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0)
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1)
    target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k)
  } else {
    yaw -= dx * 0.006
    pitch = Math.max(-1.5, Math.min(1.5, pitch + dy * 0.006))
  }
  applyCamera()
}
function onPointerUp() { drag.active = false }
function onWheel(e: WheelEvent) {
  e.preventDefault()
  dist = Math.max(0.05, Math.min(80, dist * Math.exp(e.deltaY * 0.001)))
  applyCamera()
}

onMounted(async () => {
  const el = canvas.value
  if (!el) return
  const [m, bin, sig, g2, st] = await Promise.all([
    fetch('real/l3/cloud.json').then((r) => r.json() as Promise<CloudMeta>),
    fetch('real/l3/cloud.bin').then((r) => r.arrayBuffer()),
    fetch('real/l3/signals.json').then((r) => r.json() as Promise<Signals>),
    fetch('real/l3/gaze2d.json').then((r) => r.json() as Promise<Gaze2D>),
    fetch('real/l3/steps.json').then((r) => r.json() as Promise<Steps>),
  ])
  meta.value = m
  buffer = bin
  signals.value = sig
  gaze2d.value = g2
  {
    const xs = g2.x
    const ys = g2.y
    const lo = (a: number[]) => Math.min(...a)
    const hi = (a: number[]) => Math.max(...a)
    const mx = (hi(xs) - lo(xs)) * 0.12
    const my = (hi(ys) - lo(ys)) * 0.12
    gx0 = lo(xs) - mx
    gx1 = hi(xs) + mx
    gy0 = lo(ys) - my
    gy1 = hi(ys) + my
  }
  steps.value = st.steps
  subtasks.value = st.subtasks ?? []
  objects.value = st.objects ?? []
  task.value = st.task

  renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true })
  renderer.setClearColor(0xdfeaf3, 1)
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100)

  const maxPts = Math.max(...m.frames.map((f) => f.count))
  const cg = new THREE.BufferGeometry()
  cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3))
  cg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3))
  cloud = new THREE.Points(cg, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true }))
  cloud.frustumCulled = false
  scene.add(cloud)

  const hg = new THREE.BufferGeometry()
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 3), 3))
  hg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(256 * 3), 3))
  handPts = new THREE.Points(hg, new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true }))
  handPts.frustumCulled = false
  scene.add(handPts)

  const bg = new THREE.BufferGeometry()
  bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 6), 3))
  bg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(64 * 6), 3))
  bones = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }))
  bones.frustumCulled = false
  scene.add(bones)

  for (let i = 0; i < 9; i++) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true)
    geo.scale(0.009, 1, 0.009)
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x334155 }))
    mesh.frustumCulled = false
    scene.add(mesh)
    axisMeshes.push(mesh)
  }

  const ys: number[] = []
  const first = m.frames[0]
  const ints0 = new Int16Array(bin, first.offset, first.count * 3)
  for (let i = 1; i < first.count * 3; i += 30) ys.push(ints0[i] * m.scale)
  ys.sort((a, b) => a - b)
  const floor = ys[Math.floor(ys.length * 0.08)] ?? 0
  grid = new THREE.GridHelper(Math.max(m.radius * 2.3, 2), 28, 0x7d9cb6, 0xa8c0d4)
  grid.position.set(m.center[0], floor, m.center[2])
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.8
  scene.add(grid)

  seed()
  resize()
  drawCloud(0)

  /* dev-only handle, used to shoot candidate opening views for review */
  if (import.meta.env.DEV) {
    ;(window as unknown as Record<string, unknown>).__l3cam = (dYaw: number, dPitch: number, dScale: number, dPan = 0) => {
      yaw = refBase.yaw + dYaw
      pitch = Math.max(-1.4, Math.min(1.4, refBase.pitch + dPitch))
      dist = refBase.dist * dScale
      pan = dPan
      applyCamera()
      renderer?.render(scene!, camera!)
    }
  }
  drawGaze()
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(loop)
  ;[...rgbEls.value, eyeEl.value].forEach((v) => v && void v.play().catch(() => {}))
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  renderer?.dispose()
})
</script>

<template>
  <figure class="viewer">
    <div class="viewer__bar">
      <p class="viewer__kicker mono">Figure 04 / one recorded episode · {{ meta?.dataset ?? 'L3-003' }}</p>
      <div class="viewer__layers">
        <label v-for="(_, key) in layers" :key="key" class="viewer__check">
          <input v-model="layers[key]" type="checkbox" />
          <span>{{ { cloud: 'Point cloud', hands: 'Hands', bones: 'Bones', axes: 'Head / wrists' }[key] }}</span>
        </label>
      </div>
    </div>

    <div class="viewer__foot">
      <button class="viewer__play" type="button" @click="playing = !playing">
        {{ playing ? 'Pause' : 'Play' }}
      </button>
      <div class="viewer__speed" role="group" aria-label="Playback speed">
        <button v-for="s in [1, 2, 4]" :key="s" type="button" :aria-pressed="speed === s" @click="speed = s">{{ s }}×</button>
      </div>
      <input v-model.number="t" class="viewer__range" type="range" min="0" :max="CLIP" step="0.033" aria-label="Time" />
      <p class="viewer__read mono">frame {{ frame }} · {{ clock }}</p>
    </div>

    <div class="viewer__top">
      <div class="viewer__stage">
        <canvas
          ref="canvas"
          class="viewer__canvas"
          tabindex="0"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel="onWheel"
        />
        <p class="viewer__help mono">drag to orbit · wheel zoom</p>
      </div>

      <div class="cams">
        <figure v-for="(c, i) in RGB" :key="c.key" class="cam">
          <video
            :ref="(el) => { if (el) rgbEls[i] = el as HTMLVideoElement }"
            :src="c.src"
            muted
            playsinline
            preload="auto"
          />
          <figcaption class="mono">{{ c.label }}</figcaption>
        </figure>
      </div>

      <div class="col">
        <figure class="cell">
          <video ref="depthEl" :src="DEPTH_SRC" muted playsinline preload="auto" />
          <figcaption class="mono">Depth</figcaption>
        </figure>
        <figure class="cell cell--gaze">
          <video ref="eyeEl" :src="EYE_SRC" muted playsinline preload="auto" />
          <canvas ref="gazeCanvas" class="gaze__overlay" aria-hidden="true" />
          <figcaption class="mono">Scene · gaze</figcaption>
        </figure>
      </div>
    </div>

    <div class="bands">
      <section v-for="band in bands" :key="band.key" class="band">
        <header class="band__head">
          <span class="band__title mono">{{ band.title }}</span>
          <span class="band__legend mono">
            <span v-for="l in band.legend" :key="l.label" class="band__key">
              <i :style="{ background: l.color }" />{{ l.label }}
            </span>
          </span>
        </header>
        <div class="band__grid">
          <div v-for="row in band.rows" :key="row.label" class="band__row">
            <span class="band__label mono" :style="{ color: row.color }">{{ row.label }}</span>
            <svg
              class="band__svg"
              :style="{ height: `${band.rowH}px` }"
              :viewBox="`0 0 ${TW} ${band.rowH}`"
              preserveAspectRatio="none"
            >
              <polyline :points="row.points" fill="none" :stroke="row.color" stroke-width="1" vector-effect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
      </section>
    </div>

    <div class="anno">
      <div class="anno__row">
        <span class="anno__tag mono">task</span>
        <p class="anno__task mono">{{ task }}</p>
      </div>
      <div class="anno__row">
        <span class="anno__tag mono">subtask</span>
        <div class="anno__chips">
          <button
            v-for="(sub, i) in subtasks"
            :key="i"
            type="button"
            class="anno__chip mono"
            :class="{ 'is-on': subtask === sub }"
            @click="t = sub.start + 0.01"
          >{{ sub.title }}</button>
        </div>
      </div>
      <div class="anno__row">
        <span class="anno__tag mono">action</span>
        <div class="anno__chips">
          <template v-if="shownSub">
            <button
              v-for="(a, i) in shownSub.actions"
              :key="i"
              type="button"
              class="anno__pill mono"
              :class="{ 'is-on': step?.label === a.label }"
              @click="t = a.start + 0.01"
            >{{ a.label }}</button>
          </template>
          <span v-else class="anno__idle mono">—</span>
        </div>
      </div>
      <div class="anno__row">
        <span class="anno__tag mono">objects</span>
        <div class="anno__objs">
          <span v-for="(o, i) in objects" :key="i" class="anno__obj mono">
            <b>{{ o.name }}</b><template v-if="o.attrs"> · {{ o.attrs }}</template><template v-if="o.where"> · <i>{{ o.where }}</i></template>
          </span>
        </div>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.viewer { margin: 0; }

.viewer__bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.6rem;
}
.viewer__kicker {
  margin: 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.viewer__layers { display: flex; gap: 0.85rem; }
.viewer__check { display: inline-flex; align-items: center; gap: 0.3rem; font-size: var(--fs-tick); color: var(--ink-soft); cursor: pointer; }
.viewer__check input { accent-color: var(--c-blue); }

.viewer__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.32fr) minmax(0, 1fr);
  gap: 0.55rem;
}
.viewer__grid2 {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.32fr);
  gap: 0.55rem;
  margin-top: 0.55rem;
}
@media (max-width: 900px) {
  .viewer__grid, .viewer__grid2 { grid-template-columns: minmax(0, 1fr); }
}

.viewer__stage {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-radius: 10px;
  background: #dfeaf3;
  overflow: hidden;
}
.viewer__canvas { display: block; width: 100%; height: 100%; touch-action: none; outline: none; }
.viewer__help {
  position: absolute;
  left: 0.8rem;
  bottom: 0.6rem;
  margin: 0;
  font-size: var(--fs-tick);
  color: rgba(22, 25, 29, 0.4);
  pointer-events: none;
}

.cams { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
.cam {
  margin: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  border-radius: 9px;
  overflow: hidden;
  background: #0c1018;
  min-width: 0;
}
.cam video { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
.cam figcaption {
  padding: 0.25rem 0.45rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gaze {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 0.35rem;
  height: 330px;
  border-radius: 10px;
  background: #f6f9fb;
  padding: 0.5rem;
}
.gaze__eye { position: relative; border-radius: 7px; overflow: hidden; background: #0c1018; min-height: 0; }
.gaze__eye video { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
/* the trajectory is drawn on the scene camera itself, in its own pixels */
.gaze__overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.gaze__tag {
  position: absolute;
  left: 0.4rem;
  bottom: 0.35rem;
  font-size: var(--fs-tick);
  color: rgba(255, 255, 255, 0.7);
}
.gaze__keys { display: flex; justify-content: space-between; font-size: var(--fs-tick); color: var(--ink-mute); }
.gaze__heat { color: var(--c-blue); }

.side { display: grid; grid-template-rows: auto 1fr; gap: 0.55rem; min-width: 0; min-height: 0; }
.cam--depth video { aspect-ratio: 16 / 9; height: auto; min-height: 0; }

.signals {
  margin-top: 0.5rem;
  border-radius: 10px;
  background: #f6f9fb;
  padding: 0.5rem 0.6rem 0.55rem;
}
.signals__banks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.7rem; align-content: start; }
.signals__note { margin: 0.5rem 0 0; font-size: var(--fs-tick); color: var(--ink-mute); }
@media (max-width: 900px) { .signals__banks { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.bank__title--gap { margin-top: 0.55rem; }
.bank__title {
  margin: 0 0 0.15rem;
  font-size: var(--fs-tick);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.sig { display: grid; grid-template-columns: 3rem minmax(0, 1fr); align-items: center; gap: 0.35rem; min-width: 0; }
.sig__label { font-size: 10px; color: var(--ink-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sig__svg { width: 100%; min-width: 0; height: 16px; display: block; }
.sig__svg--gaze { height: 26px; border-bottom: 1px solid #eef1f3; }

.anno { margin-top: 0.6rem; display: grid; gap: 0.3rem; }
.anno__row { display: grid; grid-template-columns: 4.6rem minmax(0, 1fr); align-items: center; gap: 0.6rem; }
.anno__tag { font-size: var(--fs-tick); text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-mute); }
.anno__task { margin: 0; font-size: var(--fs-tick); color: var(--ink-soft); }
.anno__idle { font-size: var(--fs-tick); color: var(--ink-mute); }
.anno__objs { display: flex; flex-wrap: wrap; gap: 0.25rem 1.1rem; }
.anno__obj { font-size: var(--fs-tick); color: var(--ink-mute); }
.anno__obj b { font-weight: 600; color: var(--ink-soft); }
.anno__obj i { font-style: normal; color: var(--ink-mute); opacity: 0.85; }
.anno__pill {
  border: 1px solid transparent;
  border-radius: 5px;
  background: none;
  padding: 0.05rem 0.4rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  cursor: pointer;
}
.anno__pill.is-on { color: var(--ink); background: var(--t-blue); border-color: var(--c-blue); }
.anno__chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.anno__chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: none;
  padding: 0.12rem 0.5rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  cursor: pointer;
}
.anno__chip:hover { color: var(--ink); border-color: var(--line-strong); }
.anno__chip.is-on { color: var(--c-blue); border-color: var(--c-blue); background: var(--t-blue); }
.anno__line { margin: 0.45rem 0 0; font-size: var(--fs-tick); color: var(--ink-soft); }

.viewer__foot { display: flex; align-items: center; gap: 0.7rem; padding: 0 0 0.6rem; }
.viewer__play {
  border: 0;
  border-bottom: 1px solid var(--line-strong);
  background: none;
  padding: 0 0 0.1rem;
  font: inherit;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  cursor: pointer;
}
.viewer__play:hover { color: var(--ink); }
.viewer__speed { display: flex; gap: 0.25rem; }
.viewer__speed button {
  border: 1px solid var(--line);
  background: none;
  border-radius: 5px;
  padding: 0.08rem 0.32rem;
  font: inherit;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  cursor: pointer;
}
.viewer__speed button[aria-pressed='true'] { color: var(--c-blue); border-color: var(--c-blue); }
.viewer__range { flex: 1; accent-color: var(--c-blue); }
.viewer__read {
  margin: 0;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  font-variant-numeric: tabular-nums;
  min-width: 17ch;
  text-align: right;
}

/* ---- row of its own: cloud beside a right rail of depth and gaze ---- */
.viewer__top {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1.55fr) minmax(0, 0.95fr);
  gap: 0.4rem;
  height: 330px;
  align-items: stretch;
  align-items: stretch;
}
@media (max-width: 1100px) { .viewer__top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); height: auto; } }
@media (max-width: 760px) { .viewer__top { grid-template-columns: minmax(0, 1fr); } }

.rail { display: grid; grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 0.45rem; min-width: 0; min-height: 0; }
.rail__cell {
  position: relative;
  margin: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  border-radius: 9px;
  overflow: hidden;
  background: #0c1018;
  min-width: 0;
}
.rail__cell video { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
.rail__cell figcaption {
  padding: 0.2rem 0.4rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rail__cell--gaze { grid-template-rows: minmax(0, 1fr) auto; background: #0c1018; min-height: 0; }
.rail__cell--gaze figcaption {
  padding: 0.2rem 0.4rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rail__cell--gaze video { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
.rail__cell--gaze .gaze__overlay {
  position: absolute;
  inset: 0 0 1.55rem 0;
  width: 100%;
  height: auto;
  pointer-events: none;
}

.cams { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 0.4rem; min-width: 0; min-height: 0; }
@media (max-width: 760px) { .cams { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

/* ---- three modality bands, white graph paper, no grey frame ---- */
.bands { display: grid; gap: 0.5rem; margin-top: 0.5rem; }
.band { background: transparent; padding: 0.35rem 0 0.15rem; }
.band__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0.15rem 0.25rem;
}
.band__title {
  font-size: var(--fs-tick);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.band__legend { display: flex; gap: 0.7rem; font-size: var(--fs-tick); color: var(--ink-mute); }
.band__key { display: inline-flex; align-items: center; gap: 0.25rem; }
.band__key i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }

.band__grid {
  background-image:
    repeating-linear-gradient(90deg, #eef1f3 0 1px, transparent 1px 56px),
    repeating-linear-gradient(0deg, #eef1f3 0 1px, transparent 1px 5px);
}
.band__row { display: grid; grid-template-columns: 2.1rem minmax(0, 1fr); align-items: center; gap: 0.3rem; }
.band__label { font-size: 8px; text-align: right; opacity: 0.8; }
.band__svg { width: 100%; min-width: 0; display: block; }

/* the camera that sits under the trajectory, inside the same cell */
.rail__cam { position: relative; background: #0c1018; overflow: hidden; min-height: 0; }
.rail__cam video { width: 100%; height: 100%; object-fit: cover; display: block; }
.rail__cam span {
  position: absolute;
  left: 0.4rem;
  top: 0.3rem;
  font-size: var(--fs-tick);
  color: rgba(255, 255, 255, 0.85);
  background: rgba(12, 16, 24, 0.45);
  padding: 0 0.25rem;
  border-radius: 3px;
}

/* the depth and scene cells sit in the same row and stretch to its height */
.cell {
  position: relative;
  margin: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  overflow: hidden;
  border-radius: 9px;
  background: #0c1018;
  min-width: 0;
}
.cell video { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
.cell figcaption {
  padding: 0.2rem 0.4rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell--gaze .gaze__overlay { position: absolute; inset: 0 0 1.5rem 0; width: 100%; height: auto; pointer-events: none; }

/* depth over scene, in the last column of the same row */
.col { display: grid; grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 0.4rem; min-width: 0; min-height: 0; }
.cell {
  position: relative;
  margin: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  border-radius: 9px;
  background: #0c1018;
  min-width: 0;
  min-height: 0;
}
.cell video { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
.cell figcaption {
  padding: 0.18rem 0.4rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell--gaze .gaze__overlay { position: absolute; inset: 0 0 1.45rem 0; width: 100%; height: auto; pointer-events: none; }
</style>
