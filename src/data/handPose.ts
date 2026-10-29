/**
 * Pose and glove geometry for the L3 recordings.
 *
 * The numbers below are ported from the reference visualiser
 * (`Embodied-Brain-Dataset/scripts/web_visualizer.html`), where the
 * glove→tracker mount was verified against the recording by eye. They are the
 * only way the raw `hand_skeleton` node cloud ends up in the VIVE frame with a
 * believable hand orientation: the raw nodes sit in glove-local coordinates,
 * two 25-node roots at the origin, and nothing in the recording declares how
 * they attach to the wrist trackers.
 */

export type Vec3 = [number, number, number]

export type Mat3 = [[number, number, number], [number, number, number], [number, number, number]]

/**
 * (roll, pitch, yaw) → rotation, exactly as saved by the recorder: the pose
 * comes from OpenVR `mDeviceToAbsoluteTracking` (right-handed, y-up world) and
 * the saved euler angles are its standard ZYX decomposition,
 * `R = Rz(yaw)·Ry(pitch)·Rx(roll)` with positive angles right-handed.
 */
export function eulerDeg(roll: number, pitch: number, yaw: number): Mat3 {
  const r = (roll * Math.PI) / 180
  const p = (pitch * Math.PI) / 180
  const y = (yaw * Math.PI) / 180
  const cr = Math.cos(r), sr = Math.sin(r)
  const cp = Math.cos(p), sp = Math.sin(p)
  const cy = Math.cos(y), sy = Math.sin(y)
  const Rx: Mat3 = [[1, 0, 0], [0, cr, -sr], [0, sr, cr]]
  const Ry: Mat3 = [[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]]
  const Rz: Mat3 = [[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]]
  return matMul(matMul(Rz, Ry), Rx)
}

export function matMul(A: Mat3, B: Mat3): Mat3 {
  const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]] as unknown as Mat3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]
    }
  }
  return out
}

export function mulMatVec(R: Mat3, v: Vec3): Vec3 {
  return [
    R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
    R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
    R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2],
  ]
}

/** Node indices of the five finger chains, 0-based within one 25-node hand. */
export const FINGER_CHAINS = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
]

export const HAND_NODES = 25

/**
 * Manus-skeleton → wrist-tracker mount. Tracker convention is +z = finger,
 * +y = back of the hand; the base below maps the measured data axes onto it,
 * then the per-hand fix (left spins 180° about z, both mirror across yz) is
 * applied. det = +1 for both.
 */
const HAND_FIX: Record<Side, Mat3> = {
  left: [[1, 0, 0], [0, -1, 0], [0, 0, 1]],
  right: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
}
const HAND_C_BASE: Record<Side, Mat3> = {
  left: [[-0.2705, 0.9583, -0.0925], [0.0951, -0.069, -0.9931], [0.958, 0.2774, 0.0725]],
  right: [[-0.2723, -0.9589, -0.0796], [-0.0949, -0.0556, 0.9939], [0.9575, -0.2782, 0.0758]],
}
const HAND_C: Record<Side, Mat3> = {
  left: matMul(HAND_FIX.left, HAND_C_BASE.left),
  right: matMul(HAND_FIX.right, HAND_C_BASE.right),
}

/**
 * The tracker sits ~5 cm above the midpoint between the palm root and the
 * middle-finger MCP, so `world = R_pose·(C·local + OFFSET) + wrist` with
 * `OFFSET = (0,−0.05,0) − C·p_ref`.
 */
const HAND_OFFSET: Record<Side, Vec3> = {
  left: [0.0059, -0.0519, -0.048],
  right: [-0.0059, -0.0518, -0.048],
}

export type Side = 'left' | 'right'

/**
 * Place one 25-node glove block into the VIVE world frame, anchored on the
 * matching wrist tracker. `local` is the raw node cloud relative to its own
 * zero root; returns null when the wrist pose is missing.
 */
export function handNodes(
  side: Side,
  wrist: Vec3 | null,
  euler: Vec3 | null,
  local: Vec3[],
): Vec3[] | null {
  if (!wrist || !euler || !local.length) return null
  const Rp = eulerDeg(euler[0], euler[1], euler[2])
  const C = HAND_C[side]
  const off = HAND_OFFSET[side]
  const out: Vec3[] = []
  for (const p of local) {
    const c = mulMatVec(C, p)
    const withOffset: Vec3 = [c[0] + off[0], c[1] + off[1], c[2] + off[2]]
    const w = mulMatVec(Rp, withOffset)
    out.push([w[0] + wrist[0], w[1] + wrist[1], w[2] + wrist[2]])
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Camera model for the RGB-derived point cloud                        */
/* ------------------------------------------------------------------ */

/**
 * Headband camera intrinsics as recorded in the source calibrations
 * (`meta/calibrations.jsonl`, `ego_headband.camera-camchain.cam0`). The model
 * is Kalibr "ds" (DoubleSphere): params = [ξ, α, fx, fy, cx, cy] at the native
 * 1920×1200 resolution, with no distortion model on top.
 */
export const HEADBAND_INTRINSICS = {
  xi: -0.1997423752010708,
  alpha: 0.628544001113439,
  fx: 611.313529659484,
  fy: 679.1246090218608,
  cx: 964.095220549277,
  cy: 662.8307143297199,
  width: 1920,
  height: 1200,
}

/** Project a camera-frame point with the DoubleSphere model (returns pixels). */
function dsProject(x: number, y: number, z: number): [number, number] {
  const { xi, alpha, fx, fy, cx, cy } = HEADBAND_INTRINSICS
  const d1 = Math.sqrt(x * x + y * y + z * z)
  const k = xi * d1 + z
  const d2 = Math.sqrt(x * x + y * y + k * k)
  const den = alpha * d2 + (1 - alpha) * k
  return [fx * x / den + cx, fy * y / den + cy]
}

/**
 * Inverse of the DoubleSphere projection: pixel → unit ray in the camera frame
 * (+X right, +Y down, +Z along the optical axis). Solved by Newton iteration on
 * the ray scale, which converges in a handful of steps and is exact enough for
 * a point cloud.
 */
export function pixelToRay(u: number, v: number): Vec3 {
  const { fx, fy, cx, cy } = HEADBAND_INTRINSICS
  const mx = (u - cx) / fx
  const my = (v - cy) / fy
  let s = 1
  for (let i = 0; i < 24; i++) {
    const [pu, pv] = dsProject(mx * s, my * s, s)
    const eu = pu - u
    const ev = pv - v
    if (Math.abs(eu) < 1e-7 && Math.abs(ev) < 1e-7) break
    const h = s * 1e-4
    const [qu, qv] = dsProject(mx * (s + h), my * (s + h), s + h)
    const ju = (qu - pu) / h
    const jv = (qv - pv) / h
    const det = ju * ju + jv * jv
    if (det < 1e-18) break
    s -= (ju * eu + jv * ev) / det
    if (!(s > 1e-9)) {
      s = 1e-9
      break
    }
  }
  const x = mx * s
  const y = my * s
  const n = Math.hypot(x, y, s) || 1
  return [x / n, y / n, s / n]
}

/**
 * Mount of the headband camera on the VIVE head tracker: maps the camera's
 * optical frame (+X right, +Y down, +Z along the axis, OpenCV convention) into
 * the tracker's own axes, so the world view axis is `R_head · CAM_MOUNT · +Z`.
 *
 * The recordings do not ship the extrinsics (`T_cam_imu` exists but does not
 * reproduce the image geometry), so this was solved from the data itself: the
 * wrist-midpoint direction, expressed in the head frame, should be the pixel
 * the camera looks at, i.e. the tracker-frame +Z. A Kabsch fit over every frame
 * of the clip gives that rotation with an 8° median residual — while the
 * identity (the plain assumption that the camera shares the tracker's axes) is
 * 31° off. With it, the back-projected surface lands on the wrists (their
 * centroid is 0.10 m from the cloud centroid) instead of metres away.
 */
export const CAM_MOUNT: Mat3 = [
  [0.994672, 0.0, 0.103091],
  [-0.052749, 0.859178, 0.508951],
  [-0.088573, -0.511677, 0.8546],
]

/** World rotation of the headband camera for a head euler triple. */
export function headCameraRotation(euler: Vec3): Mat3 {
  return matMul(eulerDeg(euler[0], euler[1], euler[2]), CAM_MOUNT)
}

/**
 * Cast a camera-frame ray into the VIVE world through the head camera mount and
 * intersect it with the horizontal table plane at `planeY`. Returns null when
 * the ray does not travel downward far enough to reach the plane, or when the
 * intersection is beyond `maxRange` (grazing rays produce kilometre-long
 * smears along the table, and they carry no extra detail).
 *
 * `Rhead` is `headCameraRotation(euler)`, i.e. it already includes the mount, so
 * `ray` is used exactly as `pixelToRay` returns it.
 */
export function rayToPlane(
  Rhead: Mat3,
  ray: Vec3,
  eye: Vec3,
  planeY: number,
  maxRange = 2.2,
): Vec3 | null {
  const d = mulMatVec(Rhead, ray)
  if (d[1] > -1e-4) return null
  const t = (planeY - eye[1]) / d[1]
  if (!(t > 0) || t > maxRange) return null
  return [eye[0] + d[0] * t, planeY, eye[2] + d[2] * t]
}
