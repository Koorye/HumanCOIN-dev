<script setup lang="ts">
/**
 * One recorded L3 episode, read four ways at once.
 *
 * The clock is one number: seconds into the clip. It drives the point cloud
 * (ten frames a second, taken straight from the capture), the rectified RGB and
 * depth videos, the gaze/EMG/EEG traces and the annotation strip, so every panel
 * shows the same instant rather than its own idea of one.
 *
 * The cloud geometry is the recorded one — int16 millimetres plus an RGB byte
 * per point from the exporter — not a re-derivation from the depth video.
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
  gaze: number[]
  eeg: number[]
  eeg2: number[]
  emgL: number[]
  emgR: number[]
}
interface Step {
  start: number
  end: number
  label: string
  object: string
}
interface Steps {
  scene: string
  task: string
  steps: Step[]
}

const CLIP = 30
const RGB_SRC = 'real/l3/rgb.mp4'
const DEPTH_SRC = 'real/l3/depth.mp4'

const canvas = ref<HTMLCanvasElement | null>(null)
const rgbEl = ref<HTMLVideoElement | null>(null)
const depthEl = ref<HTMLVideoElement | null>(null)
const meta = ref<CloudMeta | null>(null)
const signals = ref<Signals | null>(null)
const steps = ref<Step[]>([])
const task = ref('')

const t = ref(0)
const playing = ref(true)
const speed = ref(1)
const layers = ref({ cloud: true, hands: true, bones: true, axes: true })

const frame = computed(() => Math.round(200 + t.value * 30))
const clock = computed(() => `${t.value.toFixed(2)} s`)
const step = computed(() => steps.value.find((s) => t.value >= s.start && t.value < s.end) ?? null)

/* ---------- traces ---------- */
const W = 900
const TRACE_H = 30
const TRACES = [
  { key: 'gaze' as const, label: 'Gaze X', color: '#6f5aa0' },
  { key: 'emgL' as const, label: 'EMG left', color: '#a8623c' },
  { key: 'emgR' as const, label: 'EMG right', color: '#a8623c' },
  { key: 'eeg' as const, label: 'EEG · FP1', color: '#33796f' },
]

function polyline(values: number[] | undefined): string {
  if (!values?.length) return ''
  const n = values.length
  return values.map((v, i) => `${((i / (n - 1)) * W).toFixed(1)},${((1 - v) * TRACE_H).toFixed(1)}`).join(' ')
}

const traces = computed(() =>
  TRACES.map((tr) => ({ ...tr, points: polyline(signals.value?.[tr.key]) })),
)
const playhead = computed(() => Math.min(1, t.value / CLIP))

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
let target = new THREE.Vector3()
const drag = { active: false, x: 0, y: 0, pan: false }

function seed() {
  if (!meta.value) return
  const [cx, cy, cz] = meta.value.center
  const [fx, fy, fz] = meta.value.forward
  const r = Math.max(meta.value.radius, 0.25)
  /* aim a touch below the geometric centre: the wall is the tall half of the
     cloud, the work surface is what the figure is about */
  target = new THREE.Vector3(cx, cy - r * 0.16, cz)
  const v = new THREE.Vector3(fx * -r * 1.9, fy * -r * 1.9 + r * 0.45, fz * -r * 1.9).multiplyScalar(0.58)
  dist = v.length()
  /* Start off the capture's own forward axis, swung a little to the left, so
     the table reads in three dimensions before anyone touches the canvas. */
  pitch = Math.asin(v.y / dist) + 0.02
  yaw = Math.atan2(v.x, v.z) + 0.34
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
    /* compress the capture's colours into the upper-mid tones: the wall is
       bright enough that it would vanish on a pale ground */
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

  /* the three pose frames (head, left wrist, right wrist): fat cylinders rather
     than GL lines, because line width is capped at one pixel almost everywhere */
  const up = new THREE.Vector3(0, 1, 0)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  f.axes.forEach((row, i) => {
    const mesh = axisMeshes[i]
    if (!mesh) return
    a.set(row[0], row[1], row[2])
    b.set(row[3], row[4], row[5])
    const dir = b.clone().sub(a)
    /* the capture ships short triads; stretch them so the three pose frames
       read at page size */
    const len = dir.length() * 2.6
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
  const w = el.clientWidth
  const h = el.clientHeight
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(w, h, false)
  camera.aspect = w / Math.max(h, 1)
  camera.updateProjectionMatrix()
}

function seek(to: number) {
  if (Math.abs((rgbEl.value?.currentTime ?? 0) - to) > 0.25) {
    if (rgbEl.value) rgbEl.value.currentTime = to
    if (depthEl.value) depthEl.value.currentTime = to
  }
}

function loop(now: number) {
  raf = requestAnimationFrame(loop)
  const dt = last ? Math.min(now - last, 250) : 0
  last = now
  if (playing.value) {
    t.value += (dt / 1000) * speed.value
    if (t.value >= CLIP) t.value = 0
  }
  const idx = meta.value ? Math.min(meta.value.frames.length - 1, Math.round(t.value * 10)) : 0
  if (idx !== drawn) drawCloud(idx)
  if (renderer && scene && camera) renderer.render(scene, camera)
}

watch(playing, (on) => {
  const vids = [rgbEl.value, depthEl.value].filter(Boolean) as HTMLVideoElement[]
  vids.forEach((v) => {
    v.playbackRate = speed.value
    if (on) void v.play().catch(() => {})
    else v.pause()
  })
  if (on) seek(t.value)
})
watch(speed, (s) => {
  ;[rgbEl.value, depthEl.value].forEach((v) => { if (v) v.playbackRate = s })
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
  const [m, bin, sig, st] = await Promise.all([
    fetch('real/l3/cloud.json').then((r) => r.json() as Promise<CloudMeta>),
    fetch('real/l3/cloud.bin').then((r) => r.arrayBuffer()),
    fetch('real/l3/signals.json').then((r) => r.json() as Promise<Signals>),
    fetch('real/l3/steps.json').then((r) => r.json() as Promise<Steps>),
  ])
  meta.value = m
  buffer = bin
  signals.value = sig
  steps.value = st.steps
  task.value = st.task

  renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true })
  renderer.setClearColor(0xdfeaf3, 1)
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100)

  const maxPts = Math.max(...m.frames.map((f) => f.count))
  const cg = new THREE.BufferGeometry()
  cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3))
  cg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3))
  cloud = new THREE.Points(cg, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, vertexColors: true }))
  cloud.frustumCulled = false
  scene.add(cloud)

  const hg = new THREE.BufferGeometry()
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 3), 3))
  hg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(256 * 3), 3))
  handPts = new THREE.Points(hg, new THREE.PointsMaterial({ size: 8, sizeAttenuation: false, vertexColors: true }))
  handPts.frustumCulled = false
  scene.add(handPts)

  const bg = new THREE.BufferGeometry()
  bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 6), 3))
  bg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(64 * 6), 3))
  bones = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }))
  bones.frustumCulled = false
  scene.add(bones)

  /* nine fat segments: three axes on each of the three pose frames */
  const segGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true)
  for (let i = 0; i < 9; i++) {
    const mesh = new THREE.Mesh(segGeo, new THREE.MeshBasicMaterial({ color: 0x334155 }))
    mesh.frustumCulled = false
    mesh.scale.setScalar(1)
    // radius is baked into the geometry, length comes from the per-frame scale
    mesh.geometry = segGeo.clone()
    mesh.geometry.scale(0.022, 1, 0.022)
    scene.add(mesh)
    axisMeshes.push(mesh)
  }

  /* a ground plane under the cloud, so the figure reads in space rather than
     floating in a void */
  const ys: number[] = []
  const first = m.frames[0]
  const ints0 = new Int16Array(bin, first.offset, first.count * 3)
  for (let i = 1; i < first.count * 3; i += 30) ys.push(ints0[i] * m.scale)
  ys.sort((a, b) => a - b)
  const floor = ys[Math.floor(ys.length * 0.08)] ?? 0
  const span = Math.max(m.radius * 2.3, 2)
  grid = new THREE.GridHelper(span, 28, 0x7d9cb6, 0xa8c0d4)
  grid.position.set(m.center[0], floor, m.center[2])
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.8
  scene.add(grid)

  seed()
  resize()
  drawCloud(0)
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(loop)
  ;[rgbEl.value, depthEl.value].forEach((v) => v && void v.play().catch(() => {}))
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

      <div class="viewer__cams">
        <figure class="cam">
          <video ref="rgbEl" :src="RGB_SRC" muted playsinline preload="auto" />
          <figcaption class="mono">RGB · headband left (rectified)</figcaption>
        </figure>
        <figure class="cam">
          <video ref="depthEl" :src="DEPTH_SRC" muted playsinline preload="auto" />
          <figcaption class="mono">Depth · headband left (rectified)</figcaption>
        </figure>
      </div>
    </div>

    <div class="traces" aria-hidden="true">
      <div v-for="tr in traces" :key="tr.key" class="trace">
        <span class="trace__label mono">{{ tr.label }}</span>
        <svg class="trace__svg" :viewBox="`0 0 ${W} ${TRACE_H}`" preserveAspectRatio="none">
          <polyline :points="tr.points" fill="none" :stroke="tr.color" stroke-width="1" vector-effect="non-scaling-stroke" />
          <line
            :x1="playhead * W"
            :x2="playhead * W"
            y1="0"
            :y2="TRACE_H"
            stroke="#16191d"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
            opacity="0.35"
          />
        </svg>
      </div>
    </div>

    <p class="anno mono">
      <span class="anno__dot" />
      <template v-if="step">{{ step.label }} · {{ step.object }} — {{ step.start.toFixed(1) }}–{{ step.end.toFixed(1) }} s</template>
      <template v-else>{{ task }}</template>
    </p>

    <div class="viewer__foot">
      <button class="viewer__play" type="button" @click="playing = !playing">
        {{ playing ? 'Pause' : 'Play' }}
      </button>
      <div class="viewer__speed" role="group" aria-label="Playback speed">
        <button
          v-for="s in [1, 2, 4]"
          :key="s"
          type="button"
          :aria-pressed="speed === s"
          @click="speed = s"
        >{{ s }}×</button>
      </div>
      <input v-model.number="t" class="viewer__range" type="range" min="0" :max="CLIP" step="0.033" aria-label="Time" />
      <p class="viewer__read mono">frame {{ frame }} · {{ clock }}</p>
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
.viewer__layers { display: flex; gap: 0.9rem; }
.viewer__check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  cursor: pointer;
}
.viewer__check input { accent-color: var(--c-blue); }

.viewer__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 0.6rem;
}
@media (max-width: 900px) {
  .viewer__grid { grid-template-columns: minmax(0, 1fr); }
}

.viewer__stage {
  position: relative;
  border: 1px solid #e4e7ea;
  border-radius: 10px;
  background: #dfeaf3;
  overflow: hidden;
}
.viewer__canvas { display: block; width: 100%; aspect-ratio: 16 / 10; touch-action: none; outline: none; }
.viewer__help {
  position: absolute;
  left: 0.85rem;
  bottom: 0.7rem;
  margin: 0;
  font-size: var(--fs-tick);
  color: rgba(22, 25, 29, 0.4);
  pointer-events: none;
}

.viewer__cams { display: grid; grid-template-rows: 1fr 1fr; gap: 0.6rem; }
.cam {
  margin: 0;
  display: grid;
  grid-template-rows: 1fr auto;
  border: 1px solid #e4e7ea;
  border-radius: 10px;
  overflow: hidden;
  background: #0c1018;
}
.cam video { width: 100%; height: 100%; object-fit: cover; display: block; }
.cam figcaption {
  padding: 0.35rem 0.55rem;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  background: #fff;
  border-top: 1px solid #e4e7ea;
}

.traces { margin-top: 0.6rem; display: grid; gap: 0.15rem; }
.trace { display: grid; grid-template-columns: 6.5rem minmax(0, 1fr); align-items: center; gap: 0.6rem; }
.trace__label { font-size: var(--fs-tick); color: var(--ink-mute); }
.trace__svg { width: 100%; height: 30px; display: block; border-bottom: 1px solid #eef1f3; }

.anno {
  margin: 0.7rem 0 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  letter-spacing: 0.02em;
}
.anno__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c-blue); flex: none; }

.viewer__foot { display: flex; align-items: center; gap: 0.8rem; padding-top: 0.7rem; }
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
.viewer__speed { display: flex; gap: 0.3rem; }
.viewer__speed button {
  border: 1px solid var(--line);
  background: none;
  border-radius: 5px;
  padding: 0.1rem 0.35rem;
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
