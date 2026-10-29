#!/usr/bin/env python3
"""Prepare both wrist-camera streams for every released take.

Same construction as the headband streams in ``prepare_headband.py``: each
wrist camera's own parquet timestamps are matched by nearest neighbour to the
shared 30 fps 3–19 s target grid, so the two near-hand views sit on the same
clock as the four head-mounted views. The per-camera nearest-neighbour deltas
are recorded in ``wrist-manifest.json``; no cross-device synchronization is
claimed.
"""
import json
import subprocess

import numpy as np
import pyarrow.parquet as pq

from prepare_real import IDS, OUT, ROOT, clean, dump, nearest, probe

FPS = 30
START, DURATION = 3.0, 16.0
FIELDS = ["codec_name", "width", "height", "r_frame_rate", "nb_frames", "duration", "pix_fmt"]


def aligned_wrist(rec, camera, out_dir):
    """Cut one wrist camera to the shared timeline and return its provenance."""
    key = "observation.images." + camera + "_wrist_rgb"
    filename = "main-wrist-" + camera + ".mp4"
    src = rec / "videos/chunk-000" / key / "episode_000000.mp4"
    info = probe(src)
    ts = pq.read_table(rec / "data/chunk-000/episode_000000" / (key + ".parquet"))["timestamp"].to_numpy()
    assert int(info["nb_frames"]) == len(ts), (key, info, len(ts))
    targets = START + np.arange(int(DURATION * FPS)) / FPS
    indices = nearest(ts, targets)
    h = round(int(info["height"]) * 640 / int(info["width"]) / 2) * 2
    dest = out_dir / filename
    dec = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-threads", "2", "-i", str(src),
         "-vf", f"scale=640:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"640x{h}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
         "-threads", "2", "-preset", "fast", "-crf", "25", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", str(dest)],
        stdin=subprocess.PIPE)
    wanted = 0
    try:
        for ix in range(len(ts)):
            frame = dec.stdout.read(640 * h * 3)
            if len(frame) != 640 * h * 3:
                raise RuntimeError("truncated decode")
            while wanted < len(indices) and indices[wanted] == ix:
                enc.stdin.write(frame)
                wanted += 1
            if wanted == len(indices):
                break
    finally:
        dec.stdout.close()
        dec.terminate()
        dec.wait()
        enc.stdin.close()
    assert enc.wait() == 0 and wanted == 480, (dest, wanted)
    return dict(
        file=filename,
        recordingId=rec.name,
        stream=key,
        sourcePath=str(src),
        clipStart=START,
        clipEnd=START + DURATION,
        alignment="nearest camera parquet timestamp per 30fps target; source frame index maps 1:1 to camera parquet row",
        sourceFrameIndices=indices.tolist(),
        sourceTimestamps=clean(ts[indices]),
        deltaSeconds=clean(ts[indices] - targets),
        maxAbsDeltaSeconds=float(max(abs(ts[indices] - targets))),
        probe={k: v for k, v in probe(dest).items() if k in FIELDS},
    )


def main():
    records = []
    for take in IDS:
        rec = ROOT / ("L3-001-2026-10-27-" + take)
        # The first take's streams live at the top of ``real/``; the rest keep
        # theirs beside the take, matching where their headband views sit.
        out_dir = OUT if rec == ROOT / ("L3-001-2026-10-27-" + IDS[0]) else OUT / "recordings" / rec.name
        out_dir.mkdir(parents=True, exist_ok=True)
        for camera in ("left", "right"):
            records.append(aligned_wrist(rec, camera, out_dir))
            print(rec.name, camera, flush=True)
    dump("wrist-manifest.json", {
        "note": "Near-hand views cut to the same 30fps 3-19s grid as the headband streams. "
                "Nearest per-camera timestamps; cross-device hardware synchronization accuracy unverified.",
        "streams": records,
    })


if __name__ == "__main__":
    main()
