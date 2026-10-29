/**
 * A paired tabletop world for RQ 02.
 *
 * One canvas, two viewports, one camera. The left viewport shows the branch
 * that has vision only; the right shows the branch that also receives the
 * instrument. Both start from the same state and share the camera, so the
 * divergence visible after the event is the only difference between them.
 *
 * Every pose in here comes from `eventDemo.ts` and is authored, not measured.
 */

import * as THREE from 'three'
import {
  CONTACT_END,
  DURATION,
  EVENT,
  LOAD_CRATE,
  type EventCaseDef,
} from '@/data/eventDemo'

export interface WorldLayers {
  trail: boolean
  predict: boolean
  target: boolean
}

export interface EventWorldApi {
  update: (time: number, layers: WorldLayers) => void
  resetView: () => void
  resize: () => void
  dispose: () => void
}

const VISION_COLOR = 0x5c7285

/** Minimal orbit: yaw, pitch and distance, driven by pointer drag. */
class Orbit {
  yaw = 0.62
  pitch = 0.52
  dist = 3.05

  private drag: { x: number; y: number } | null = null

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
    })
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drag) return
      this.yaw += (e.clientX - this.drag.x) * 0.008
      this.pitch = Math.max(0.16, Math.min(1.32, this.pitch + (e.clientY - this.drag.y) * 0.005))
      this.drag = { x: e.clientX, y: e.clientY }
      this.onChange?.()
    })
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      canvas.addEventListener(name, () => { this.drag = null })
    }
  }

  onChange?: () => void

  reset() {
    this.yaw = 0.62
    this.pitch = 0.52
    this.dist = 3.05
    this.onChange?.()
  }

  place(camera: THREE.PerspectiveCamera) {
    const h = Math.cos(this.pitch)
    camera.position.set(
      Math.sin(this.yaw) * h * this.dist,
      Math.sin(this.pitch) * this.dist + 0.35,
      Math.cos(this.yaw) * h * this.dist,
    )
    camera.lookAt(0, 0.28, 0)
  }
}

/** Tabletop, lighting and the static props shared by both branches. */
function buildStage(scene: THREE.Scene, def: EventCaseDef) {
  scene.add(new THREE.HemisphereLight(0xdcefff, 0x1b2c39, 2.1))
  const key = new THREE.DirectionalLight(0xffffff, 1.7)
  key.position.set(2.4, 4.2, 2.8)
  scene.add(key)

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.06, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x33485a, roughness: 0.8 }),
  )
  board.position.y = -0.03
  scene.add(board)

  const grid = new THREE.GridHelper(6, 24, 0x44637a, 0x233b4d)
  grid.position.y = -0.06
  scene.add(grid)

  // Both props are placed against the end pose of the shared approach path, so
  // the hand actually arrives at them rather than near them.
  if (def.target.kind === 'socket') {
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.26, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x51697a, roughness: 0.7 }),
    )
    housing.position.set(CONTACT_END[0] + 0.34, CONTACT_END[1], CONTACT_END[2])
    scene.add(housing)

    // The aperture the connector is aimed at, on the face the hand approaches.
    const aperture = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0d1925, roughness: 0.5 }),
    )
    aperture.position.set(CONTACT_END[0] + 0.19, CONTACT_END[1], CONTACT_END[2])
    scene.add(aperture)
  } else {
    // Two identical crates; only the outline colour hints at which is loaded.
    for (const x of [LOAD_CRATE[0], LOAD_CRATE[0] - 0.56]) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.2, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x7d919f, roughness: 0.75 }),
      )
      crate.position.set(x, LOAD_CRATE[1], LOAD_CRATE[2])
      scene.add(crate)
    }
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.012, 8, 30),
    new THREE.MeshStandardMaterial({ color: 0xb5a1ed, roughness: 0.6 }),
  )
  ring.rotation.x = Math.PI / 2
  ring.rotation.z = Math.PI / 2
  scene.add(ring)

  return { ring }
}

interface Branch {
  color: number
  trajectory: (t: number) => [number, number, number]
  hand: THREE.Mesh
  connector: THREE.Mesh | null
  crate: THREE.Mesh | null
  history: THREE.Line
  future: THREE.Line
}

function buildBranch(
  scene: THREE.Scene,
  def: EventCaseDef,
  which: 'vision' | 'extra',
): Branch {
  const color = which === 'extra' ? (def.accent === 'violet' ? 0x8f78e0 : 0xd39a3f) : VISION_COLOR

  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.062, 18, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
  )
  scene.add(hand)

  let connector: THREE.Mesh | null = null
  if (def.target.kind === 'socket') {
    connector = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.075, 0.075),
      new THREE.MeshStandardMaterial({ color: 0x8fb6c6, roughness: 0.55 }),
    )
    scene.add(connector)
  }

  // The lifted crate is a separate body only for the load case: it tracks the
  // hand so either branch can show the height its prediction implies.
  let crate: THREE.Mesh | null = null
  if (def.target.kind === 'crate') {
    crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.2, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x9fb2be, roughness: 0.7 }),
    )
    scene.add(crate)
  }

  const line = (dashed: boolean) =>
    new THREE.Line(
      new THREE.BufferGeometry(),
      dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.05, gapSize: 0.035 })
        : new THREE.LineBasicMaterial({ color }),
    )

  const history = line(which === 'vision')
  const future = line(which === 'extra')
  history.frustumCulled = false
  future.frustumCulled = false
  scene.add(history, future)

  return { color, trajectory: def.branches[which].trajectory, hand, connector, crate, history, future }
}

function setLine(object: THREE.Line, points: THREE.Vector3[]) {
  object.geometry.dispose()
  object.geometry = new THREE.BufferGeometry().setFromPoints(points)
  object.computeLineDistances()
}

export function createEventWorld(
  canvas: HTMLCanvasElement,
  def: EventCaseDef,
  opts: { onReady?: () => void } = {},
): EventWorldApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.setScissorTest(true)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 40)
  const orbit = new Orbit(canvas)
  const stage = buildStage(scene, def)

  // Scene contents are shared; each branch contributes its own hand (and lifted
  // body), and its own pair of path lines.
  const vision = buildBranch(scene, def, 'vision')
  const extra = buildBranch(scene, def, 'extra')

  let time = EVENT
  let layers: WorldLayers = { trail: true, predict: true, target: true }
  const all = [vision, extra]

  function render() {
    const w = Math.max(1, canvas.clientWidth)
    const h = Math.max(1, canvas.clientHeight)
    renderer.setSize(w, h, false)
    const halfW = Math.floor(w / 2)

    orbit.place(camera)

    for (let i = 0; i < 2; i++) {
      const branch = i === 0 ? vision : extra
      // One branch per viewport: its own hand and its own pair of paths.
      for (const b of all) {
        const on = b === branch
        b.hand.visible = on
        if (b.connector) b.connector.visible = on
        if (b.crate) b.crate.visible = on
        b.history.visible = on && layers.trail
        b.future.visible = on && layers.predict
      }

      const x = i * halfW
      const width = i === 0 ? halfW : w - halfW
      renderer.setViewport(x, 0, width, h)
      renderer.setScissor(x, 0, width, h)
      camera.aspect = width / h
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
  }

  function place() {
    for (const b of all) {
      const p = b.trajectory(time)
      b.hand.position.set(p[0], p[1], p[2])

      // The connector is held ahead of the fingertip, along the reach axis; it
      // rolls in as the branch retracts, so the realignment is visible.
      if (b.connector) {
        b.connector.position.set(p[0] + 0.17, p[1], p[2] - 0.03)
        b.connector.rotation.z = b === extra ? Math.sin(Math.max(0, time - EVENT) * 1.6) * 0.16 : 0
      }
      // The crate rides the hand once lifted, which is what makes the two
      // predicted lift speeds comparable side by side.
      if (b.crate) b.crate.position.set(0.2, 0.1 + Math.max(0, p[1] - 0.24), -0.04)

      setLine(b.history, Array.from({ length: 40 }, (_, k) => {
        const v = b.trajectory((time * k) / 39)
        return new THREE.Vector3(v[0], v[1], v[2])
      }))
      setLine(b.future, Array.from({ length: 50 }, (_, k) => {
        const v = b.trajectory(time + ((DURATION - time) * k) / 49)
        return new THREE.Vector3(v[0], v[1], v[2])
      }))
    }

    // The event marker sits at the state both branches share at the event.
    const at = def.branches.vision.trajectory(EVENT)
    stage.ring.position.set(at[0], at[1], at[2])
    stage.ring.visible = layers.target && time >= EVENT
  }

  orbit.onChange = render
  place()
  render()
  opts.onReady?.()

  const observer = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => render())
    : null
  observer?.observe(canvas)

  return {
    update(t, next) {
      time = Math.max(0, Math.min(DURATION, t))
      layers = next
      place()
      render()
    },
    resetView() {
      orbit.reset()
    },
    resize: render,
    dispose() {
      observer?.disconnect()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh | THREE.Line
        mesh.geometry?.dispose()
        const material = mesh.material
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose()
      })
      renderer.dispose()
    },
  }
}
