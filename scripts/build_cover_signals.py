#!/usr/bin/env python3
"""Build ``src/data/coverSignals.ts`` — the real series the cover figure draws.

The cover shows the five non-visual streams of one released L3 episode, beside
the four headband views. Drawing them means having the episode's own samples,
but the cover sits above the fold, so the whole ``sample.json`` (2.3 MB) must
not be in the initial payload. This script reduces the episode to the small
typed module the figure needs — the same numbers, fewer of them, measured rather
than invented.

The reduction is chosen per stream so that what is drawn carries the structure
of the stream rather than its raw sample count:

* **gaze** — a 2-D path (both coordinates of one sample stay paired, so the
  decimation is a uniform stride) plus a 2-D density grid, because the shape of
  a gaze record is where it dwells, not two independent 1-D traces;
* **pose** — each rig's horizontal track (x, z), again sample-paired;
* **glove** — the 50 nodes at one frame and each fingertip's own trail, which is
  what carries motion through a stream of static poses;
* **EMG / EEG** — one peak-preserving trace per channel, because a multi-channel
  muscle or neural record is read channel by channel; the lanes share a scale
  *within* a stream so the recording's own amplitude spread stays visible, which
  is the fact the row's `spread` figure states.

Everything is kept in the capture's own native units and autoscaled at draw
time. Nothing is normalised, synthesised or smoothed.

Usage:
    python3 scripts/build_cover_signals.py \
        --sample public/real/sample.json \
        --index  public/data/recordings.json \
        --out    src/data/coverSignals.ts
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

# Points on a decimated 2-D path.
PATH_POINTS = 180
# Points on one fingertip's trail — shorter, because a trail is decoration that
# carries motion and a 40-point trail already spans the whole clip legibly.
TIP_POINTS = 40
# Points per channel on a scalar trace. 128 keeps a 16 s burst legible at the
# size the cover draws a lane, and keeps the module small.
TRACE_POINTS = 128
# Bins in the gaze density grid, which is why a fixation reads as a fixation.
DENSITY_BINS = 22

# Fingertip node indices inside one 25-node glove block, in chain order.
TIPS = (4, 9, 14, 19, 24)
BLOCKS = (0, 25)

# The share of the clip every instantaneous mark on the cover is read at. The
# cover's shared playhead sits here; gaze, pose and glove are all read at this
# one frame, so the rows really are one instant.
AT_FRACTION = 0.58


def sig3(value: float) -> float:
    """Three significant digits, as a JSON number."""
    if value == 0 or not math.isfinite(value):
        return 0.0
    digits = 3 - int(math.floor(math.log10(abs(value)))) - 1
    return float(f"{round(value, digits):.{max(0, digits)}f}")


def stride_indices(count: int, n: int) -> list[int]:
    """Uniform sample indices, for a path whose coordinates must stay paired."""
    if count <= n:
        return list(range(count))
    step = count / n
    idx = [min(count - 1, int(math.floor(i * step))) for i in range(n)]
    if idx[-1] != count - 1:
        idx[-1] = count - 1
    return idx


def decimate_path(points: list[tuple[float, float]], n: int = PATH_POINTS) -> list[list[float]]:
    """Uniform-stride decimation of a paired 2-D path, rounded."""
    keep = stride_indices(len(points), n)
    return [[sig3(points[i][0]), sig3(points[i][1])] for i in keep]


def decimate_scalar(values: list[float], n: int = TRACE_POINTS) -> list[float]:
    """Peak-preserving decimation, the rule ``resample()`` uses in recordings.ts.

    The extreme value inside each bin is kept rather than the first or the mean,
    so a transient survives the rate reduction and a burst is still a burst.
    """
    if len(values) <= n:
        return [sig3(v) for v in values]
    out: list[float] = []
    step = len(values) / n
    for i in range(n):
        a = int(math.floor(i * step))
        b = min(len(values), max(a + 1, int(math.floor((i + 1) * step))))
        out.append(sig3(max(values[a:b], key=abs)))
    return out


def density(points: list[tuple[float, float]], bins: int) -> list[list[int]]:
    """Occupancy of `points` on a `bins`×`bins` grid over their own extent.

    Row 0 is the *top* of the grid, matching the way an image is drawn, so the
    figure can hand the rows straight to the renderer without flipping.
    """
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    sx = (x1 - x0) or 1.0
    sy = (y1 - y0) or 1.0
    grid = [[0] * bins for _ in range(bins)]
    for x, y in points:
        c = min(bins - 1, int((x - x0) / sx * bins))
        r = min(bins - 1, int((y - y0) / sy * bins))
        grid[r][c] += 1
    # Drawn top-down: larger y is lower on the grid.
    return grid


def glove_display(p: tuple[float, float, float], block: int) -> tuple[float, float]:
    """Glove-local node → the frame the figure draws it in.

    The two blocks carry opposite handedness in their own axes (their palm
    polygons wind opposite ways), so the second block is mirrored across the
    across-finger axis. This is a display decision, matching `GlovePlot.vue`;
    the release declares no handedness.
    """
    return (p[0], -p[1] if block == 0 else p[1])


def glove_view(nodes: list[list[float]], trails: list[list[list[float]]]) -> str:
    """Square viewBox covering the drawn nodes *and* their trails.

    The trails are drawn behind the pose, so the box has to include them or a
    fingertip that left the frame's own bounding box would be clipped away.
    """
    pts = list(nodes) + [p for trail in trails for p in trail]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    side = max(x1 - x0, y1 - y0, 1e-6) * 1.12
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    return f"{sig3(cx - side / 2):g} {sig3(cy - side / 2):g} {sig3(side):g} {sig3(side):g}"


def fmt_numbers(values, indent: str = "      ", per_line: int = 14) -> str:
    lines = []
    for i in range(0, len(values), per_line):
        lines.append(indent + ", ".join(f"{v:g}" for v in values[i:i + per_line]) + ",")
    return "\n".join(lines)


def fmt_pairs(pairs: list[list[float]], indent: str = "      ") -> str:
    return ",\n".join(indent + f"[{p[0]:g}, {p[1]:g}]" for p in pairs)


def fmt_matrix(matrix: list[list[float]], indent: str = "      ") -> str:
    """One row per line, each already terminated by its comma."""
    rows = [indent + "[" + ", ".join(f"{v:g}" for v in row) + "]," for row in matrix]
    rows[-1] = rows[-1][:-1]  # the caller supplies the array's own final comma
    return "\n".join(rows)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sample", default="public/real/sample.json")
    ap.add_argument("--index", default="public/data/recordings.json")
    ap.add_argument("--out", default="src/data/coverSignals.ts")
    args = ap.parse_args()

    sample = json.loads(Path(args.sample).read_text())
    frames = sample["frames"]
    waveforms = sample["waveforms"]
    rid = sample["recordingId"]

    index = json.loads(Path(args.index).read_text())
    entry = next((r for r in index if r["id"] == rid), None)
    if entry is None:
        raise SystemExit(f"{rid} is not in {args.index}")
    task_en = entry.get("titleEn") or entry["title"]
    task_zh = sample.get("taskTitle") or entry["title"]

    at = round(AT_FRACTION * (len(frames) - 1))
    print(f"source {rid}: {len(frames)} frames at {sample['fps']} fps, mark at frame {at}")

    # ---- the rates the capture declares, verbatim from its own metadata ----
    sources = sample["metadata"]["sources"]

    def native(key: str) -> float | None:
        declared = sources.get(key, {}).get("nativeRateHz")
        return round(declared, 1) if declared else None

    rates = {
        "gaze": {"nativeHz": native("gaze"), "releasedFps": sample["fps"]},
        "pose": {"nativeHz": native("head"), "releasedFps": sample["fps"]},
        "glove": {"nativeHz": native("skeleton"), "releasedFps": sample["fps"]},
        "emg": {"nativeHz": None, "releasedFps": waveforms["leftEmg"]["sampleRate"]},
        "eeg": {"nativeHz": None, "releasedFps": waveforms["eeg"]["sampleRate"]},
    }
    for k, v in rates.items():
        print(f"rate {k}: native {v['nativeHz']} Hz, released {v['releasedFps']} fps/Hz")

    # ---- gaze: the eye camera's own two pixel coordinates ----
    gaze_pts = [(float(f["gaze"]["xy"][0]), float(f["gaze"]["xy"][1])) for f in frames]
    gaze_path = decimate_path(gaze_pts)
    gaze_density = density(gaze_pts, DENSITY_BINS)
    gaze_x = [p[0] for p in gaze_pts]
    gaze_y = [p[1] for p in gaze_pts]
    gaze_now = [sig3(gaze_pts[at][0]), sig3(gaze_pts[at][1])]
    peak_bin = max(max(r) for r in gaze_density)
    dwell = sum(gaze_density, []).count(peak_bin) / len(gaze_pts)
    print(f"gaze: x {min(gaze_x):.0f}..{max(gaze_x):.0f}, y {min(gaze_y):.0f}..{max(gaze_y):.0f}, "
          f"peak bin {peak_bin} samples ({dwell * 100:.1f}% of the clip)")

    # ---- pose: each rig's horizontal (x, z) track, sample-paired ----
    rig_ids = ("head", "left", "right")
    rig_tracks = {}
    for rig in rig_ids:
        rig_tracks[rig] = decimate_path(
            [(float(f["poses"][rig]["position"][0]), float(f["poses"][rig]["position"][2])) for f in frames]
        )
    pose_now = {}
    for rig in rig_ids:
        pos = frames[at]["poses"][rig]["position"]
        pose_now[rig] = [sig3(float(pos[0])), sig3(float(pos[2]))]
    all_x = [p[0] for pts in rig_tracks.values() for p in pts]
    all_z = [p[1] for pts in rig_tracks.values() for p in pts]
    for rig in rig_ids:
        span = math.dist((min(p[0] for p in rig_tracks[rig]), min(p[1] for p in rig_tracks[rig])),
                         (max(p[0] for p in rig_tracks[rig]), max(p[1] for p in rig_tracks[rig])))
        print(f"pose {rig}: travelled {span:.3f} native units")

    # ---- glove: the 50 nodes at the mark, plus each fingertip's own trail ----
    node_positions = frames[at]["skeleton"]["positions"]
    nodes = [
        [sig3(v) for v in glove_display(tuple(float(c) for c in node_positions[i]), 0 if i < 25 else 1)]
        for i in range(len(node_positions))
    ]
    trails = []
    for block in BLOCKS:
        for tip in TIPS:
            pts = [
                glove_display(tuple(float(c) for c in f["skeleton"]["positions"][block + tip]), 0 if block == 0 else 1)
                for f in frames
            ]
            trails.append(decimate_path(pts, TIP_POINTS))
    view = glove_view(nodes, trails)
    print(f"glove: {len(nodes)} nodes, {len(trails)} tip trails, view {view}")

    # ---- EMG and EEG: every channel, peak-preserving, in the capture's units ----
    left = waveforms["leftEmg"]
    right = waveforms["rightEmg"]
    emg_channels = [f"L·{c}" for c in left["channels"]] + [f"R·{c}" for c in right["channels"]]
    emg_series = [
        decimate_scalar([float(row[c]) for row in left["values"]]) for c in range(len(left["channels"]))
    ] + [
        decimate_scalar([float(row[c]) for row in right["values"]]) for c in range(len(right["channels"]))
    ]

    eeg = waveforms["eeg"]
    eeg_channels = list(eeg["channels"])
    eeg_series = [
        decimate_scalar([float(row[c]) for row in eeg["values"]]) for c in range(len(eeg_channels))
    ]

    # Two facts the caption can state because they were measured here: which
    # channel swings hardest, and how much harder than the quietest one.
    def loudest(series: list[list[float]], channels: list[str]) -> tuple[str, float, float]:
        peaks = [max(abs(v) for v in row) for row in series]
        i = max(range(len(peaks)), key=peaks.__getitem__)
        lo = min(p for p in peaks if p > 0) if any(peaks) else 0.0
        return channels[i], peaks[i], (peaks[i] / lo if lo else 0.0)

    for name, series, chans in (
        ("emg", emg_series, emg_channels),
        ("eeg", eeg_series, eeg_channels),
    ):
        ch, peak, ratio = loudest(series, chans)
        print(f"{name}: hardest-swinging channel {ch} at {peak:.0f} native units, "
              f"{ratio:.1f}× the quietest channel")

    rig_blocks = []
    for rig in rig_ids:
        pts = rig_tracks[rig]
        rig_blocks.append(
            f"    {{\n      id: '{rig}',\n      x: [\n{fmt_numbers([p[0] for p in pts])}\n      ],\n"
            f"      z: [\n{fmt_numbers([p[1] for p in pts])}\n      ],\n    }},"
        )

    ts = f"""/**
 * The real series the cover figure draws.
 *
 * Generated by ``scripts/build_cover_signals.py`` from one released L3 episode
 * (``public/real/sample.json``, {rid}) — these are the
 * episode's own samples, reduced, not an illustration of them. The cover sits
 * above the fold, so the episode is not fetched there; this module is what lets
 * the figure draw the actual streams without a 2.3 MB request before the first
 * paint.
 *
 * Each stream is reduced in the shape that carries its structure: the gaze
 * record as a 2-D path plus a 2-D density grid, each rig as a sample-paired
 * (x, z) track, the glove as one frame's 50 nodes plus each fingertip's own
 * trail, and EMG/EEG as one decimated trace per channel. 2-D paths are decimated
 * by uniform stride, so both coordinates still belong to the same sample; scalar
 * traces are decimated peak-preservingly, so a transient survives.
 *
 * Everything is in the capture's own native units and is autoscaled at draw
 * time. Nothing here is normalised, synthesised or smoothed.
 */
import type {{ Bi }} from '@/content'

export interface CoverRigTrack {{
  id: 'head' | 'left' | 'right'
  /** Native-frame horizontal position, one sample per decimated point. */
  x: number[]
  /** Native-frame depth of the same samples, in the same order as `x`. */
  z: number[]
}}

export interface CoverChannels {{
  /** One label per trace, in trace order. */
  channels: string[]
  /** One decimated trace per channel, in the capture's own units. */
  series: number[][]
  /** Samples per second, as the capture declares them. */
  rate: number
  /** Amplitude unit as the capture states it. */
  unit: string
}}

export interface CoverSignals {{
  source: {{
    id: string
    task: Bi
    seconds: number
    fps: number
    /** Frames in the released clip. */
    frames: number
    /** Index of the frame every instantaneous mark is read at. */
    at: number
    /**
     * Rate per stream, as the capture declares it. `nativeHz` is the sensor's
     * own delivery rate where the capture states one; `releasedFps` is the rate
     * the stream is released on. The two differ for gaze, pose and glove, which
     * are captured in the hundreds of hertz and published on the episode grid.
     */
    rates: Record<'gaze' | 'pose' | 'glove' | 'emg' | 'eeg', {{ nativeHz: number | null; releasedFps: number }}>
  }}
  /** Eye-camera pixels: the whole path, its density, and both at `source.at`. */
  gaze: {{
    path: [number, number][]
    density: number[][]
    extent: {{ x: [number, number]; y: [number, number] }}
    now: [number, number]
  }}
  /** Each rig's horizontal track over the clip, and where it is at `source.at`. */
  pose: {{
    rigs: CoverRigTrack[]
    now: Record<'head' | 'left' | 'right', [number, number]>
    extent: {{ x: [number, number]; z: [number, number] }}
  }}
  /**
   * The 50 glove nodes at `source.at` and the fingertip trails, in glove-local
   * coordinates with block 01 mirrored for display, plus the square viewBox
   * those coordinates were normalised into. Trails are block-major: entries 0–4
   * are block 00's fingertips, 5–9 block 01's.
   */
  glove: {{ nodes: [number, number][]; trails: [number, number][][]; view: string }}
  /** Two wrist amplifiers of eight channels each; the first `leftChannels` traces are the left. */
  emg: CoverChannels & {{ leftChannels: number }}
  /** Eight scalp electrodes. */
  eeg: CoverChannels
}}

export const COVER_SIGNALS: CoverSignals = {{
  source: {{
    id: '{rid}',
    task: {{ en: {json.dumps(task_en, ensure_ascii=False)}, zh: {json.dumps(task_zh, ensure_ascii=False)} }},
    seconds: {sample['duration']:g},
    fps: {sample['fps']:g},
    frames: {len(frames)},
    at: {at},
    rates: {json.dumps(rates, indent=2, ensure_ascii=False).replace(chr(10), chr(10) + '    ')},
  }},
  gaze: {{
    path: [
{fmt_pairs(gaze_path)}
    ],
    density: [
{fmt_matrix(gaze_density)}
    ],
    extent: {{ x: [{sig3(min(gaze_x)):g}, {sig3(max(gaze_x)):g}], y: [{sig3(min(gaze_y)):g}, {sig3(max(gaze_y)):g}] }},
    now: [{gaze_now[0]:g}, {gaze_now[1]:g}],
  }},
  pose: {{
    rigs: [
{chr(10).join(rig_blocks)}
    ],
    now: {{
      head: [{pose_now['head'][0]:g}, {pose_now['head'][1]:g}],
      left: [{pose_now['left'][0]:g}, {pose_now['left'][1]:g}],
      right: [{pose_now['right'][0]:g}, {pose_now['right'][1]:g}],
    }},
    extent: {{ x: [{sig3(min(all_x)):g}, {sig3(max(all_x)):g}], z: [{sig3(min(all_z)):g}, {sig3(max(all_z)):g}] }},
  }},
  glove: {{
    nodes: [
{fmt_pairs(nodes)}
    ],
    trails: [
{chr(10).join('      [' + ', '.join(f'[{p[0]:g}, {p[1]:g}]' for p in trail) + '],' for trail in trails)}
    ],
    view: '{view}',
  }},
  emg: {{
    channels: {json.dumps(emg_channels)},
    leftChannels: {len(left['channels'])},
    rate: {left['sampleRate']:g},
    unit: {json.dumps(left.get('unit') or 'native (undocumented)')},
    series: [
{chr(10).join('      [' + chr(10) + fmt_numbers(s, indent='        ') + chr(10) + '      ],' for s in emg_series)}
    ],
  }},
  eeg: {{
    channels: {json.dumps(eeg_channels)},
    rate: {eeg['sampleRate']:g},
    unit: {json.dumps(eeg.get('unit') or 'native (undocumented)')},
    series: [
{chr(10).join('      [' + chr(10) + fmt_numbers(s, indent='        ') + chr(10) + '      ],' for s in eeg_series)}
    ],
  }},
}}
"""
    out = Path(args.out)
    out.write_text(ts)
    print(f"wrote {out} ({out.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
