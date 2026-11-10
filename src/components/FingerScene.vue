<script setup lang="ts">
/**
 * One hand as a clean 3D skeleton at the playhead.
 *
 * The 25 nodes of the block are drawn as joints, the five chains as bones, and
 * the palm as a faint face. Each hand gets its own scene and can be dragged to
 * rotate on its own — a shared scene made the far hand smaller than the near
 * one, which read as two different hands.
 *
 * Units come from the release (metres in the glove's own frame). Nothing is
 * re-scaled per frame: the group is fitted once over the clip, so the hand does
 * not pulse as it moves.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { FINGER_CHAINS } from '@/data/handPose'
import type { SampleFrame } from '@/data/recordings'

const props = defineProps<{ frames: SampleFrame[]; index: number; block: number }>()

const host = ref<HTMLDivElement | null>(null)

const START = computed(() => (props.block === 1 ? 25 : 0))
const PALM = [0, 5, 10, 15, 20]

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let root: THREE.Group | null = null
let bones: THREE.LineSegments[] = []
let joints: THREE.Mesh[] = []
let palms: THREE.Mesh[] = []
let raf = 0
let ro: ResizeObserver | null = null

let rotY = 0
let rotX = -0.25
let dragging = false
let lastX = 0
let lastY = 0

const position = (frame: SampleFrame | undefined): [number, number, number][] | null => {
  const pos = frame?.skeleton?.positions
  const start = START.value
  if (!pos || pos.length < start + 25) return null
  return Array.from({ length: 25 }, (_, i) => pos[start + i] as [number, number, number])
}

/** Centre and scale fitted once over the whole clip. */
function fit(): { center: THREE.Vector3; scale: number } {
  const box = new THREE.Box3()
  const v = new THREE.Vector3()
  for (const f of props.frames) {
    const n = position(f)
    if (!n) continue
    for (const p of n) box.expandByPoint(v.set(p[0], p[1], p[2]))
  }
  if (box.isEmpty()) return { center: new THREE.Vector3(), scale: 1 }
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3()).length() || 1
  return { center, scale: 0.8 / size }
}

let fitted = { center: new THREE.Vector3(), scale: 1 }

function build() {
  if (!host.value || renderer) return
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(host.value.clientWidth || 1, host.value.clientHeight || 1, false)
  host.value.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(26, 1, 0.01, 20)
  camera.position.set(0, 0.06, 1.2)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 1.6))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(0.6, 1, 0.8)
  scene.add(key)

  root = new THREE.Group()
  scene.add(root)

  const color = props.block === 1 ? 0x24707c : 0x1f5f96
  fitted = fit()
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 })
  const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
  for (let i = 0; i < 25; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.02 : 0.011, 12, 10), mat)
    joints.push(m)
    root.add(m)
  }
  const segs: number[][] = []
  for (const chain of FINGER_CHAINS) {
    for (let k = 0; k < chain.length - 1; k++) segs.push([chain[k], chain[k + 1]])
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs.length * 6), 3))
  const line = new THREE.LineSegments(geom, lineMat)
  bones.push(line)
  root.add(line)
  const palmGeom = new THREE.BufferGeometry()
  palmGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3 * 3), 3))
  const palmMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  const palm = new THREE.Mesh(palmGeom, palmMat)
  palms.push(palm)
  root.add(palm)

  const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer?.domElement.setPointerCapture(e.pointerId) }
  const onMove = (e: PointerEvent) => {
    if (!dragging || !root) return
    rotY += (e.clientX - lastX) * 0.008
    rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - lastY) * 0.008))
    lastX = e.clientX; lastY = e.clientY
    root.rotation.set(rotX, rotY, 0)
  }
  const onUp = (e: PointerEvent) => { dragging = false; renderer?.domElement.releasePointerCapture(e.pointerId) }
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointermove', onMove)
  renderer.domElement.addEventListener('pointerup', onUp)
  renderer.domElement.style.cursor = 'grab'

  ro = new ResizeObserver(() => {
    if (!host.value || !renderer || !camera) return
    const w = host.value.clientWidth || 1
    const h = host.value.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  ro.observe(host.value)
  apply()
}

function apply() {
  if (!root || !props.frames.length) return
  const frame = props.frames[Math.min(props.frames.length - 1, Math.max(0, props.index))]
  const { center, scale } = fitted
  const n = position(frame)
  if (!n) return
  const pts = n.map((p) => new THREE.Vector3(
    (p[0] - center.x) * scale,
    (p[1] - center.y) * scale,
    (p[2] - center.z) * scale,
  ))
  for (let i = 0; i < 25; i++) joints[i].position.copy(pts[i])
  const attr = bones[0].geometry.getAttribute('position') as THREE.BufferAttribute
  let k = 0
  for (const chain of FINGER_CHAINS) {
    for (let i = 0; i < chain.length - 1; i++) {
      const a = pts[chain[i]], c = pts[chain[i + 1]]
      attr.setXYZ(k++, a.x, a.y, a.z)
      attr.setXYZ(k++, c.x, c.y, c.z)
    }
  }
  attr.needsUpdate = true
  bones[0].geometry.computeBoundingSphere()
  const palmAttr = palms[0].geometry.getAttribute('position') as THREE.BufferAttribute
  let q = 0
  for (let t = 0; t < PALM.length - 2; t++) {
    for (const id of [PALM[0], PALM[t + 1], PALM[t + 2]]) {
      palmAttr.setXYZ(q++, pts[id].x, pts[id].y, pts[id].z)
    }
  }
  palmAttr.needsUpdate = true
  palms[0].geometry.computeBoundingSphere()
  if (root) root.rotation.set(rotX, rotY, 0)
}

onMounted(() => { build(); raf = requestAnimationFrame(loop) })
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  renderer?.dispose()
  host.value?.removeChild(renderer?.domElement as Node)
  renderer = null
})

function loop() {
  if (renderer && scene && camera) renderer.render(scene, camera)
  raf = requestAnimationFrame(loop)
}

watch(() => props.index, apply)
watch(() => props.frames, () => { fitted = fit(); apply() })
</script>

<template>
  <div ref="host" class="fs" role="img" :aria-label="'Finger kinematics'" />
</template>

<style scoped>
.fs {
  position: relative;
  width: 100%;
  min-height: 8.5rem;
  height: 100%;
  background: transparent;
}
.fs :deep(canvas) { display: block; width: 100%; height: 100%; }
.fs__hint {
  position: absolute;
  right: 0.3rem;
  top: 0.1rem;
  font-family: var(--ff-mono);
  font-size: var(--fs-tick);
  color: var(--ink-mute);
  pointer-events: none;
}
</style>
