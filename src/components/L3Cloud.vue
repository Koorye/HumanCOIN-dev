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
  { key: 'right', src: 'real/l3/rgb-right.mp4', label: 'Headband · right' },
  { key: 'scene', src: 'real/l3/eye.mp4', label: 'Scene camera' },
  { key: 'wl', src: 'real/l3/rgb-wl.mp4', label: 'Left wrist' },
  { key: 'wr', src: 'real/l3/rgb-wr.mp4', label: 'Right wrist' },
]
/* gaze is measured in the rectified headband-left frame, so that is the image
   the trajectory is drawn on */
const GAZE_SRC = 'real/l3/rgb-left.mp4'
const DEPTH_SRC = 'real/l3/depth.mp4'

const canvas = ref<HTMLCanvasElement | null>(null)
const rgbEls = ref<HTMLVideoElement[]>([])
const eyeEl = ref<HTMLVideoElement | null>(null)
const depthEl = ref<HTMLVideoElement | null>(null)
const gazeCanvas = ref<HTMLCanvasElement | null>(null)

const meta = ref<CloudMeta | null>(null)
const signals = ref<Signals | null>(null)
const gaze2d = ref<Gaze2D | null>(null)
const steps = ref<Step[]>([])
const subtasks = ref<Subtask[]>([])
const objects = ref<SceneObject[]>([])
const task = ref('')
const sigIndex = ref(0)

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

function windowed(values: number[]): string {
  const n = values.length
  const i1 = Math.min(n - 1, sigIndex.value)
  const i0 = Math.max(0, Math.round(sigIndex.value - WINDOW * (signals.value?.fps ?? 15)))
  const span = Math.max(1, i1 - i0)
  const pts: string[] = []
  for (let i = i0; i <= i1; i++) pts.push(`${(((i - i0) / span) * TW).toFixed(1)},${((1 - values[i]) * TH).toFixed(1)}`)
  return pts.join(' ')
}

const gazeTraces = computed(() => {
  const s = signals.value
  if (!s) return []
  return [
    { key: 'x', label: 'Gaze X', color: '#6f5aa0', points: windowed(s.gazeX) },
    { key: 'y', label: 'Gaze Y', color: '#6f5aa0', points: windowed(s.gazeY) },
  ]
})

const banks = computed(() => {
  const s = signals.value
  if (!s) return []
  const eegRows = s.eeg.map((v, i) => ({ label: s.eegNames[i] ?? `ch ${i + 1}`, points: windowed(v) }))
  const half = Math.ceil(eegRows.length / 2)
  return [
    { key: 'emgL', title: `EMG · left · ${s.channels.emgL} ch`, color: '#a8623c', rows: s.emgL.map((v, i) => ({ label: `${i + 1}`, points: windowed(v) })) },
    { key: 'emgR', title: `EMG · right · ${s.channels.emgR} ch`, color: '#a8623c', rows: s.emgR.map((v, i) => ({ label: `${i + 1}`, points: windowed(v) })) },
    { key: 'eegA', title: 'EEG · 1–8 of 128', color: '#33796f', rows: eegRows.slice(0, half) },
    { key: 'eegB', title: 'EEG · 9–16 of 128', color: '#33796f', rows: eegRows.slice(half) },
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

  /* the camera is painted with object-fit: cover, so the visible crop of the
     frame is smaller than the box the canvas fills; gaze has to be mapped into
     that crop or the dot sits off the thing it is looking at */
  const vid = eyeEl.value
  const vw = vid?.videoWidth || 16
  const vh = vid?.videoHeight || 9
  const scale = Math.max(w / vw, h / vh)
  const paintW = vw * scale
  const paintH = vh * scale
  const ox = (w - paintW) / 2
  const oy = (h - paintH) / 2
  const px = (nx: number) => ox + nx * paintW
  const py = (ny: number) => oy + ny * paintH

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
    const cx = Math.floor(g.x[i] * (HEAT_W - 1))
    const cy = Math.floor(g.y[i] * (HEAT_H - 1))
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
  /* additive, so the dwell reads as light on the image rather than as a wash */
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(heatCanvas, ox, oy, paintW, paintH)
  ctx.restore()

  ctx.beginPath()
  for (let i = 0; i < sx.length; i++) {
    const x = px(sx[i])
    const y = py(sy[i])
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = 'rgba(22,25,29,0.55)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  const cx = px(sx[sx.length - 1])
  const cy = py(sy[sy.length - 1])
  ctx.beginPath()
  ctx.arc(cx, cy, 4.6, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 2.6, 0, Math.PI * 2)
  ctx.fillStyle = '#16191d'
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
  pitch = refBase.pitch + 0.14
  dist = 1.3
  pan = 0.12
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
  const vids = [...rgbEls.value, eyeEl.value].filter(Boolean) as HTMLVideoElement[]
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

    <!-- transport sits above the panels it drives -->
    <div class="viewer__foot">
      <button class="viewer__play" type="button" @click="playing = !playing">
        {{ playing ? 'Pause' : 'Play' }}
      </button>
      <div class="viewer__speed" role="group" aria-label="Playback speed">
        <button v-for="s in [1, 2, 4]" :key="s" type="button" :aria-pressed="speed === s" @click="speed = s">{{ s }}×</button>
      </div>
      <input v-model.number="t" class="viewer__range" type="range" min="0" :max="CLIP" step="0.033" aria-label="Time" />
      <p class="viewer__read mono">frame {{ frame }} · {{ clock }} · window {{ WINDOW }} s</p>
    </div>

    <div class="viewer__grid">
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
    </div>

    <div class="viewer__grid2">
      <div class="gaze">
        <div class="gaze__eye">
          <video ref="eyeEl" :src="GAZE_SRC" muted playsinline preload="auto" />
          <canvas ref="gazeCanvas" class="gaze__overlay" aria-hidden="true" />
          <span class="gaze__tag mono">headband · left · gaze overlay</span>
        </div>
        <div class="gaze__keys mono">
          <span>gaze · last {{ WINDOW }} s</span>
          <span class="gaze__heat">heat = dwell</span>
        </div>
      </div>

      <figure class="cam cam--depth">
        <video ref="depthEl" :src="DEPTH_SRC" muted playsinline preload="auto" />
        <figcaption class="mono">Depth · headband left · pseudo-colour</figcaption>
      </figure>
    </div>

    <div class="signals">
      <div class="signals__banks">
        <div class="bank">
          <p class="bank__title mono">Gaze (x / y)</p>
          <div v-for="tr in gazeTraces" :key="tr.key" class="sig">
            <span class="sig__label mono">{{ tr.label }}</span>
            <svg class="sig__svg sig__svg--gaze" :viewBox="`0 0 ${TW} ${TH}`" preserveAspectRatio="none">
              <polyline :points="tr.points" fill="none" :stroke="tr.color" stroke-width="1" vector-effect="non-scaling-stroke" />
            </svg>
          </div>
          <p class="bank__title mono bank__title--gap">{{ banks[0]?.title }}</p>
          <div v-for="row in banks[0]?.rows ?? []" :key="row.label" class="sig">
            <span class="sig__label mono">{{ row.label }}</span>
            <svg class="sig__svg" :viewBox="`0 0 ${TW} ${TH}`" preserveAspectRatio="none">
              <polyline :points="row.points" fill="none" :stroke="banks[0].color" stroke-width="1" vector-effect="non-scaling-stroke" />
            </svg>
          </div>
        </div>

        <div v-for="b in banks.slice(1)" :key="b.key" class="bank">
          <p class="bank__title mono">{{ b.title }}</p>
          <div v-for="row in b.rows" :key="row.label" class="sig">
            <span class="sig__label mono">{{ row.label }}</span>
            <svg class="sig__svg" :viewBox="`0 0 ${TW} ${TH}`" preserveAspectRatio="none">
              <polyline :points="row.points" fill="none" :stroke="b.color" stroke-width="1" vector-effect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
      </div>
      <p class="signals__note mono">
        one window of {{ WINDOW }} s at the playhead · EMG 8 + 8 channels · EEG 16 of 128
      </p>
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
  border-radius: 10px;
  background: #dfeaf3;
  overflow: hidden;
}
.viewer__canvas { display: block; width: 100%; aspect-ratio: 16 / 10; touch-action: none; outline: none; }
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
.cam video { width: 100%; height: 100%; min-height: 90px; object-fit: cover; display: block; }
.cam figcaption {
  padding: 0.25rem 0.45rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: #f6f9fb;
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
</style>
