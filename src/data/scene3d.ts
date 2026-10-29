import * as THREE from 'three'
import type { RecordingSample, SampleFrame } from '@/data/recordings'
import {
  FINGER_CHAINS,
  HAND_NODES,
  eulerDeg,
  handNodes,
  headCameraRotation,
  mulMatVec,
  pixelToRay,
  rayToPlane,
  type Mat3,
  type Side,
  type Vec3,
} from '@/data/handPose'

export interface SceneLayers {
  hands: boolean
  gaze: boolean
  trail: boolean
  pose: boolean
  signal: boolean
  camera: boolean
  cloud: boolean
}

/** The measured sites a side panel can point at, one per instrument. */
export type AnchorId = 'eeg' | 'emgL' | 'emgR' | 'camera' | 'gaze' | 'glove'

/**
 * An anchor's position in canvas pixels, so a side window can draw a leader
 * line to the instrument it shows. `onScreen` is false when the site is behind
 * the camera or its layer is switched off, which lets a callout stand down
 * instead of pointing off the edge.
 */
export interface SceneAnchor {
  id: AnchorId
  x: number
  y: number
  onScreen: boolean
}

export interface SceneApi {
  dispose: () => void
  update: (
    sample: RecordingSample | null,
    time: number,
    layers: SceneLayers,
    video?: HTMLVideoElement | null,
  ) => void
  resetView: () => void
  resize: () => void
  /** Where the instruments currently sit on screen. Valid after `update`. */
  anchors: () => SceneAnchor[]
  /** Called after any camera move, so a paused scene still re-renders. */
  onCamera: (fn: () => void) => void
}

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */

/**
 * The glove reports two 25-node blocks and the recording does not declare
 * which sits on which hand. The wrist trackers are named, so the pairing is an
 * assumption; everything else about the hands (node positions, rotation) comes
 * from the data.
 */
const HANDS: { start: number; wrist: Side; color: number }[] = [
  { start: 0, wrist: 'left', color: 0x1c5f8c },
  { start: 25, wrist: 'right', color: 0x9c2f52 },
]

const POSE_KEYS = ['head', 'left', 'right'] as const
type PoseKey = (typeof POSE_KEYS)[number]

const POSE_STYLE: Record<PoseKey, { color: number; radius: number }> = {
  head: { color: 0x43535f, radius: 0.016 },
  left: { color: 0x1c5f8c, radius: 0.010 },
  right: { color: 0x9c2f52, radius: 0.010 },
}

const HAND_EDGES: [number, number][] = FINGER_CHAINS.flatMap((chain) =>
  chain.slice(1).map((b, i) => [chain[i], b] as [number, number]),
)
const PALM_TRIANGLES = [
  [0, 5, 10], [0, 10, 15], [0, 15, 20],
  [5, 6, 11], [5, 11, 10],
  [10, 11, 16], [10, 16, 15],
  [15, 16, 21], [15, 21, 20],
]

const TRAIL_LEN = 70

/** Sampling grid for the RGB point cloud (kept well under the draw budget). */
const CLOUD_GX = 76
const CLOUD_GY = 48
const CLOUD_MAX = CLOUD_GX * CLOUD_GY
/** Native sensor size of the headband cameras the intrinsics were measured for. */
const CAM_W = 1920
const CAM_H = 1200
/**
 * Furthest back-projection distance kept, in metres. The lens is wide, so the
 * outermost pixels graze the table almost horizontally and land metres away;
 * those hits are pure smear along the floor and carry no surface detail. The
 * recorded working distance of the hands is 0.35–0.9 m, so the cast stops just
 * past it and the cloud keeps the shape of the surface the camera looked at.
 */
const CLOUD_RANGE = 1.2

function makeGrid(size: number): THREE.GridHelper {
  const g = new THREE.GridHelper(size, 10, 0xb9c6ce, 0xdbe3e8)
  const mat = g.material as THREE.Material
  mat.transparent = true
  mat.opacity = 0.45
  return g
}

/** Deterministic 0..1 hash, so the cloud's point culling is stable per frame. */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function createScene(
  canvas: HTMLCanvasElement,
  opts: { onReady?: (api: SceneApi) => void } = {},
): SceneApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(44, 1, 0.01, 80)

  /** Origin of the view = mean of every measured pose sample in the clip. */
  let center = new THREE.Vector3()
  let extent = 0.45
  /** Height of the work surface, taken from the lowest measured poses. */
  let planeY = 0.05

  const controls = new OrbitLite(canvas, camera)
  scene.add(new THREE.AmbientLight(0xffffff, 1.4))
  const key = new THREE.DirectionalLight(0xffffff, 1.0)
  key.position.set(3, 5, 4)
  scene.add(key)

  let grid = makeGrid(1)
  scene.add(grid)
  const axes = new THREE.AxesHelper(0.1)
  scene.add(axes)

  /* ---------------- measured pose trails ---------------- */

  const poseGroup = new THREE.Group()
  scene.add(poseGroup)
  const poseTrails = POSE_KEYS.map((k) => {
    const line = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: POSE_STYLE[k].color, transparent: true, opacity: 0.7 }),
    )
    line.frustumCulled = false
    poseGroup.add(line)
    return { key: k, line }
  })
  const poseMarkers = POSE_KEYS.map((k) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(POSE_STYLE[k].radius, 18, 14),
      new THREE.MeshBasicMaterial({ color: POSE_STYLE[k].color }),
    )
    poseGroup.add(mesh)
    return { key: k, mesh }
  })
  /** Orientation triads: the measured head/wrist rotation, drawn in place. */
  const axisGeo = new THREE.BufferGeometry()
  axisGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(6 * 3), 3),
  )
  const poseTriads = POSE_KEYS.map((k) => {
    const line = new THREE.LineSegments(
      axisGeo.clone(),
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }),
    )
    const colors = new Float32Array(6 * 3)
    // +X red, +Y green, +Z blue, drawn from the origin of each segment.
    const rgb = [[1, 0.3, 0.25], [0.25, 0.75, 0.35], [0.3, 0.5, 0.95]]
    for (let a = 0; a < 3; a++) {
      for (let c = 0; c < 3; c++) {
        colors[a * 6 + c] = rgb[a][c]
        colors[a * 6 + 3 + c] = rgb[a][c]
      }
    }
    line.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    line.frustumCulled = false
    poseGroup.add(line)
    return { key: k, line }
  })

  /* ---------------- measured hand nodes + authored topology ---------------- */

  const gloveGroup = new THREE.Group()
  scene.add(gloveGroup)

  const unitBone = new THREE.CylinderGeometry(1, 1, 1, 8)
  const unitUp = new THREE.Vector3(0, 1, 0)

  const gloves = HANDS.map((hand) => {
    const group = new THREE.Group()
    gloveGroup.add(group)
    const nodeGeom = new THREE.BufferGeometry()
    nodeGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HAND_NODES * 3), 3))
    const nodes = new THREE.Points(
      nodeGeom,
      new THREE.PointsMaterial({ color: hand.color, size: 0.008, sizeAttenuation: true }),
    )
    group.add(nodes)

    const boneMat = new THREE.MeshBasicMaterial({
      color: hand.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    })
    const bones = HAND_EDGES.map(([a, b]) => {
      const mesh = new THREE.Mesh(unitBone, boneMat)
      group.add(mesh)
      return { mesh, a, b }
    })

    const palmGeom = new THREE.BufferGeometry()
    palmGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PALM_TRIANGLES.length * 9), 3))
    const palm = new THREE.Mesh(palmGeom, boneMat)
    group.add(palm)
    return { hand, group, nodes, nodeGeom, bones, palm, palmGeom }
  })

  /* Hand-centroid trails, accumulated during playback. */
  const handTrails = HANDS.map((hand) => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3))
    const line = new THREE.Line(
      geom,
      new THREE.LineBasicMaterial({ color: hand.color, transparent: true, opacity: 0.4 }),
    )
    line.frustumCulled = false
    scene.add(line)
    return { hand, line, buffer: new Float32Array(TRAIL_LEN * 3) }
  })

  /* ---------------- RGB-derived point cloud ---------------- */

  const cloudGeom = new THREE.BufferGeometry()
  cloudGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CLOUD_MAX * 3), 3))
  cloudGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CLOUD_MAX * 3), 3))
  const cloud = new THREE.Points(
    cloudGeom,
    new THREE.PointsMaterial({
      size: 0.0075,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
    }),
  )
  cloud.frustumCulled = false
  scene.add(cloud)

  const sampler = document.createElement('canvas')
  sampler.width = CLOUD_GX
  sampler.height = CLOUD_GY
  const sampleCtx = sampler.getContext('2d', { willReadFrequently: true })

  /* ---------------- gaze, camera frustum, signal sites ---------------- */

  const estimateGroup = new THREE.Group()
  scene.add(estimateGroup)

  const dashed = (color: number, dash: number) =>
    new THREE.LineDashedMaterial({
      color,
      dashSize: dash,
      gapSize: dash * 0.6,
      transparent: true,
      opacity: 0.85,
    })

  const gazeRay = new THREE.Line(new THREE.BufferGeometry(), dashed(0xb1810f, 0.02))
  estimateGroup.add(gazeRay)
  const gazeTarget = new THREE.Mesh(
    new THREE.SphereGeometry(0.011, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xb1810f }),
  )
  estimateGroup.add(gazeTarget)

  const frustum = new THREE.LineSegments(new THREE.BufferGeometry(), dashed(0x8a5a08, 0.016))
  estimateGroup.add(frustum)

  const SIG_STYLE: Record<'eeg' | 'leftEmg' | 'rightEmg', { color: number; radius: number }> = {
    eeg: { color: 0x43535f, radius: 0.036 },
    leftEmg: { color: 0x1c5f8c, radius: 0.024 },
    rightEmg: { color: 0x9c2f52, radius: 0.024 },
  }
  const signalSites = (Object.keys(SIG_STYLE) as (keyof typeof SIG_STYLE)[]).map((id) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(SIG_STYLE[id].radius, 16, 12),
      new THREE.MeshBasicMaterial({
        color: SIG_STYLE[id].color,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
      }),
    )
    estimateGroup.add(mesh)
    return { id, mesh }
  })

  /* ---------------- state ---------------- */

  let current: RecordingSample | null = null
  let lastTime = -1
  /** Clip-wide gaze bounds, used to normalise native XY into the view plane. */
  let gazeBounds: [number, number][] = [[0, 1920], [0, 1080]]
  let lastCloudTime = -1
  /** Most recent frame grab that actually contained a decoded image. */
  let lastPixels: Uint8ClampedArray | null = null
  /** Last world positions written for each instrument, reused by `anchors()`. */
  const anchorWorld: Partial<Record<AnchorId, THREE.Vector3>> = {}
  /** Whether each layer was on at the last update, so `anchors()` can prune. */
  const anchorLive: Partial<Record<AnchorId, boolean>> = {}
  /** Listeners fired after a camera move, so a paused scene still repaints. */
  const cameraFns: (() => void)[] = []

  function posePosition(frame: SampleFrame | undefined, k: PoseKey): Vec3 | null {
    const p = frame?.poses?.[k]?.position
    if (!p || p.length !== 3 || p.some((v) => !Number.isFinite(v))) return null
    return p as Vec3
  }

  function poseEuler(frame: SampleFrame | undefined, k: PoseKey): Vec3 | null {
    const e = frame?.poses?.[k]?.euler
    if (!e || e.length !== 3 || e.some((v) => !Number.isFinite(v))) return null
    return e as Vec3
  }

  /** World (VIVE) → view coordinates, which are centred on the clip's mean pose. */
  const view = (p: Vec3) => new THREE.Vector3(p[0] - center.x, p[1] - center.y, p[2] - center.z)

  /** Rebuild the hand node cloud in world coordinates, then express it around the wrist. */
  function handLocal(
    frame: SampleFrame,
    start: number,
    side: Side,
  ): { wrist: Vec3; rel: (Vec3 | null)[] } | null {
    const wrist = posePosition(frame, side)
    const euler = poseEuler(frame, side)
    if (!wrist || !euler) return null
    const positions = frame.skeleton?.positions ?? []
    const raw: Vec3[] = []
    for (let i = 0; i < HAND_NODES; i++) {
      const p = positions[start + i]
      raw.push(p && !p.some((v) => !Number.isFinite(v)) ? (p as Vec3) : [NaN, NaN, NaN])
    }
    const placed = handNodes(side, wrist, euler, raw)
    if (!placed) return null
    return {
      wrist,
      rel: placed.map((p, i) =>
        Number.isFinite(raw[i][0]) ? ([p[0] - wrist[0], p[1] - wrist[1], p[2] - wrist[2]] as Vec3) : null,
      ),
    }
  }

  /** Recompute framing, trails, plane height and gaze bounds for a new clip. */
  function adopt(sample: RecordingSample) {
    current = sample
    const frames = sample.frames ?? []

    const positions: THREE.Vector3[] = []
    const sum = new THREE.Vector3()
    let lowestY = Infinity
    for (const frame of frames) {
      for (const k of POSE_KEYS) {
        const p = posePosition(frame, k)
        if (!p) continue
        const v = new THREE.Vector3(p[0], p[1], p[2])
        positions.push(v)
        sum.add(v)
        if (k !== 'head' && p[1] < lowestY) lowestY = p[1]
      }
    }
    if (positions.length) {
      center = sum.divideScalar(positions.length)
      extent = Math.max(0.2, ...positions.map((v) => v.distanceTo(center)))
    } else {
      center = new THREE.Vector3()
      extent = 0.45
    }
    planeY = Number.isFinite(lowestY) ? lowestY : center.y - 0.35

    const span = Math.max(0.4, extent * 2.2)
    scene.remove(grid)
    ;(grid.material as THREE.Material).dispose()
    grid.geometry.dispose()
    grid = makeGrid(span)
    grid.position.set(0, planeY - center.y, 0)
    scene.add(grid)

    axes.scale.setScalar(Math.max(0.4, extent))

    // Pose trails, split at missing samples so gaps are never bridged.
    for (const t of poseTrails) {
      const points: THREE.Vector3[] = []
      let prev: THREE.Vector3 | null = null
      for (const frame of frames) {
        const p = posePosition(frame, t.key)
        if (!p) {
          prev = null
          continue
        }
        const v = view(p)
        if (prev) points.push(prev, v)
        prev = v
      }
      t.line.geometry.dispose()
      t.line.geometry = new THREE.BufferGeometry().setFromPoints(points)
    }

    const xs: number[] = []
    const ys: number[] = []
    for (const frame of frames) {
      const xy = frame.gaze?.xy
      if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) continue
      xs.push(xy[0])
      ys.push(xy[1])
    }
    gazeBounds = xs.length && ys.length
      ? [[Math.min(...xs), Math.max(...xs)], [Math.min(...ys), Math.max(...ys)]]
      : [[0, 1920], [0, 1080]]

    controls.setHome(new THREE.Vector3(0, 0, 0), extent * 2.6)
    lastTime = -1
    lastCloudTime = -1
    seedHandTrails(frames[0])
  }

  function seedHandTrails(frame: SampleFrame | undefined) {
    if (!frame) return
    for (const t of handTrails) {
      const wrist = posePosition(frame, t.hand.wrist)
      const c = wrist ? view(wrist) : new THREE.Vector3()
      for (let i = 0; i < TRAIL_LEN; i++) {
        t.buffer[i * 3] = c.x
        t.buffer[i * 3 + 1] = c.y
        t.buffer[i * 3 + 2] = c.z
      }
    }
  }

  /** Mean absolute channel excursion at `t`; drives signal-site opacity only. */
  function signalLevel(id: 'eeg' | 'leftEmg' | 'rightEmg', time: number): number {
    const wave = current?.waveforms?.[id]
    if (!wave?.values?.length) return 0
    const i = Math.min(wave.values.length - 1, Math.max(0, Math.round(time * wave.sampleRate)))
    const row = wave.values[i]
    if (!row?.length) return 0
    let mean = 0
    for (const v of row) mean += v
    mean /= row.length
    let dev = 0
    for (const v of row) dev += Math.abs(v - mean)
    return Math.min(1, dev / row.length / 40)
  }

  /**
   * Back-project the headband RGB frame onto the work surface: every sampled
   * pixel becomes a ray through the measured head rotation, intersected with
   * the plane at `planeY`. The recording carries no depth, so the plane is the
   * only depth the cloud can honestly have — the point *distribution* over that
   * plane is what the camera actually saw.
   */
  function updateCloud(frame: SampleFrame, time: number, video: HTMLVideoElement | null) {
    const head = posePosition(frame, 'head')
    const euler = poseEuler(frame, 'head')
    // `lastPixels` must NOT gate entry here: it is only ever written further
    // down, so requiring it up front would make the first grab unreachable and
    // the cloud permanently invisible.
    if (!head || !euler || !video || !sampleCtx || video.readyState < 2) {
      if (!lastPixels) cloud.visible = false
      return
    }
    // Re-sample only when the clip time has actually moved, or when no usable
    // grab exists yet. A paused video whose target frame is not decoded yet makes
    // `drawImage` a silent no-op, so the canvas is cleared first and the result
    // checked for content: an empty grab means "no frame yet", and the last good
    // grab is reused rather than blanking the cloud. Retrying on `!lastPixels`
    // matters because a seek is asynchronous — the render that lands while the
    // decoder is still working sees readyState 1 and must be able to try again.
    if (Math.abs(time - lastCloudTime) > 0.001 || !lastPixels) {
      lastCloudTime = time
      try {
        sampleCtx.clearRect(0, 0, CLOUD_GX, CLOUD_GY)
        sampleCtx.drawImage(video, 0, 0, CLOUD_GX, CLOUD_GY)
        const probe = sampleCtx.getImageData(0, 0, CLOUD_GX, CLOUD_GY).data
        let opaque = 0
        for (let i = 3; i < probe.length; i += 4) {
          if (probe[i] !== 0) {
            opaque++
            if (opaque > 8) break
          }
        }
        if (opaque > 8) lastPixels = probe
      } catch {
        /* keep the previous grab */
      }
    }
    const px = lastPixels
    if (!px) {
      cloud.visible = false
      return
    }

    const R = headCameraRotation(euler)
    const pos = cloudGeom.getAttribute('position') as THREE.BufferAttribute
    const col = cloudGeom.getAttribute('color') as THREE.BufferAttribute
    let n = 0
    for (let gy = 0; gy < CLOUD_GY; gy++) {
      for (let gx = 0; gx < CLOUD_GX; gx++) {
        const o = (gy * CLOUD_GX + gx) * 4
        const r = px[o]
        const g = px[o + 1]
        const b = px[o + 2]
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        // Drop only genuinely unlit pixels (shadow, lens edge, the vignetted
        // rim of the fisheye). Everything above it is real surface.
        if (luma < 0.1) continue
        // Deterministic sparse mask, weighted so the near-white table contributes
        // fewer returns than the object and the hands on it. Uniform sampling of a
        // mostly-white field is what made the layer read as a flat grey wash; the
        // cloud should follow the surface's detail, not its brightness.
        if (hash2(gx, gy) > 0.62 - luma * 0.35) continue
        const u = ((gx + 0.5) / CLOUD_GX) * CAM_W
        const v = ((gy + 0.5) / CLOUD_GY) * CAM_H
        const ray = pixelToRay(u, v)
        // Rays that graze the plane land metres away and only smear the cloud,
        // so the cast is capped at the working distance.
        const hit = rayToPlane(R, ray, head, planeY, CLOUD_RANGE)
        if (!hit) continue
        const p = view(hit)
        pos.setXYZ(n, p.x, p.y, p.z)
        // Mild gamma deepens the mid-tones, so the object and the hands keep
        // their colour against the near-white table instead of washing out.
        col.setXYZ(n, (r / 255) ** 1.35, (g / 255) ** 1.35, (b / 255) ** 1.35)
        n++
      }
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    cloudGeom.setDrawRange(0, n)
    cloudGeom.computeBoundingSphere()
    cloud.visible = n > 0
  }

  function fit() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  function update(
    sample: RecordingSample | null,
    time: number,
    layers: SceneLayers,
    video: HTMLVideoElement | null = null,
  ) {
    if (sample !== current) {
      if (sample) adopt(sample)
      else current = null
    }
    const frames = current?.frames ?? []
    if (!frames.length) {
      renderer.render(scene, camera)
      return
    }

    const fps = frames.length / Math.max(0.001, frames[frames.length - 1].timestamp || 1)
    const idx = Math.min(frames.length - 1, Math.max(0, Math.round(time * fps)))
    const frame = frames[idx]
    if (!frame) return

    const jumped = lastTime < 0 || Math.abs(time - lastTime) > 0.4
    const seeking = Math.abs(time - lastTime) > 0.0015
    lastTime = time
    if (jumped) seedHandTrails(frame)
    const advance = !jumped && seeking

    /* ---- pose markers and measured orientation triads ---- */
    const triadLen = Math.max(0.05, extent * 0.22)
    for (let i = 0; i < poseMarkers.length; i++) {
      const m = poseMarkers[i]
      const triad = poseTriads[i]
      const p = posePosition(frame, m.key)
      const e = poseEuler(frame, m.key)
      m.mesh.visible = layers.pose && !!p
      triad.line.visible = layers.pose && !!p && !!e
      if (!p) continue
      m.mesh.position.copy(view(p))
      if (e && triad.line.visible) {
        const R = eulerDeg(e[0], e[1], e[2])
        const base = view(p)
        const attr = triad.line.geometry.getAttribute('position') as THREE.BufferAttribute
        for (let a = 0; a < 3; a++) {
          const d = mulMatVec(R, a === 0 ? [1, 0, 0] : a === 1 ? [0, 1, 0] : [0, 0, 1])
          attr.setXYZ(a * 2, base.x, base.y, base.z)
          attr.setXYZ(
            a * 2 + 1,
            base.x + d[0] * triadLen,
            base.y + d[1] * triadLen,
            base.z + d[2] * triadLen,
          )
        }
        attr.needsUpdate = true
        triad.line.geometry.computeBoundingSphere()
      }
    }
    for (const t of poseTrails) t.line.visible = layers.pose

    /* ---- hands: nodes placed through the tracker mount, bones, palm ---- */
    gloveGroup.visible = layers.hands
    if (layers.hands) {
      for (const g of gloves) {
        const placed = handLocal(frame, g.hand.start, g.hand.wrist)
        g.group.visible = !!placed
        if (!placed) continue
        g.group.position.copy(view(placed.wrist))
        const rel = placed.rel

        const attr = g.nodeGeom.getAttribute('position') as THREE.BufferAttribute
        let count = 0
        for (let i = 0; i < HAND_NODES; i++) {
          const p = rel[i]
          if (p) attr.setXYZ(count++, p[0], p[1], p[2])
        }
        attr.needsUpdate = true
        g.nodeGeom.setDrawRange(0, count)
        g.nodeGeom.computeBoundingSphere()

        const vec = (i: number) => {
          const p = rel[i]
          return p ? new THREE.Vector3(p[0], p[1], p[2]) : null
        }
        for (const b of g.bones) {
          const p = vec(b.a)
          const q = vec(b.b)
          const length = p && q ? p.distanceTo(q) : 0
          b.mesh.visible = length > 1e-6
          if (!b.mesh.visible || !p || !q) continue
          b.mesh.position.copy(p).add(q).multiplyScalar(0.5)
          b.mesh.quaternion.setFromUnitVectors(unitUp, q.clone().sub(p).normalize())
          const thickness = b.a === 0 ? 0.009 : 0.006
          b.mesh.scale.set(thickness, length, thickness)
        }

        const palmAttr = g.palmGeom.getAttribute('position') as THREE.BufferAttribute
        let verts = 0
        for (const tri of PALM_TRIANGLES) {
          const vs = tri.map(vec)
          if (vs.some((p) => !p)) continue
          for (const p of vs) palmAttr.setXYZ(verts++, p!.x, p!.y, p!.z)
        }
        palmAttr.needsUpdate = true
        g.palmGeom.setDrawRange(0, verts)
        g.palmGeom.computeBoundingSphere()
      }
    }

    /* ---- hand centroid trails ---- */
    if (layers.trail && layers.hands) {
      for (const t of handTrails) {
        const wrist = posePosition(frame, t.hand.wrist)
        const c = wrist ? view(wrist) : null
        if (c && advance) {
          t.buffer.copyWithin(0, 3)
          t.buffer[(TRAIL_LEN - 1) * 3] = c.x
          t.buffer[(TRAIL_LEN - 1) * 3 + 1] = c.y
          t.buffer[(TRAIL_LEN - 1) * 3 + 2] = c.z
        }
        const attr = t.line.geometry.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < TRAIL_LEN; i++) {
          attr.setXYZ(i, t.buffer[i * 3], t.buffer[i * 3 + 1], t.buffer[i * 3 + 2])
        }
        attr.needsUpdate = true
        t.line.geometry.computeBoundingSphere()
        t.line.visible = !!c
      }
    } else {
      for (const t of handTrails) t.line.visible = false
    }

    /* ---- RGB point cloud on the work surface ---- */
    if (layers.cloud) updateCloud(frame, time, video)
    else cloud.visible = false

    /* ---- gaze, frustum and signal sites all hang off the measured head pose ---- */
    const head = posePosition(frame, 'head')
    const headEuler = poseEuler(frame, 'head')
    const origin = head ? view(head) : null
    // Camera frame: the tracker's own rotation composed with the measured
    // camera mount, so +Z is where the headband actually looks. See CAM_MOUNT.
    const Rhead: Mat3 = headEuler
      ? headCameraRotation(headEuler)
      : [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const axRight = new THREE.Vector3(...mulMatVec(Rhead, [1, 0, 0]))
    const axDown = new THREE.Vector3(...mulMatVec(Rhead, [0, 1, 0]))
    const axFwd = new THREE.Vector3(...mulMatVec(Rhead, [0, 0, 1]))
    // Head "up" is the mount-free axis: it stays vertical when the head tilts,
    // which is what the EEG site offset should follow.
    const headUp = headEuler
      ? new THREE.Vector3(...mulMatVec(eulerDeg(headEuler[0], headEuler[1], headEuler[2]), [0, 1, 0])).negate()
      : new THREE.Vector3(0, 1, 0)
    const axUp = axDown.clone().negate()

    // Camera frustum: the measured view direction, at the sensor's own 16:10.
    frustum.visible = layers.camera && !!origin
    if (origin && frustum.visible) {
      const d = 0.32
      const w = 0.15
      const hgt = w / (CAM_W / CAM_H)
      const c = origin.clone().addScaledVector(axFwd, d)
      const corners = [
        c.clone().addScaledVector(axRight, -w).addScaledVector(axUp, hgt),
        c.clone().addScaledVector(axRight, w).addScaledVector(axUp, hgt),
        c.clone().addScaledVector(axRight, w).addScaledVector(axUp, -hgt),
        c.clone().addScaledVector(axRight, -w).addScaledVector(axUp, -hgt),
      ]
      const pts: THREE.Vector3[] = []
      corners.forEach((p, i) => {
        pts.push(origin, p, p, corners[(i + 1) % 4])
      })
      frustum.geometry.dispose()
      frustum.geometry = new THREE.BufferGeometry().setFromPoints(pts)
      frustum.computeLineDistances()
    }

    // Gaze: native eye-camera pixels are not calibrated to this frame, so the
    // value is normalised over the clip and cast onto the measured view axis.
    const xy = frame.gaze?.xy
    const hasGaze = !!origin && !!xy && Number.isFinite(xy[0]) && Number.isFinite(xy[1])
    gazeRay.visible = layers.gaze && hasGaze
    gazeTarget.visible = layers.gaze && hasGaze
    if (hasGaze && origin) {
      const u = (xy![0] - gazeBounds[0][0]) / (gazeBounds[0][1] - gazeBounds[0][0] || 1) - 0.5
      const v = (xy![1] - gazeBounds[1][0]) / (gazeBounds[1][1] - gazeBounds[1][0] || 1) - 0.5
      const target = origin
        .clone()
        .addScaledVector(axFwd, 0.34)
        .addScaledVector(axRight, u * 0.26)
        .addScaledVector(axUp, -v * 0.18)
      gazeTarget.position.copy(target)
      gazeTarget.scale.setScalar(1 + Math.sin(time * 6) * 0.12)
      gazeRay.geometry.dispose()
      gazeRay.geometry = new THREE.BufferGeometry().setFromPoints([origin, target])
      gazeRay.computeLineDistances()
    }

    // Signal sites: EEG at the head, one EMG site per wrist. Intensity drives
    // opacity only; the sphere is not an electrode measurement.
    for (const s of signalSites) {
      const k: PoseKey = s.id === 'eeg' ? 'head' : s.id === 'leftEmg' ? 'left' : 'right'
      const p = posePosition(frame, k)
      const level = signalLevel(s.id, time)
      s.mesh.visible = layers.signal && !!p
      const id: AnchorId = s.id === 'eeg' ? 'eeg' : s.id === 'leftEmg' ? 'emgL' : 'emgR'
      anchorLive[id] = s.mesh.visible
      if (!p) continue
      s.mesh.position.copy(view(p)).addScaledVector(headUp, s.id === 'eeg' ? 0.04 : 0.018)
      ;(s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.55 * level
      anchorWorld[id] = s.mesh.position.clone()
    }

    /* The remaining two callouts are not instrument bodies: the head camera and
       the gaze endpoint. Both are recorded from the head pose already computed
       above, so they cannot drift from what is drawn. */
    anchorLive.camera = layers.camera && !!origin
    anchorLive.gaze = gazeRay.visible
    if (origin) anchorWorld.camera = origin.clone()
    if (gazeRay.visible) anchorWorld.gaze = gazeTarget.position.clone()

    /* The glove has two hands and one callout, so the anchor is their midpoint:
       pointing at one wrist would imply the panel only covers that hand. */
    const lw = posePosition(frame, 'left')
    const rw = posePosition(frame, 'right')
    anchorLive.glove = layers.hands && !!lw && !!rw
    if (lw && rw) anchorWorld.glove = view(lw).add(view(rw)).multiplyScalar(0.5)

    renderer.render(scene, camera)
  }

  /**
   * Screen positions of the instruments, for the leader lines the side windows
   * draw. Read from the last update rather than recomputed, so a callout can
   * never point at a site the scene is not currently drawing.
   */
  function anchors(): SceneAnchor[] {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    return (Object.keys(anchorWorld) as AnchorId[]).map((id) => {
      const p = anchorWorld[id]!
      const ndc = p.clone().project(camera)
      const x = (ndc.x * 0.5 + 0.5) * w
      const y = (-ndc.y * 0.5 + 0.5) * h
      return {
        id,
        x,
        y,
        onScreen: !!anchorLive[id] && ndc.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h,
      }
    })
  }

  function resize() {
    fit()
    renderer.render(scene, camera)
  }

  function resetView() {
    fit()
    controls.setHome(new THREE.Vector3(0, 0, 0), extent * 2.6)
    controls.reset()
    renderer.render(scene, camera)
  }

  function dispose() {
    controls.dispose()
    unitBone.dispose()
    scene.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    })
    renderer.dispose()
  }

  fit()
  grid.position.set(0, -extent * 0.55, 0)
  controls.setHome(new THREE.Vector3(0, 0, 0), extent * 2.6)
  controls.reset()
  renderer.render(scene, camera)
  controls.onChange(() => {
    renderer.render(scene, camera)
    for (const fn of cameraFns) fn()
  })
  const api: SceneApi = { dispose, update, resetView, resize, anchors, onCamera: (fn) => void cameraFns.push(fn) }
  opts.onReady?.(api)
  return api
}

/** Minimal orbit control: drag to rotate, wheel to zoom, right-drag to pan. */
class OrbitLite {
  private theta = Math.PI * 0.3
  private phi = Math.PI * 0.36
  private radius = 1
  private target = new THREE.Vector3()
  private dragging = 0
  private last = { x: 0, y: 0 }
  private homeTheta = this.theta
  private homePhi = this.phi
  private homeRadius = 1
  private homeTarget = new THREE.Vector3()
  private changeFns: (() => void)[] = []

  constructor(private el: HTMLElement, private camera: THREE.PerspectiveCamera) {
    this.apply()
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    el.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  /** Notified after every camera move, so the host can repaint its callouts. */
  onChange(fn: () => void) {
    this.changeFns.push(fn)
  }

  private apply() {
    const { theta, phi, radius, target } = this
    this.camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    )
    this.camera.lookAt(target)
    this.camera.updateMatrixWorld()
    for (const fn of this.changeFns) fn()
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = e.button === 2 ? 2 : 1
    this.last = { x: e.clientX, y: e.clientY }
    this.el.setPointerCapture(e.pointerId)
  }

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return
    const dx = e.clientX - this.last.x
    const dy = e.clientY - this.last.y
    this.last = { x: e.clientX, y: e.clientY }
    if (this.dragging === 1) {
      this.theta -= dx * 0.008
      this.phi = Math.min(Math.PI * 0.88, Math.max(Math.PI * 0.08, this.phi - dy * 0.008))
    } else {
      const pan = this.radius * 0.0016
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0)
      const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1)
      this.target.addScaledVector(right, -dx * pan).addScaledVector(up, dy * pan)
    }
    this.apply()
  }

  private onUp = (e: PointerEvent) => {
    this.dragging = 0
    try {
      this.el.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const limit = this.homeRadius * 3
    this.radius = Math.min(
      limit,
      Math.max(this.homeRadius * 0.15, this.radius * (1 + Math.sign(e.deltaY) * 0.1)),
    )
    this.apply()
  }

  setHome(target: THREE.Vector3, radius: number) {
    this.homeTarget.copy(target)
    this.homeRadius = radius
  }

  reset() {
    this.theta = this.homeTheta
    this.phi = this.homePhi
    this.radius = this.homeRadius
    this.target.copy(this.homeTarget)
    this.apply()
  }

  dispose() {
    this.el.removeEventListener('pointerdown', this.onDown)
    this.el.removeEventListener('pointermove', this.onMove)
    this.el.removeEventListener('pointerup', this.onUp)
    this.el.removeEventListener('pointercancel', this.onUp)
    this.el.removeEventListener('wheel', this.onWheel)
  }
}
