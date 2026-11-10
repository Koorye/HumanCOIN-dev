#!/usr/bin/env python3
"""Build the cover's three tiers from the current real captures.

The cover used to show one demo capture of L3 and carried L3 clips as stand-ins
for the L2 and L1 rows. Now each row is built from its own tier's footage in
``/home/baai/Projects/Paper-Drafts/素材`` and the panel shows only the streams
that tier actually ships:

* **L3** — four headband views, two wrist views, gaze, head/wrist pose, glove
  skeleton, 16 EMG lanes, 8 EEG lanes and the capture's own step notes;
* **L2** — six views and the two wrist-band EMG streams; the capture ships no
  gaze, pose, glove or EEG;
* **L1** — four head-mounted views; no physiological channels and no steps.

Every clip is cut to one 12 s window on the camera's own timeline and reduced
for the web: 640 px wide, CRF 32, no audio, faststart. A card's 6 s preview is
240 px wide, and its poster is one frame of the same window, so a card paints
before its clip is fetched. Nothing is stabilised, retimed or interpolated —
the streams are sampled from the capture's own parquet samples, decimated with
the same peak-preserving rule the rest of the site uses.

Usage:
    python3 scripts/build_cover_tiers.py --all
    python3 scripts/build_cover_tiers.py --media --tier L3 --only L3-002-2026-10-27-14-15-45
"""
from __future__ import annotations

import argparse
import ast
import json
import math
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

MATERIAL = Path("/home/baai/Projects/Paper-Drafts/素材")
SITE = Path(__file__).resolve().parents[1]
OUT = SITE / "public/real/cover"
REELS = SITE / "public/data/reels"
TS = SITE / "src/data/coverTakes.ts"

FPS = 30
SECONDS = 12.0          # one window per take
PREVIEW_SECONDS = 6.0
VIEW_W = 640            # main panel
PREVIEW_W = 240         # a 104 px card, at 2x
CRF = 32
PREVIEW_CRF = 35
KEYS = 121              # 10 Hz over 12 s, interpolated at draw time
GLOVE_KEYS = 37
TRACE_POINTS = 200
STILL = 0.012
DOMINANT = 0.62

RIGS = ("head", "left", "right")
EEG_PREFERRED = ("FP1", "FP2", "F3", "F4", "C3", "C4", "P3", "P4")


def log(message: str) -> None:
    print(message, flush=True)


def ffmpeg(*args: str) -> None:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
        check=True,
    )


def probe(path: Path) -> dict:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,nb_frames,duration:format=duration",
         "-of", "json", str(path)]
    )
    payload = json.loads(out)
    info = payload["streams"][0]
    if not info.get("duration"):
        info["duration"] = payload.get("format", {}).get("duration")
    return info


def even(value: float) -> int:
    return max(2, int(round(value / 2) * 2))


def clamp_start(duration: float, wanted: float) -> tuple[float, float]:
    """A start that keeps a full window inside the clip, and the window length."""
    if duration <= SECONDS + 0.5:
        return 0.0, max(0.5, duration - 0.2)
    start = min(max(wanted, 0.0), duration - SECONDS - 0.1)
    return round(start, 3), SECONDS


def busiest_start(signal: np.ndarray, fps: float, duration: float) -> float:
    """The 12 s window with the most wrist travel, from the capture's own samples.

    A cover clip is a moment in the take, not its opening: the first seconds of a
    capture are set-up. The window is chosen by summing the measured speed of the
    two wrist trackers on a 30 Hz grid and taking the busiest full window, so the
    clip is where the hands were working. The choice is made from this take's own
    samples and nothing else.
    """
    if duration <= SECONDS + 0.5 or len(signal) < 2:
        return 0.0
    width = min(len(signal), int(round(SECONDS * fps)))
    if width >= len(signal):
        return 0.0
    kernel = np.ones(width)
    scores = np.convolve(np.nan_to_num(signal), kernel, mode="valid")
    start = float(np.argmax(scores)) / fps
    return min(max(0.0, start), duration - SECONDS - 0.1)


# --------------------------------------------------------------------------
# the takes, one entry per card, in row order
# --------------------------------------------------------------------------
# `src` names are relative to the capture's own directory. L1 keeps four .mkv
# streams, L2 ships four ROS-view mp4s plus two wrist mp4s, and L3 ships all
# eight as mp4 under `videos/chunk-000/<observation.images.*>`.

TAKES: list[dict] = [
    # ---------------- L3 ----------------
    dict(tier="L3", id="L3-001-2026-09-21-14-05-10", dir="头环L3视频素材/L3-001-2026-09-21-14-05-10",
         start=3.0, title=("Pack fruit into a lunch bag", "把水果装进饭盒袋"),
         scene=("Dining table", "餐桌"), task=("Packing fruit", "装袋")),
    dict(tier="L3", id="L3-001-2026-09-29-11-40-47", dir="头环L3视频素材/L3-001-2026-09-29-11-40-47",
         start=2.0, title=("Pour water from the kettle", "用水壶倒水"),
         scene=("Dining table", "餐桌"), task=("Pouring", "倒水")),
    dict(tier="L3", id="L3-001-2026-09-30-10-56-14", dir="头环L3视频素材/L3-001-2026-09-30-10-56-14",
         start=3.0, title=("Lay out bowls and chopsticks", "摆放碗筷"),
         scene=("Dining table", "餐桌"), task=("Table setting", "摆桌")),
    dict(tier="L3", id="L3-002-2026-10-27-14-15-45", dir="头环L3视频素材/L3-002-2026-10-27-14-15-45",
         start=3.0, title=("Clear scrap paper from the desk", "收纳桌面废纸"),
         scene=("Desk", "书桌"), task=("Desk clean-up", "桌面整理")),
    dict(tier="L3", id="L3-002-2026-10-27-14-23-11", dir="头环L3视频素材/L3-002-2026-10-27-14-23-11",
         start=3.0, title=("Wipe the whiteboard and write new to-dos", "擦白板并写下新待办"),
         scene=("Desk", "书桌"), task=("Whiteboard update", "白板更新")),
    dict(tier="L3", id="L3-002-2026-10-27-15-30-17", dir="头环L3视频素材/L3-002-2026-10-27-15-30-17",
         start=4.0, title=("Cut out a paper pattern", "裁剪图案"),
         scene=("Desk", "书桌"), task=("Paper cutting", "裁剪")),
    dict(tier="L3", id="L3-003-2026-10-20-17-51-27", dir="头环L3视频素材/L3-003-2026-10-20-17-51-27",
         start=3.0, title=("Hang a new hook and mount a tool", "新增挂钩并挂上工具"),
         scene=("Workbench", "工作台"), task=("Tool mounting", "工具上墙")),
    dict(tier="L3", id="L3-003-2026-10-21-17-50-20", dir="头环L3视频素材/L3-003-2026-10-21-17-50-20",
         start=4.0, title=("Install keycaps on the board", "安装键帽"),
         scene=("Workbench", "工作台"), task=("Keycap assembly", "键帽安装")),
    # ---------------- L2 ----------------
    dict(tier="L2", id="L2-007-2026-11-06-03-32-13", dir="头环L2视频素材/L2-007-2026-11-06-03-32-13",
         start=3.0, title=("Pour water from the kettle", "用水壶倒水"),
         scene=("Dining table", "餐桌"), task=("Pouring", "倒水")),
    dict(tier="L2", id="L2-007-2026-11-06-17-03-13", dir="头环L2视频素材/L2-007-2026-11-06-17-03-13",
         start=2.0, title=("Make a sandwich", "做三明治"),
         scene=("Dining table", "餐桌"), task=("Sandwich making", "三明治")),
    dict(tier="L2", id="L2-007-2026-11-06-17-25-02", dir="头环L2视频素材/L2-007-2026-11-06-17-25-02",
         start=2.0, title=("Assemble a second sandwich", "再做一个三明治"),
         scene=("Dining table", "餐桌"), task=("Sandwich making", "三明治")),
    dict(tier="L2", id="L2-011-2026-11-06-00-27-55", dir="头环L2视频素材/L2-011-2026-11-06-00-27-55",
         start=8.0, title=("Replace the battery in the tool", "更换工具电池"),
         scene=("Workbench", "工作台"), task=("Battery replacement", "换电池")),
    dict(tier="L2", id="L2-011-2026-11-06-17-14-28", dir="头环L2视频素材/L2-011-2026-11-06-17-14-28",
         start=4.0, title=("Repair a data cable", "修补数据线"),
         scene=("Workbench", "工作台"), task=("Cable repair", "修数据线")),
    dict(tier="L2", id="L2-011-2026-11-06-17-48-59", dir="头环L2视频素材/L2-011-2026-11-06-17-48-59",
         start=6.0, title=("Hang a new hook and mount a tool", "新增挂钩并挂上工具"),
         scene=("Workbench", "工作台"), task=("Tool mounting", "工具上墙")),
    dict(tier="L2", id="L2-014-2026-11-06-04-42-01", dir="头环L2视频素材/L2-014-2026-11-06-04-42-01",
         start=14.0, title=("Cut out a paper pattern", "裁剪图案"),
         scene=("Desk", "书桌"), task=("Paper cutting", "裁剪")),
    dict(tier="L2", id="L2-014-2026-11-06-18-19-34", dir="头环L2视频素材/L2-014-2026-11-06-18-19-34",
         start=8.0, title=("Trace and cut a second pattern", "描画并裁剪第二个图案"),
         scene=("Desk", "书桌"), task=("Paper cutting", "裁剪")),
    # ---------------- L1 ----------------
    dict(tier="L1", id="cp_0003_session_20261015_162348", dir="头环L1视频素材/cp_0003_session_20261015_162348",
         start=15.0, title=("cp_0003 · 15 Oct 2026", "cp_0003 · 2026-10-15"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
    dict(tier="L1", id="cp_0003_session_20261020_155720", dir="头环L1视频素材/cp_0003_session_20261020_155720",
         start=15.0, title=("cp_0003 · 20 Oct 2026", "cp_0003 · 2026-10-20"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
    dict(tier="L1", id="cp_0003_session_20261022_101540", dir="头环L1视频素材/cp_0003_session_20261022_101540",
         start=15.0, title=("cp_0003 · 22 Oct 2026", "cp_0003 · 2026-10-22"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
    dict(tier="L1", id="cp_0004_session_20261019_183408", dir="头环L1视频素材/cp_0004_session_20261019_183408",
         start=15.0, title=("cp_0004 · 19 Oct 2026", "cp_0004 · 2026-10-19"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
    dict(tier="L1", id="cp_0004_session_20261021_154434", dir="头环L1视频素材/cp_0004_session_20261021_154434",
         start=15.0, title=("cp_0004 · 21 Oct 2026", "cp_0004 · 2026-10-21"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
    dict(tier="L1", id="cp_0016_session_20261016_103107", dir="头环L1视频素材/cp_0016_session_20261016_103107",
         start=15.0, title=("cp_0016 · 16 Oct 2026", "cp_0016 · 2026-10-16"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
    dict(tier="L1", id="cp_0016_session_20261020_174713", dir="头环L1视频素材/cp_0016_session_20261020_174713",
         start=15.0, title=("cp_0016 · 20 Oct 2026", "cp_0016 · 2026-10-20"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
    dict(tier="L1", id="cp_0016_session_20261021_171216", dir="头环L1视频素材/cp_0016_session_20261021_171216",
         start=15.0, title=("cp_0016 · 21 Oct 2026", "cp_0016 · 2026-10-21"),
         scene=("Everyday capture", "日常采集"), task=("Long-tail activity", "长尾活动")),
]




POSE_CANDIDATES = {
    "head": ("head_pose", "chest_pose", "device0_pose"),
    "left": ("left_wrist_pose", "device1_pose"),
    "right": ("right_wrist_pose", "device2_pose"),
}


def pose_keys(base: Path) -> dict[str, str]:
    """Which parquet table carries each rig in this capture.

    The September captures name the three 6-DoF trackers ``device0..2_pose``;
    the October ones name them ``head_pose`` and the two wrist tables, and one
    workbench take carries the head tracker as ``chest_pose``. The rig is the
    same in all three, so the first table that exists wins.
    """
    data = base / "data/chunk-000/episode_000000"
    found: dict[str, str] = {}
    for rig, names in POSE_CANDIDATES.items():
        for name in names:
            if (data / f"observation.{name}.parquet").exists():
                found[rig] = name
                break
    return found


def wrist_activity(base: Path, duration: float) -> np.ndarray:
    """Total wrist speed of both trackers on a 30 Hz grid, in the capture's units."""
    data = base / "data/chunk-000/episode_000000"
    grid = np.arange(0.0, duration, 1.0 / FPS)
    total = np.zeros(len(grid))
    keys = pose_keys(base)
    for rig in ("left", "right"):
        key = keys.get(rig)
        if not key:
            continue
        tab = load_table(data / f"observation.{key}.parquet")
        ts = tab["timestamp"].to_numpy()
        xyz = np.column_stack([tab["x"].to_numpy(), tab["y"].to_numpy(), tab["z"].to_numpy()])
        dense = xyz[nearest_index(ts, grid)]
        total += np.linalg.norm(np.diff(dense, axis=0, prepend=dense[:1]), axis=1)
    return total


def emg_activity(base: Path) -> tuple[np.ndarray, np.ndarray]:
    """Both wrist bands' RMS on a 0.1 s grid, and the grid's own times (unix)."""
    times: np.ndarray | None = None
    energy: np.ndarray | None = None
    for name in ("emg_left", "emg_right"):
        npz = np.load(base / f"{name}/{name}.npz", allow_pickle=True)
        ts = npz["emg_timestamps"].astype(float)
        data = npz["emg_data"].astype(float)
        step = 0.1
        edges = np.arange(ts[0], ts[-1] + step, step)
        idx = np.clip(np.searchsorted(ts, edges), 0, len(ts) - 1)
        values = np.array([
            float(np.sqrt(np.mean(data[a:b] ** 2))) if b > a else 0.0
            for a, b in zip(idx[:-1], idx[1:])
        ])
        if energy is None:
            times, energy = edges[:-1], values
        else:
            energy = energy + values[: len(energy)]
    return times, energy  # type: ignore[return-value]


def source_paths(take: dict) -> dict[str, Path]:
    """The capture's own file for each view, before any reduction."""
    base = MATERIAL / take["dir"]
    tier = take["tier"]
    if tier == "L3":
        vids = base / "videos/chunk-000"
        return {
            "left": vids / "observation.images.headband_left_rgb/episode_000000.mp4",
            "right": vids / "observation.images.headband_right_rgb/episode_000000.mp4",
            "bleft": vids / "observation.images.headband_bleft_rgb/episode_000000.mp4",
            "bright": vids / "observation.images.headband_bright_rgb/episode_000000.mp4",
            "wleft": vids / "observation.images.left_wrist_rgb/episode_000000.mp4",
            "wright": vids / "observation.images.right_wrist_rgb/episode_000000.mp4",
        }
    if tier == "L2":
        return {
            "left": base / "cam_ros_left/frames.mp4",
            "right": base / "cam_ros_right/frames.mp4",
            "bleft": base / "cam_ros_bleft/frames.mp4",
            "bright": base / "cam_ros_bright/frames.mp4",
            "wleft": base / "cam_left_wrist/frames.mp4",
            "wright": base / "cam_right_wrist/frames.mp4",
        }
    return {
        "left": base / "videos/left.mkv",
        "right": base / "videos/right.mkv",
        "bleft": base / "videos/bleft.mkv",
        "bright": base / "videos/bright.mkv",
    }


# --------------------------------------------------------------------------
# media
# --------------------------------------------------------------------------

def window_for(take: dict) -> dict:
    """The one 12 s window this take is cut to, and the views it ships.

    L3 and L2 use the capture's own samples to find the busiest window (wrist
    speed, and the wrist bands' EMG); L1 has no sample stream on this clock, so
    it uses the window named in the take table. The result is deterministic, so
    a rebuild cuts the same moment the metadata describes.
    """
    sources = source_paths(take)
    left_probe = probe(sources["left"])
    duration = float(left_probe["duration"])
    base = MATERIAL / take["dir"]
    if duration > SECONDS + 0.5 and not take.get("fixed_start"):
        if take["tier"] == "L3":
            start, window = clamp_start(duration, busiest_start(wrist_activity(base, duration), FPS, duration))
        elif take["tier"] == "L2":
            times, energy = emg_activity(base)
            video0 = float(np.load(base / "cam_ros_left/cam_ros_left.npz", allow_pickle=True)["frames_timestamps"][0])
            rel = times - video0
            grid = np.arange(0.0, duration, 1.0 / FPS)
            dense = np.interp(grid, rel, energy, left=0.0, right=0.0)
            start, window = clamp_start(duration, busiest_start(dense, FPS, duration))
        else:
            start, window = clamp_start(duration, take["start"])
    else:
        start, window = clamp_start(duration, take["start"])
    return {"start": start, "seconds": window, "views": list(sources),
            "width": int(left_probe["width"]), "height": int(left_probe["height"])}


def build_media(take: dict, force: bool) -> dict:
    take_dir = OUT / take["tier"] / take["id"]
    take_dir.mkdir(parents=True, exist_ok=True)
    sources = source_paths(take)
    chosen = window_for(take)
    start, window = chosen["start"], chosen["seconds"]
    width, height = chosen["width"], chosen["height"]

    for key, src in sources.items():
        dest = take_dir / f"{key}.mp4"
        if dest.exists() and not force:
            continue
        info = probe(src)
        h = even(VIEW_W * int(info["height"]) / int(info["width"]))
        ffmpeg(
            "-ss", f"{start}", "-i", str(src), "-t", f"{window}",
            "-an", "-vf", f"scale={VIEW_W}:{h},setsar=1",
            "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", str(CRF),
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "2",
            str(dest),
        )

    poster = take_dir / "poster.jpg"
    if force or not poster.exists():
        ffmpeg("-ss", "0.4", "-i", str(take_dir / "left.mp4"), "-frames:v", "1",
               "-vf", f"scale={VIEW_W}:-2", "-q:v", "4", str(poster))

    preview = take_dir / "preview.mp4"
    if force or not preview.exists():
        h = even(PREVIEW_W * height / width)
        ffmpeg(
            "-ss", f"{start}", "-i", str(sources["left"]), "-t", f"{min(PREVIEW_SECONDS, window)}",
            "-an", "-vf", f"scale={PREVIEW_W}:{h},setsar=1",
            "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", str(PREVIEW_CRF),
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "2",
            str(preview),
        )

    return chosen


# --------------------------------------------------------------------------
# reduced streams
# --------------------------------------------------------------------------

def sig3(value: float) -> float:
    if value == 0 or not math.isfinite(value):
        return 0.0
    digits = 3 - int(math.floor(math.log10(abs(value)))) - 1
    return float(f"{round(value, digits):.{max(0, digits)}f}")


def key_indices(count: int, n: int) -> list[int]:
    if count <= 1:
        return [0]
    if count <= n:
        return list(range(count))
    return [round(i * (count - 1) / (n - 1)) for i in range(n)]


def decimate(values: np.ndarray, n: int = TRACE_POINTS) -> list[float]:
    """Peak-preserving decimation: each output slot keeps its largest sample."""
    values = np.asarray(values, dtype=np.float64)
    if len(values) <= n:
        return [sig3(float(v)) for v in values]
    step = len(values) / n
    out = []
    for i in range(n):
        a = int(math.floor(i * step))
        b = min(len(values), max(a + 1, int(math.floor((i + 1) * step))))
        out.append(sig3(float(values[a:b][np.argmax(np.abs(values[a:b]))])))
    return out


def nearest_index(times: np.ndarray, target: np.ndarray) -> np.ndarray:
    i = np.searchsorted(times, target).clip(1, len(times) - 1)
    return np.where(np.abs(times[i - 1] - target) <= np.abs(times[i] - target), i - 1, i)


def read_hand(positions: dict[str, np.ndarray], start: float, end: float) -> tuple[str, float, float]:
    """Hand in use, from wrist travel inside the step window (as `moment.ts`)."""
    fps = FPS
    a = max(0, int(math.floor(start * fps)))
    b = min(len(positions["left"]), int(math.ceil(end * fps)))

    def extent(track: np.ndarray) -> float:
        part = track[a:b]
        if len(part) < 2:
            return 0.0
        lo, hi = part.min(axis=0), part.max(axis=0)
        return float(np.linalg.norm(hi - lo))

    left, right = extent(positions["left"]), extent(positions["right"])
    total = left + right
    if max(left, right) < STILL or total <= 0:
        return "none", left, right
    share = right / total
    hand = "right" if share >= DOMINANT else "left" if share <= 1 - DOMINANT else "both"
    return hand, left, right


def load_table(path: Path):
    import pyarrow.parquet as pq
    return pq.read_table(path)


def features(base: Path) -> dict:
    return json.loads((base / "meta/info.json").read_text())["features"]


def collect_info(base: Path) -> dict:
    path = base / "meta/collect_info.jsonl"
    if not path.exists():
        return {}
    for line in path.read_text().splitlines():
        if line.strip():
            return json.loads(line)
    return {}


def parse_steps(base: Path, objects_positions: dict[str, np.ndarray]) -> list[dict]:
    """The capture's own ordered steps, with hand measured and objects resolved."""
    info = collect_info(base)
    notes = info.get("notes") or ""
    lines = []
    for raw in notes.splitlines():
        text = raw.strip()
        if not text:
            continue
        head = text.lstrip("0123456789.、．) ）")
        if head != text:
            lines.append(head.strip())
    objects = []
    try:
        objects = ast.literal_eval(info.get("objects") or "[]")
    except (ValueError, SyntaxError):
        objects = []
    by_name = {o.get("name"): o for o in objects if isinstance(o, dict) and o.get("name")}

    rows = []
    count = max(1, len(lines))
    for i, text in enumerate(lines):
        start = (i / count) * SECONDS
        end = ((i + 1) / count) * SECONDS
        hand, left, right = read_hand(objects_positions, start, end)
        mentions = [o for name, o in by_name.items() if name and name in text]
        rows.append({
            "index": i,
            "text": text,
            "start": round(start, 3),
            "end": round(end, 3),
            "hand": hand,
            "travel": {"left": round(left, 4), "right": round(right, 4)},
            "mentions": [{
                "name": o.get("name", ""),
                "id": o.get("id"),
                "color": o.get("color"),
                "shape": o.get("shape"),
                "material": o.get("material"),
                "dims": {k: v for k, v in (o.get("dims") or {}).items() if isinstance(v, (int, float))},
                "weightG": o.get("weightG"),
            } for o in mentions],
            "groups": [],
        })
    return rows


def build_reel_l3(take: dict) -> dict:
    base = MATERIAL / take["dir"]
    data = base / "data/chunk-000/episode_000000"
    start = take["window"]["start"]
    window = take["window"]["seconds"]

    def stream(name: str):
        return load_table(data / f"{name}.parquet")

    def windowed(name: str):
        tab = stream(name)
        ts = tab["timestamp"].to_numpy()
        lo, hi = np.searchsorted(ts, [start, start + window])
        return tab, ts, lo, hi

    # gaze — the eye camera's two pixel coordinates, sample-paired
    gtab, gts, glo, ghi = windowed("observation.eye_gaze")
    gx = gtab["x"].to_numpy()[glo:ghi]
    gy = gtab["y"].to_numpy()[glo:ghi]
    gidx = key_indices(len(gx), KEYS)
    gaze = {
        "path": [[sig3(float(gx[i])), sig3(float(gy[i]))] for i in gidx],
        "extent": {"x": [sig3(float(gx.min())), sig3(float(gx.max()))],
                   "y": [sig3(float(gy.min())), sig3(float(gy.max()))]},
    }

    # pose — each rig's horizontal track, all three on one plane
    tracks: dict[str, np.ndarray] = {}
    samples: dict[str, np.ndarray] = {}
    rigs = pose_keys(base)
    for rig in ("head", "left", "right"):
        key = rigs.get(rig)
        if not key:
            continue
        tab, ts, lo, hi = windowed(f"observation.{key}")
        rows = np.column_stack([tab["x"].to_numpy()[lo:hi], tab["z"].to_numpy()[lo:hi]])
        dense_t = ts[lo:hi]
        target = start + np.arange(int(window * FPS)) / FPS
        dense = rows[nearest_index(dense_t, target)]
        samples[rig] = dense
        idx = key_indices(len(dense), KEYS)
        tracks[rig] = [[sig3(float(p[0])), sig3(float(p[1]))] for p in dense[idx]]
    # The September captures put the head tracker in a world frame metres away
    # from the wrist trackers, so the three could not share one plane as raw
    # coordinates. Each rig is re-based on its own median; travel — what the
    # panel states under each name — is unchanged by a translation.
    for rig in list(samples):
        samples[rig] = samples[rig] - np.median(samples[rig], axis=0, keepdims=True)
        idx = key_indices(len(samples[rig]), KEYS)
        tracks[rig] = [[sig3(float(p[0])), sig3(float(p[1]))] for p in samples[rig][idx]]
    xs = np.concatenate([t[:, 0] for t in samples.values()])
    zs = np.concatenate([t[:, 1] for t in samples.values()])
    pose = {"tracks": tracks,
            "extent": {"x": [sig3(float(xs.min())), sig3(float(xs.max()))],
                       "z": [sig3(float(zs.min())), sig3(float(zs.max()))]}}

    # glove — 50 nodes per key on the palm plane, both blocks mirrored alike
    htab, hts, hlo, hhi = windowed("observation.hand_skeleton")
    cols = [c for c in htab.column_names if c not in ("timestamp", "episode_index")]
    matrix = np.column_stack([htab[c].to_numpy() for c in cols])[hlo:hhi]
    positions = matrix.reshape(len(matrix), 50, 6)[:, :, :3]
    target = start + np.arange(int(window * FPS)) / FPS
    dense_idx = nearest_index(hts[hlo:hhi], target)
    dense_hand = positions[dense_idx]
    gidx = key_indices(len(dense_hand), GLOVE_KEYS)
    keys = [[[sig3(float(p[0])), sig3(float(p[1]) if k >= 25 else -float(p[1]))]
             for k, p in enumerate(dense_hand[i])] for i in gidx]
    px = np.array([[p[0] for p in key] for key in keys])
    py = np.array([[p[1] for p in key] for key in keys])
    side = max(float(px.max() - px.min()), float(py.max() - py.min()), 1e-6) * 1.12
    cx, cy = (px.max() + px.min()) / 2, (py.max() + py.min()) / 2
    glove = {"keys": keys,
             "view": f"{sig3(cx - side / 2):g} {sig3(cy - side / 2):g} {sig3(side):g} {sig3(side):g}"}

    # EMG / EEG — every channel, peak-preserving, one lane each
    def lanes_for(name: str, channels: list[str]) -> tuple[list[list[float]], float]:
        """One demeaned trace per channel, peak-preserving.

        The wrist bands and the EEG amplifier both carry a large constant offset
        per channel — the EMG lanes sit near -120 000 counts, the EEG lanes a few
        thousand — and that offset is not signal. Each lane has its own median
        removed, so what is drawn is the fluctuation; nothing else is filtered,
        normalised or clipped.
        """
        tab, ts, lo, hi = windowed(name)
        rows = np.column_stack([tab[c].to_numpy() for c in channels])[lo:hi].astype(float)
        rows = rows - np.median(rows, axis=0, keepdims=True)
        rate = float(1.0 / np.median(np.diff(ts[lo:hi])))
        return [decimate(rows[:, i]) for i in range(rows.shape[1])], rate

    emg_channels: list[str] = []
    emg_series: list[list[float]] = []
    emg_rate = 0.0
    for side, key in (("L", "observation.left_wrist_emg"), ("R", "observation.right_wrist_emg")):
        tab = stream(key)
        cols = [c for c in tab.column_names if c not in ("timestamp", "episode_index")]
        series, rate = lanes_for(key, cols)
        emg_channels += [f"{side}·{i + 1}" for i in range(len(cols))]
        emg_series += series
        emg_rate = rate

    etab = stream("observation.eeg")
    ecols = [c for c in etab.column_names if c not in ("timestamp", "episode_index")]
    # The capture carries up to 33 electrodes; the panel has room for eight. Take
    # the fronto-central set where the capture names it, then fill from the
    # electrodes it does ship, in the capture's own order.
    chosen = [c for c in EEG_PREFERRED if c in ecols]
    chosen += [c for c in ecols if c not in chosen][: max(0, 8 - len(chosen))]
    eeg_series, eeg_rate = lanes_for("observation.eeg", chosen)

    info = features(base)
    def native(key: str) -> float | None:
        declared = info.get(key, {}).get("fps")
        return round(float(declared), 1) if declared else None

    rates = {
        "gaze": {"nativeHz": native("observation.eye_gaze"), "releasedFps": FPS},
        "pose": {"nativeHz": native(f"observation.{rigs.get('head', 'head_pose')}"), "releasedFps": FPS},
        "glove": {"nativeHz": native("observation.hand_skeleton"), "releasedFps": FPS},
        "emg": {"nativeHz": None, "releasedFps": round(emg_rate)},
        "eeg": {"nativeHz": None, "releasedFps": round(eeg_rate)},
    }
    steps = parse_steps(base, samples)
    return {
        "id": take["id"], "seconds": window, "fps": FPS,
        "frames": int(window * FPS), "keys": KEYS, "gloveKeys": GLOVE_KEYS,
        "gaze": gaze, "pose": pose, "glove": glove,
        "emg": {"channels": emg_channels, "leftChannels": len(emg_channels) // 2,
                "rate": round(emg_rate), "unit": "native (undocumented)", "series": emg_series},
        "eeg": {"channels": chosen, "rate": round(eeg_rate),
                "unit": "native (undocumented)", "series": eeg_series},
        "rates": rates, "steps": steps,
        "streams": ["gaze", "pose", "glove", "emg", "eeg"],
    }


def build_reel_l2(take: dict) -> dict:
    base = MATERIAL / take["dir"]
    start = take["window"]["start"]
    window = take["window"]["seconds"]

    frames = np.load(base / "cam_ros_left/cam_ros_left.npz", allow_pickle=True)
    t0 = float(frames["frames_timestamps"][0]) + start       # the clip's clock, absolute

    channels: list[str] = []
    series: list[list[float]] = []
    rate = 0.0
    for side, name in (("L", "emg_left"), ("R", "emg_right")):
        npz = np.load(base / f"{name}/{name}.npz", allow_pickle=True)
        ts = npz["emg_timestamps"].astype(float)
        data = npz["emg_data"].astype(float)
        lo, hi = np.searchsorted(ts, [t0, t0 + window])
        part = data[lo:hi]
        if len(part) < 8:
            part = data[:8]
        part = part - np.median(part, axis=0, keepdims=True)
        rate = float(1.0 / np.median(np.diff(ts[max(0, lo - 1):hi]))) if hi - lo > 2 else 2000.0
        channels += [f"{side}·{i + 1}" for i in range(part.shape[1])]
        series += [decimate(part[:, i]) for i in range(part.shape[1])]

    return {
        "id": take["id"], "seconds": window, "fps": FPS,
        "frames": int(window * FPS), "keys": 0, "gloveKeys": 0,
        "emg": {"channels": channels, "leftChannels": len(channels) // 2,
                "rate": round(rate), "unit": "native (undocumented)", "series": series},
        "rates": {"emg": {"nativeHz": None, "releasedFps": round(rate)}},
        "steps": [], "streams": ["emg"],
    }


def build_reel_l1(take: dict) -> dict:
    return {
        "id": take["id"], "seconds": take["window"]["seconds"], "fps": FPS,
        "frames": int(take["window"]["seconds"] * FPS), "keys": 0, "gloveKeys": 0,
        "rates": {}, "steps": [], "streams": [],
    }


BUILDERS = {"L3": build_reel_l3, "L2": build_reel_l2, "L1": build_reel_l1}


# --------------------------------------------------------------------------
# TypeScript metadata
# --------------------------------------------------------------------------

def write_ts(takes: list[dict]) -> None:
    rows = []
    for take in takes:
        views = ", ".join(
            f'{key}: "cover/{take["tier"]}/{take["id"]}/{key}.mp4"'
            for key in ("left", "right", "bleft", "bright", "wleft", "wright")
            if key in take["window"]["views"]
        )
        row = f"""  {{
    id: {json.dumps(take["id"])},
    tier: {json.dumps(take["tier"])},
    title: {{ en: {json.dumps(take["title"][0], ensure_ascii=False)}, zh: {json.dumps(take["title"][1], ensure_ascii=False)} }},
    scene: {{ en: {json.dumps(take["scene"][0], ensure_ascii=False)}, zh: {json.dumps(take["scene"][1], ensure_ascii=False)} }},
    task: {{ en: {json.dumps(take["task"][0], ensure_ascii=False)}, zh: {json.dumps(take["task"][1], ensure_ascii=False)} }},
    poster: "cover/{take["tier"]}/{take["id"]}/poster.jpg",
    preview: "cover/{take["tier"]}/{take["id"]}/preview.mp4",
    views: {{ {views} }},
    seconds: {take["window"]["seconds"]:g},
    frames: {int(take["window"]["seconds"] * FPS)},
    fps: {FPS},
    markFrame: {int(round(0.58 * (take["window"]["seconds"] * FPS - 1)))},
  }},"""
        rows.append(row)

    TS.write_text(f"""/**
 * The cover's takes, one row per acquisition tier.
 *
 * Generated by ``scripts/build_cover_tiers.py`` from the captures under
 * ``/home/baai/Projects/Paper-Drafts/素材``. Each entry names the reduced clips
 * this build wrote under ``public/real/cover/<tier>/<id>/`` — 640 px wide,
 * 12 s, no audio — plus the card's 6 s preview and its poster frame. The
 * reduced channel payload is fetched separately from ``data/reels/<id>.json``.
 *
 * Do not edit by hand: rerun the script, which re-encodes the window this file
 * describes.
 */
export type CoverTier = 'L3' | 'L2' | 'L1'

export interface CoverTakeViews {{
  left: string
  right: string
  bleft: string
  bright: string
  wleft?: string
  wright?: string
}}

export interface CoverTakeEntry {{
  id: string
  tier: CoverTier
  title: {{ en: string; zh: string }}
  scene: {{ en: string; zh: string }}
  task: {{ en: string; zh: string }}
  poster: string
  preview: string
  views: CoverTakeViews
  seconds: number
  frames: number
  fps: number
  markFrame: number
}}

export const COVER_TAKES: CoverTakeEntry[] = [
{chr(10).join(rows)}
]
""")
    log(f"wrote {TS} ({len(takes)} takes)")


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--tier", action="append", choices=["L3", "L2", "L1"])
    ap.add_argument("--only", action="append", default=[])
    ap.add_argument("--media", action="store_true")
    ap.add_argument("--reels", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=3)
    args = ap.parse_args()

    chosen = [t for t in TAKES
              if (not args.tier or t["tier"] in args.tier)
              and (not args.only or t["id"] in args.only)]
    if not chosen:
        ap.error("no takes selected")

    todo_media = args.all or args.media
    todo_reels = args.all or args.reels

    if todo_media:
        log(f"media: {len(chosen)} takes, {args.jobs} parallel")
        with ThreadPoolExecutor(max_workers=args.jobs) as pool:
            windows = list(pool.map(lambda t: build_media(t, args.force), chosen))
        for take, window in zip(chosen, windows):
            take["window"] = window
            total = sum(p.stat().st_size for p in (OUT / take["tier"] / take["id"]).iterdir())
            log(f"  {take['tier']} {take['id']}: window {window['start']:g}+{window['seconds']:g}s, "
                f"{len(window['views'])} views, {total / 1024:.0f} KB")

    for take in chosen:
        if "window" not in take:
            take["window"] = window_for(take)

    if todo_reels:
        REELS.mkdir(parents=True, exist_ok=True)
        for take in chosen:
            payload = BUILDERS[take["tier"]](take)
            path = REELS / f"{take['id']}.json"
            path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
            log(f"  reel {take['tier']} {take['id']}: {path.stat().st_size / 1024:.0f} KB, "
                f"{len(payload.get('streams', []))} streams, {len(payload['steps'])} steps")

    if args.all:
        write_ts(chosen)


if __name__ == "__main__":
    sys.exit(main())
