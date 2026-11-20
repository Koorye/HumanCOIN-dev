<script setup lang="ts">
/**
 * The measured point cloud of one L3 episode, frame by frame.
 *
 * The geometry comes straight from the capture: every frame is a fixed-size
 * block of int16 millimetres plus one RGB byte per point, written by the same
 * exporter that produced the offline viewer, so what is drawn here is the
 * recorded cloud rather than a re-derivation from a depth video. Hands, bone
 * segments and the head/wrist axes ride along in the same file.
 *
 * The chrome follows section 06: a hairline card, muted labels, and controls
 * set as type rather than as buttons.
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

const canvas = ref<HTMLCanvasElement | null>(null)
const meta = ref<CloudMeta | null>(null)
const index = ref(0)
const playing = ref(true)
const layers = ref({ cloud: true, hands: true, bones: true, axes: true })

const frame = computed(() => meta.value?.frames[index.value] ?? null)
const total = computed(() => meta.value?.frames.length ?? 0)
const clock = computed(() => (frame.value ? `${frame.value.time.toFixed(2)} s` : '—'))
const points = computed(() => (frame.value ? frame.value.count.toLocaleString() : '—'))

let buffer: ArrayBuffer | null = null
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let cloud: THREE.Points | null = null
let handPts: THREE.Points | null = null
let bones: THREE.LineSegments | null = null
let axes: THREE.LineSegments | null = null
let raf = 0
let last = 0
let acc = 0

/* orbit state, seeded from the capture's own first view */
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
  target = new THREE.Vector3(cx, cy, cz)
  const v = new THREE.Vector3(fx * -r * 1.9, fy * -r * 1.9 + r * 0.45, fz * -r * 1.9).multiplyScalar(0.8)
  dist = v.length() * 0.78
  pitch = Math.asin(v.y / dist)
  yaw = Math.atan2(v.x, v.z)
  applyCamera()
}

function applyCamera() {
  if (!camera) return
  const offset = new THREE.Vector3(
    dist * Math.cos(pitch) * Math.sin(yaw),
    dist * Math.sin(pitch),
    dist * Math.cos(pitch) * Math.cos(yaw),
  )
  camera.position.copy(target).add(offset)
  camera.lookAt(target)
}

function drawFrame() {
  const f = frame.value
  if (!f || !buffer || !cloud || !handPts || !bones || !axes) return
  const s = meta.value!.scale

  const cp = cloud.geometry.getAttribute('position') as THREE.BufferAttribute
  const cc = cloud.geometry.getAttribute('color') as THREE.BufferAttribute
  const ints = new Int16Array(buffer, f.offset, f.count * 3)
  const cols = new Uint8Array(buffer, f.offset + f.count * 6, f.count * 3)
  const pos = cp.array as Float32Array
  const col = cc.array as Float32Array
  for (let i = 0; i < f.count * 3; i++) {
    pos[i] = ints[i] * s
    col[i] = cols[i] / 255
  }
  cp.needsUpdate = true
  cc.needsUpdate = true
  cloud.geometry.setDrawRange(0, f.count)

  const hp = handPts.geometry.getAttribute('position') as THREE.BufferAttribute
  const hc = handPts.geometry.getAttribute('color') as THREE.BufferAttribute
  const hands = f.hands
  for (let i = 0, p = 0, c = 0; i < hands.length; i += 6, p += 3, c += 3) {
    ;(hp.array as Float32Array)[p] = hands[i]
    ;(hp.array as Float32Array)[p + 1] = hands[i + 1]
    ;(hp.array as Float32Array)[p + 2] = hands[i + 2]
    ;(hc.array as Float32Array)[c] = hands[i + 3]
    ;(hc.array as Float32Array)[c + 1] = hands[i + 4]
    ;(hc.array as Float32Array)[c + 2] = hands[i + 5]
  }
  hp.needsUpdate = true
  hc.needsUpdate = true
  handPts.geometry.setDrawRange(0, hands.length / 6)

  const fill = (seg: THREE.LineSegments, rows: number[][]) => {
    const gp = seg.geometry.getAttribute('position') as THREE.BufferAttribute
    const gc = seg.geometry.getAttribute('color') as THREE.BufferAttribute
    rows.forEach((row, i) => {
      ;(gp.array as Float32Array).set(row.slice(0, 6), i * 6)
      ;(gc.array as Float32Array).set(row.slice(6, 9), i * 6)
    })
    gp.needsUpdate = true
    gc.needsUpdate = true
    seg.geometry.setDrawRange(0, rows.length * 2)
  }
  fill(bones, f.bones)
  fill(axes, f.axes)
}

function makeLine(max: number, width = 1) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 6), 3))
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(max * 6), 3))
  const m = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: width, transparent: true, opacity: 0.9 })
  const seg = new THREE.LineSegments(g, m)
  seg.frustumCulled = false
  scene!.add(seg)
  return seg
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

function tick(now: number) {
  raf = requestAnimationFrame(tick)
  const dt = last ? Math.min(now - last, 250) : 0
  last = now
  if (playing.value && total.value > 1) {
    acc += dt
    const period = 1000 / (meta.value?.fps ?? 30)
    while (acc >= period) {
      acc -= period
      index.value = (index.value + 1) % total.value
    }
  }
  renderer?.render(scene!, camera!)
}

function togglePlay() {
  playing.value = !playing.value
  acc = 0
}

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
function onPointerUp() {
  drag.active = false
}
function onWheel(e: WheelEvent) {
  e.preventDefault()
  dist = Math.max(0.05, Math.min(80, dist * Math.exp(e.deltaY * 0.001)))
  applyCamera()
}

watch(index, drawFrame)
watch(layers, (l) => {
  if (cloud) cloud.visible = l.cloud
  if (handPts) handPts.visible = l.hands
  if (bones) bones.visible = l.bones
  if (axes) axes.visible = l.axes
}, { deep: true })

onMounted(async () => {
  const el = canvas.value
  if (!el) return
  const [m, bin] = await Promise.all([
    fetch('real/l3/cloud.json').then((r) => r.json() as Promise<CloudMeta>),
    fetch('real/l3/cloud.bin').then((r) => r.arrayBuffer()),
  ])
  meta.value = m
  buffer = bin

  renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true })
  renderer.setClearColor(0x0c1018, 1)
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100)

  const maxPts = Math.max(...m.frames.map((f) => f.count))
  const cg = new THREE.BufferGeometry()
  cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3))
  cg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3))
  cloud = new THREE.Points(cg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true }))
  cloud.frustumCulled = false
  scene.add(cloud)

  const hg = new THREE.BufferGeometry()
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 3), 3))
  hg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(256 * 3), 3))
  handPts = new THREE.Points(hg, new THREE.PointsMaterial({ size: 4.5, sizeAttenuation: false, vertexColors: true }))
  handPts.frustumCulled = false
  scene.add(handPts)

  bones = makeLine(64)
  axes = makeLine(16)

  seed()
  resize()
  drawFrame()
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  renderer?.dispose()
  cloud?.geometry.dispose()
  handPts?.geometry.dispose()
})
</script>

<template>
  <figure class="l3">
    <div class="l3__bar">
      <p class="l3__kicker mono">Figure 04 / Recorded point cloud · {{ meta?.dataset ?? '—' }}</p>
      <div class="l3__layers">
        <label v-for="(_, key) in layers" :key="key" class="l3__check">
          <input v-model="layers[key]" type="checkbox" />
          <span>{{ { cloud: 'Point cloud', hands: 'Hands', bones: 'Bones', axes: 'Head / wrist' }[key] }}</span>
        </label>
      </div>
    </div>

    <div class="l3__stage">
      <canvas
        ref="canvas"
        class="l3__canvas"
        tabindex="0"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel="onWheel"
      />
      <p class="l3__help mono">drag to orbit · wheel to zoom · shift-drag to pan</p>
    </div>

    <div class="l3__foot">
      <button class="l3__toggle" type="button" @click="togglePlay">
        {{ playing ? 'Pause' : 'Play' }}
      </button>
      <input
        v-model.number="index"
        class="l3__range"
        type="range"
        min="0"
        :max="Math.max(total - 1, 0)"
        step="1"
        aria-label="Frame"
      />
      <p class="l3__read mono">
        frame {{ frame?.frame ?? '—' }} · {{ clock }} · {{ points }} pts
      </p>
    </div>
  </figure>
</template>

<style scoped>
.mono { font-family: var(--ff-mono); }
.l3 { margin: 0; }

.l3__bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.6rem;
}
.l3__kicker {
  margin: 0;
  font-size: var(--fs-tick);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.l3__layers { display: flex; gap: 0.9rem; }
.l3__check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  cursor: pointer;
}
.l3__check input { accent-color: var(--c-blue); }

.l3__stage {
  position: relative;
  border: 1px solid #e4e7ea;
  border-radius: 10px;
  background: #0c1018;
  overflow: hidden;
}
.l3__canvas { display: block; width: 100%; aspect-ratio: 16 / 9; touch-action: none; outline: none; }
.l3__help {
  position: absolute;
  left: 0.85rem;
  bottom: 0.7rem;
  margin: 0;
  font-size: var(--fs-tick);
  color: rgba(231, 237, 246, 0.55);
  pointer-events: none;
}

.l3__foot {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding-top: 0.6rem;
}
.l3__toggle {
  border: 0;
  border-bottom: 1px solid var(--line-strong);
  background: none;
  padding: 0 0 0.1rem;
  font: inherit;
  font-size: var(--fs-tick);
  color: var(--ink-soft);
  cursor: pointer;
}
.l3__toggle:hover { color: var(--ink); border-color: var(--ink); }
.l3__range { flex: 1; accent-color: var(--c-blue); }
.l3__read {
  margin: 0;
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  font-variant-numeric: tabular-nums;
  min-width: 19ch;
  text-align: right;
}

@media (max-width: 700px) {
  .l3__layers { display: none; }
  .l3__help { display: none; }
}
</style>
