#!/usr/bin/env python3
"""Depth and eye assets for the viewer.

Depth arrives as 12-bit HEVC millimetres with scale 0.5 (so `raw * 0.5 mm`).
This writes two videos and a JSON: a grey 8-bit depth video normalised to the
episode's own working range for the point-cloud reconstruction, a turbo
pseudo-colour copy for display, and the range plus the rectified intrinsics the
cloud unprojects with. The eye camera is transcoded for the gaze window.
"""
from __future__ import annotations
import json, subprocess
from pathlib import Path
import numpy as np

SRC = Path('.tmp-cmp/ep2')
OUT = Path('public/real/episode')
W, H = 640, 396
NEAR, FAR = 0.18, 0.80  # metres; the episode's valid depth spans ~0.20–0.66 m
SCALE = 0.5  # millimetres per raw unit


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    depth_src = SRC / 'depth/episode_000000.mp4'
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(depth_src),
                            '-vf', f'scale={W}:{H}', '-pix_fmt', 'gray16le',
                            '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray',
                            '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-an',
                            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
                            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / 'main-depth-gray.mp4')],
                           stdin=subprocess.PIPE)
    frame_bytes = W * H * 2
    n = 0
    lo, hi = 0, 0
    while True:
        buf = dec.stdout.read(frame_bytes)
        if len(buf) < frame_bytes:
            break
        a = np.frombuffer(buf, dtype=np.uint16).astype(np.float32) / 16.0  # 12-bit raw
        m = a * SCALE / 1000.0  # metres
        grey = np.clip((m - NEAR) / (FAR - NEAR), 0, 1) * 255
        grey[a <= 0] = 0
        enc.stdin.write(grey.astype(np.uint8).tobytes())
        n += 1
    dec.stdout.close(); dec.wait()
    enc.stdin.close(); enc.wait()
    print('depth frames', n)

    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'main-depth-gray.mp4'),
                    '-vf', 'pseudocolor=preset=turbo', '-an', '-c:v', 'libx264', '-preset', 'veryfast',
                    '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                    str(OUT / 'main-depth.mp4')], check=True)

    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SRC / 'eye/episode_000000.mp4'),
                    '-an', '-vf', 'scale=640:480,setsar=1', '-r', '30', '-c:v', 'libx264',
                    '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(OUT / 'main-eye.mp4')], check=True)

    meta = json.loads((SRC / 'depth-meta/episode_000000_meta.json').read_text())
    intr = meta['intrinsics']['left']
    (OUT / 'depth.json').write_text(json.dumps(dict(
        nearM=NEAR, farM=FAR, invalid=0,
        intrinsics=dict(fx=intr['fx'], fy=intr['fy'], cx=intr['cx'], cy=intr['cy'],
                        width=1920, height=1184),
        video='episode/main-depth-gray.mp4',
        source='annotation/.../lerobot_depth.json: scale 0.5, unit mm',
    ), indent=1))
    print('done', {p.name: p.stat().st_size for p in OUT.glob('*depth*')})


if __name__ == '__main__':
    main()
