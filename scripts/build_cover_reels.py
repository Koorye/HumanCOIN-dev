#!/usr/bin/env python3
"""Build the cover's carousel data: ``src/data/coverReels.ts`` and one reduced
animation payload per take under ``public/data/reels/``.

The cover is a carousel of takes with a synchronised detail view. The detail
draws five streams that move with the footage, so it needs each take's samples
— but a take's ``sample.json`` is 2.3 MB, and the cover must not fetch eight of
those. This script reduces every released L3 take into two artefacts:

* ``src/data/coverReels.ts`` — the row metadata (id, title, scene, poster, the
  12 s preview and the clip's own frame count and rates). Small and bundled, so
  the carousel's cards paint without a request.
* ``public/data/reels/<id>.json`` — the animation payload, fetched only when a
  card is opened. Reduction per stream, chosen so what is drawn carries the
  stream's structure:

  - **gaze** — the eye camera's own (x, y), sample-paired, so the decimation is
    a uniform stride and both coordinates still belong to one sample;
  - **pose** — each rig's horizontal (x, z) track, again sample-paired;
  - **glove** — all 100 nodes across time (two 25-node blocks are 50, and 100 is
    the two hands), on the palm plane, so the pose can morph rather than jump;
  - **EMG / EEG** — one peak-preserving trace per channel, so a burst survives
    the rate reduction.

Everything stays in the capture's own native units and is autoscaled at draw
time. Nothing is normalised, synthesised or smoothed. The step sentences are
copied verbatim from ``public/data/objects.json``, which the viewer's readout
already uses, so the cover and the viewer cannot state different steps.

Usage:
    python3 scripts/build_cover_reels.py
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

# Animation keys per take. 81 keys over a 16 s clip is 5 Hz, which carries hand
# and head motion legibly; the streams are interpolated between keys at draw
# time, so this is a sampling rate rather than a frame count.
KEYS = 81
# Keys on the glove series, at half the above rate. A glove is drawn as 100
# nodes and is the largest series in the payload, so it is sampled coarser than
# the tracks; the pose between keys is interpolated, not invented.
GLOVE_KEYS = 41
# Points per channel on the scalar traces. 240 over 16 s is 15 Hz — enough for a
# moving trace to read as muscle or neural activity rather than as an envelope.
TRACE_POINTS = 240

# Fingertip node indices inside one 25-node glove block, in chain order.
TIPS = (4, 9, 14, 19, 24)
BLOCKS = (0, 25)
RIGS = ("head", "left", "right")

# The hand reading, ported from ``src/data/moment.ts``: a two-decision rule over
# wrist travel inside a step's window. Both boundaries sit in the gap between
# still windows and working ones rather than inside either cluster.
STILL = 0.012
DOMINANT = 0.62


def sig3(value: float) -> float:
    """Three significant digits, as a JSON number."""
    if value == 0 or not math.isfinite(value):
        return 0.0
    digits = 3 - int(math.floor(math.log10(abs(value)))) - 1
    return float(f"{round(value, digits):.{max(0, digits)}f}")


def key_indices(count: int, n: int) -> list[int]:
    """Uniform sample indices over a clip, endpoints included, paired-safe."""
    if count <= 1:
        return [0]
    if count <= n:
        return list(range(count))
    return [round(i * (count - 1) / (n - 1)) for i in range(n)]


def decimate_scalar(values: list[float], n: int = TRACE_POINTS) -> list[float]:
    """Peak-preserving decimation, the rule ``resample()`` uses in recordings.ts."""
    if len(values) <= n:
        return [sig3(v) for v in values]
    out: list[float] = []
    step = len(values) / n
    for i in range(n):
        a = int(math.floor(i * step))
        b = min(len(values), max(a + 1, int(math.floor((i + 1) * step))))
        out.append(sig3(max(values[a:b], key=abs)))
    return out


def glove_display(p: tuple[float, float, float], block: int) -> tuple[float, float]:
    """Glove-local node → the palm plane the figure draws, block 01 mirrored.

    The two blocks carry opposite handedness in their own axes, so the second is
    mirrored across the across-finger axis. This matches ``GlovePlot.vue`` and
    ``coverSignals.ts``; the release declares no handedness.
    """
    return (p[0], -p[1] if block == 0 else p[1])


def wrist_extent(positions: list[list[float]]) -> float:
    """Bounding-box diagonal of a wrist track, in the tracker's own units."""
    if len(positions) < 2:
        return 0.0
    xs = [p[0] for p in positions]
    ys = [p[1] for p in positions]
    zs = [p[2] for p in positions]
    return math.dist((min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs)))


def read_hand(frames: list[dict], start: float, end: float, fps: float) -> tuple[str, float, float]:
    """Hand in use over ``[start, end)``, measured from wrist travel.

    Ported from ``src/data/moment.ts``: the recording carries no hand label, so
    the working hand is the one whose wrist tracker moved. Returns the label and
    both travels, so the panel can show the evidence.
    """
    a = max(0, int(math.floor(start * fps)))
    b = min(len(frames), int(math.ceil(end * fps)))
    left = wrist_extent([frames[i]["poses"]["left"]["position"] for i in range(a, b)])
    right = wrist_extent([frames[i]["poses"]["right"]["position"] for i in range(a, b)])
    total = left + right
    if max(left, right) < STILL or total <= 0:
        return "none", left, right
    share = right / total
    hand = "right" if share >= DOMINANT else "left" if share <= 1 - DOMINANT else "both"
    return hand, left, right


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--recordings", default="public/data/recordings.json")
    ap.add_argument("--objects", default="public/data/objects.json")
    ap.add_argument("--previews", default="public/real/media-previews.json")
    ap.add_argument("--real", default="public/real")
    ap.add_argument("--out-json", default="public/data/reels")
    ap.add_argument("--out-ts", default="src/data/coverReels.ts")
    args = ap.parse_args()

    real = Path(args.real)
    out_json = Path(args.out_json)
    out_json.mkdir(parents=True, exist_ok=True)

    recordings = json.loads(Path(args.recordings).read_text())
    objects = json.loads(Path(args.objects).read_text())
    previews = {p["id"]: p for p in json.loads(Path(args.previews).read_text())}

    takes = []
    for rec in recordings:
        rid = rec["id"]
        sample = json.loads((real / rec["sample"]).read_text())
        frames = sample["frames"]
        waveforms = sample["waveforms"]
        fps = sample["fps"]
        n = len(frames)
        seconds = sample["duration"]

        key_idx = key_indices(n, KEYS)
        glove_idx = key_indices(n, GLOVE_KEYS)

        # ---- gaze: the eye camera's two pixel coordinates, sample-paired ----
        gaze_path = [
            [sig3(float(frames[i]["gaze"]["xy"][0])), sig3(float(frames[i]["gaze"]["xy"][1]))]
            for i in key_idx
        ]
        gx = [float(f["gaze"]["xy"][0]) for f in frames]
        gy = [float(f["gaze"]["xy"][1]) for f in frames]

        # ---- pose: each rig's horizontal track, sample-paired ----
        pose = {}
        for rig in RIGS:
            pose[rig] = [
                [sig3(float(frames[i]["poses"][rig]["position"][0])),
                 sig3(float(frames[i]["poses"][rig]["position"][2]))]
                for i in key_idx
            ]
        all_x = [p[0] for track in pose.values() for p in track]
        all_z = [p[1] for track in pose.values() for p in track]

        # ---- glove: every node over time, so the pose morphs rather than jumps ----
        glove_keys = []
        for i in glove_idx:
            pos = frames[i]["skeleton"]["positions"]
            glove_keys.append([
                [sig3(v) for v in glove_display(tuple(float(c) for c in pos[k]), 0 if k < 25 else 1)]
                for k in range(len(pos))
            ])
        gxs = [p[0] for key in glove_keys for p in key]
        gys = [p[1] for key in glove_keys for p in key]
        gx0, gx1 = min(gxs), max(gxs)
        gy0, gy1 = min(gys), max(gys)
        side = max(gx1 - gx0, gy1 - gy0, 1e-6) * 1.12
        view = (f"{sig3((gx0 + gx1) / 2 - side / 2):g} {sig3((gy0 + gy1) / 2 - side / 2):g} "
                f"{sig3(side):g} {sig3(side):g}")

        # ---- EMG and EEG: peak-preserving, in the capture's own units ----
        left = waveforms["leftEmg"]
        right = waveforms["rightEmg"]
        emg_channels = [f"L·{c}" for c in left["channels"]] + [f"R·{c}" for c in right["channels"]]
        emg_series = (
            [decimate_scalar([float(row[c]) for row in left["values"]]) for c in range(len(left["channels"]))]
            + [decimate_scalar([float(row[c]) for row in right["values"]]) for c in range(len(right["channels"]))]
        )
        eeg = waveforms["eeg"]
        eeg_channels = list(eeg["channels"])
        eeg_series = [decimate_scalar([float(row[c]) for row in eeg["values"]]) for c in range(len(eeg_channels))]

        sources = sample["metadata"]["sources"]

        def native(key: str) -> float | None:
            declared = sources.get(key, {}).get("nativeRateHz")
            return round(declared, 1) if declared else None

        rates = {
            "gaze": {"nativeHz": native("gaze"), "releasedFps": fps},
            "pose": {"nativeHz": native("head"), "releasedFps": fps},
            "glove": {"nativeHz": native("skeleton"), "releasedFps": fps},
            "emg": {"nativeHz": None, "releasedFps": left["sampleRate"]},
            "eeg": {"nativeHz": None, "releasedFps": eeg["sampleRate"]},
        }

        entry = objects.get(rid) or {}
        steps = entry.get("steps") or []

        # The annotation carries ordered steps but no per-step timing, so the
        # clip is divided evenly across them — the same derivation the viewer
        # uses. Each step's hand is then measured from wrist travel inside its
        # own window, and its objects are resolved against the episode's own
        # object table, so the cover and the viewer state the same facts.
        by_name = {o["name"]: o for o in (entry.get("objects") or [])}
        step_rows = []
        for i, s in enumerate(steps):
            count = max(1, len(steps))
            start = (i / count) * seconds
            end = ((i + 1) / count) * seconds
            hand, left_travel, right_travel = read_hand(frames, start, end, fps)

            def pick(names: list[str]) -> list[dict]:
                return [by_name[n] for n in names if n in by_name]

            groups = [
                {"word": g.get("word", ""), "members": pick(g.get("members", []))}
                for g in (s.get("groups") or [])
            ]
            step_rows.append({
                "index": s.get("index", i),
                "text": s.get("text", ""),
                "start": round(start, 3),
                "end": round(end, 3),
                "hand": hand,
                "travel": {"left": round(left_travel, 4), "right": round(right_travel, 4)},
                "mentions": pick(s.get("mentions") or []),
                "groups": [g for g in groups if g["members"]],
            })

        payload = {
            "id": rid,
            "seconds": seconds,
            "fps": fps,
            "frames": n,
            "keys": len(key_idx),
            "gloveKeys": len(glove_idx),
            "gaze": {
                "path": gaze_path,
                "extent": {"x": [sig3(min(gx)), sig3(max(gx))], "y": [sig3(min(gy)), sig3(max(gy))]},
            },
            "pose": {
                "tracks": pose,
                "extent": {"x": [sig3(min(all_x)), sig3(max(all_x))], "z": [sig3(min(all_z)), sig3(max(all_z))]},
            },
            "glove": {"keys": glove_keys, "view": view},
            "emg": {
                "channels": emg_channels,
                "leftChannels": len(left["channels"]),
                "rate": left["sampleRate"],
                "unit": left.get("unit") or "native (undocumented)",
                "series": emg_series,
            },
            "eeg": {
                "channels": eeg_channels,
                "rate": eeg["sampleRate"],
                "unit": eeg.get("unit") or "native (undocumented)",
                "series": eeg_series,
            },
            "rates": rates,
            "steps": step_rows,
        }

        out = out_json / f"{rid}.json"
        out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        size = out.stat().st_size / 1024
        hands = "".join(s["hand"][0].upper() for s in step_rows) or "-"
        print(f"{rid}: {len(key_idx)} keys, {len(glove_idx)} glove keys, "
              f"{len(emg_series)}/{len(eeg_series)} traces, {len(step_rows)} steps [{hands}] "
              f"-> {out} ({size:.0f} KB)")

        prev = previews.get(rid, {})
        takes.append({
            "id": rid,
            "level": prev.get("level") or "L3",
            "title": {"en": rec.get("titleEn") or rec["title"], "zh": rec["title"]},
            "scene": {"en": rec.get("sceneEn") or rec.get("scene") or "", "zh": rec.get("scene") or ""},
            "task": {"en": rec.get("taskEn") or rec.get("task") or "", "zh": rec.get("task") or ""},
            "poster": rec["poster"],
            "preview": prev.get("src") or "",
            "views": rec["views"],
            "seconds": seconds,
            "frames": n,
            "fps": fps,
            "rates": rates,
            # The single frame the reduced series are read at, if a still is
            # wanted: the clip's own 58% mark, the same one coverSignals used.
            "markFrame": round(0.58 * (n - 1)),
        })

    def bi(v: dict) -> str:
        return ("{ en: " + json.dumps(v["en"], ensure_ascii=False)
                + ", zh: " + json.dumps(v["zh"], ensure_ascii=False) + " }")

    rows = []
    for t in takes:
        views = ", ".join(f"{k}: {json.dumps(v)}" for k, v in t["views"].items())
        rates = ", ".join(
            f"{k}: {{ nativeHz: {json.dumps(v['nativeHz'])}, releasedFps: {v['releasedFps']:g} }}"
            for k, v in t["rates"].items()
        )
        rows.append(
            "  {\n"
            f"    id: {json.dumps(t['id'])},\n"
            f"    level: {json.dumps(t['level'])},\n"
            f"    title: {bi(t['title'])},\n"
            f"    scene: {bi(t['scene'])},\n"
            f"    task: {bi(t['task'])},\n"
            f"    poster: {json.dumps(t['poster'])},\n"
            f"    preview: {json.dumps(t['preview'])},\n"
            f"    views: {{ {views} }},\n"
            f"    seconds: {t['seconds']:g},\n"
            f"    frames: {t['frames']},\n"
            f"    fps: {t['fps']:g},\n"
            f"    markFrame: {t['markFrame']},\n"
            f"    rates: {{ {rates} }},\n"
            "  },"
        )

    ts = f"""/**
 * The cover's carousel: the released L3 takes, and where each one's reduced
 * animation payload lives.
 *
 * Generated by ``scripts/build_cover_reels.py`` from ``public/data/recordings.json``
 * and each take's own ``sample.json``. Every number here is read from the
 * release — the clip length, the frame count, each stream's declared rate, and
 * the poster and 12 s preview the release already ships.
 *
 * The metadata is bundled rather than fetched, because the carousel's cards sit
 * above the fold and must paint without a request. The moving series beside them
 * are not bundled: they live in ``public/data/reels/<id>.json`` and are fetched
 * only when a card is opened.
 */
import type {{ Bi }} from '@/content'

export interface CoverTakeRates {{
  /** The sensor's own delivery rate where the capture declares one. */
  nativeHz: number | null
  /** The rate the stream is published on. */
  releasedFps: number
}}

export interface CoverTake {{
  id: string
  /** Acquisition tier as the release labels it; always `L3` in this release. */
  level: string
  title: Bi
  scene: Bi
  task: Bi
  /** Poster frame, relative to `real/`. */
  poster: string
  /** 12 s preview clip, relative to `real/`; empty where the release ships none. */
  preview: string
  /** The four headband views and the two near-hand wrist views, relative to `real/`. */
  views: Record<'left' | 'right' | 'bleft' | 'bright' | 'wleft' | 'wright', string>
  seconds: number
  frames: number
  fps: number
  /** The clip's 58% frame, if a single still is wanted. */
  markFrame: number
  rates: Record<'gaze' | 'pose' | 'glove' | 'emg' | 'eeg', CoverTakeRates>
}}

/** The reduced animation payload for one take, as `public/data/reels/<id>.json`. */
export interface CoverReel {{
  id: string
  seconds: number
  fps: number
  frames: number
  /** Animation keys in `gaze`, `pose`. */
  keys: number
  /** Animation keys in `glove`. */
  gloveKeys: number
  /** Eye-camera pixels: the whole path and the extent it was autoscaled from. */
  gaze: {{ path: [number, number][]; extent: {{ x: [number, number]; y: [number, number] }} }}
  /** Each rig's horizontal track, and the extent of all three together. */
  pose: {{
    tracks: Record<'head' | 'left' | 'right', [number, number][]>
    extent: {{ x: [number, number]; z: [number, number] }}
  }}
  /** One entry per glove key: the 50 nodes of both 25-node blocks on the palm plane. */
  glove: {{ keys: [number, number][][]; view: string }}
  emg: {{ channels: string[]; leftChannels: number; rate: number; unit: string; series: number[][] }}
  eeg: {{ channels: string[]; rate: number; unit: string; series: number[][] }}
  rates: Record<'gaze' | 'pose' | 'glove' | 'emg' | 'eeg', CoverTakeRates>
  /**
   * The release's own steps, with the two things the release leaves implicit
   * derived the same way the viewer derives them: the window is the step's
   * even share of the clip (the annotation carries no timing), and the hand is
   * measured from wrist travel inside that window. Mentioned and grouped
   * objects are resolved against the episode's own object table.
   */
  steps: CoverStep[]
}}

/** One step of one take, as the annotation panel reads it. */
export interface CoverStep {{
  index: number
  text: string
  /** Window, in seconds, as the step's even share of the clip. */
  start: number
  end: number
  hand: 'left' | 'right' | 'both' | 'none'
  /** Wrist-tracker bounding-box diagonals in this window, native units. */
  travel: {{ left: number; right: number }}
  /** Objects the sentence names outright. */
  mentions: CoverObject[]
  /** Objects reached only through a group noun such as 饮品 or 卡片. */
  groups: {{ word: string; members: CoverObject[] }}[]
}}

/** One scene object as the capture's own metadata records it. */
export interface CoverObject {{
  name: string
  id: string | null
  /** Hex string, or `transparent` where the capture recorded no colour. */
  color: string | null
  shape: string | null
  material: string | null
  /** Centimetres, keyed by primitive dimension. */
  dims: Record<string, number>
  /** Grams, or null where the design library matched nothing. */
  weightG: number | null
}}

export const COVER_TAKES: CoverTake[] = [
{chr(10).join(rows)}
]

/**
 * Where one take's animation payload lives. Relative to the site root, so it
 * resolves under the same base the rest of `public/` does.
 */
export function reelUrl(id: string): string {{
  return `data/reels/${{id}}.json`
}}

const reels = new Map<string, Promise<CoverReel>>()

/**
 * The reduced animation payload for one take, fetched once and kept. The cover
 * fetches this only when a card is opened, so the carousel paints without it.
 */
export function loadReel(id: string): Promise<CoverReel> {{
  const hit = reels.get(id)
  if (hit) return hit
  const p = fetch(reelUrl(id)).then((r) => {{
    if (!r.ok) throw new Error(`${{reelUrl(id)}} → ${{r.status}}`)
    return r.json() as Promise<CoverReel>
  }})
  reels.set(id, p)
  return p
}}
"""
    out_ts = Path(args.out_ts)
    out_ts.write_text(ts)
    print(f"wrote {out_ts} ({out_ts.stat().st_size / 1024:.1f} KB) for {len(takes)} takes")


if __name__ == "__main__":
    main()
