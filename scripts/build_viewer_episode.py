#!/usr/bin/env python3
"""Build the single viewer episode from the processed LeRobot release.

Source: the processed episode ``L3-001-2026-10-27-17-09-50`` (synced, rectified,
annotated). This script reduces it to what the browser viewer reads: a 30 fps
sample table, 100 Hz preview waveforms, the annotated subtask segments, and
640 px clips for the four headband views, two wrist views, the third-person
camera and the reconstructed depth map. Nothing is invented: every frame is the
nearest sample of the stream's own timeline, and every step is the annotator's
own text.
"""
from __future__ import annotations
import json, math, subprocess
from pathlib import Path
import numpy as np
import pyarrow.parquet as pq

EP = Path('.tmp-cmp/episode')
OUT = Path('public/real/episode')
ID = 'L3-001-2026-10-27-17-09-50'
FPS = 30
DURATION = 17.4
N = int(round(DURATION * FPS))
DATA = EP / 'data/chunk-000/episode_000000'
INFO = json.loads((EP / 'meta/info.json').read_text())


def clean(a, digits=6):
    a = np.asarray(a, dtype=np.float64)
    return np.where(np.isfinite(a), np.round(a, digits), None).tolist()


def quat(euler):
    r, p, y = np.deg2rad(euler) / 2
    cr, sr, cp, sp, cy, sy = np.cos(r), np.sin(r), np.cos(p), np.sin(p), np.cos(y), np.sin(y)
    return clean([sr*cp*cy - cr*sp*sy, cr*sp*cy + sr*cp*sy, cr*cp*sy - sr*sp*cy, cr*cp*cy + sr*sp*sy])


def table(key):
    return pq.read_table(DATA / f'{key}.parquet')


def nearest(ts, target):
    i = np.searchsorted(ts, target).clip(1, len(ts) - 1)
    return np.where(np.abs(ts[i-1] - target) <= np.abs(ts[i] - target), i-1, i)


def run(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)


def encode(src, dest, w, h, crf=28, vf=''):
    filt = f'scale={w}:{h},setsar=1' if not vf else f'{vf},scale={w}:{h},setsar=1'
    run('-i', src, '-an', '-vf', filt, '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast',
        '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', dest)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    targets = np.arange(N) / FPS

    labels = {
        'head': 'observation.head_pose',
        'left': 'observation.left_wrist_pose',
        'right': 'observation.right_wrist_pose',
        'skeleton': 'observation.hand_skeleton',
        'gaze': 'observation.eye_gaze',
    }
    frames = [dict(timestamp=round(i / FPS, 6), poses={}, sync={}) for i in range(N)]
    sources = {}
    for label, key in labels.items():
        t = table(key)
        ts = t['timestamp'].to_numpy()
        cols = [c for c in t.column_names if c not in ('timestamp', 'episode_index')]
        a = np.column_stack([t[c].to_numpy() for c in cols])
        idx = nearest(ts, targets)
        sources[label] = dict(source=key, columns=cols,
                              nativeRateHz=INFO['features'][key].get('fps'),
                              maxAbsDeltaSeconds=round(float(np.max(np.abs(ts[idx] - targets))), 9))
        for j, i in enumerate(idx):
            v = a[i]
            frames[j]['sync'][label] = {'sourceTimestamp': round(float(ts[i]), 9),
                                        'deltaSeconds': round(float(ts[i] - targets[j]), 9)}
            if label in ('head', 'left', 'right'):
                frames[j]['poses'][label] = dict(position=clean(v[:3]), euler=clean(v[3:]),
                                                 quaternion=quat(v[3:]))
            elif label == 'skeleton':
                nodes = v.reshape(50, 6)
                frames[j]['skeleton'] = dict(positions=clean(nodes[:, :3]), euler=clean(nodes[:, 3:]))
            else:
                frames[j]['gaze'] = {'xy': clean(v), 'sourceTimestamp': round(float(ts[i]), 9),
                                     'deltaSeconds': round(float(ts[i] - targets[j]), 9)}
        print('frames', label, flush=True)

    # ---- 100 Hz preview waveforms ----
    eeg_ch = ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4']
    waveforms = {}
    for name, key, ch in (('eeg', 'observation.eeg', eeg_ch),
                          ('leftEmg', 'observation.left_wrist_emg', [f'dim_{i}' for i in range(8)]),
                          ('rightEmg', 'observation.right_wrist_emg', [f'dim_{i}' for i in range(8)])):
        t = table(key)
        ts = t['timestamp'].to_numpy()
        data = np.column_stack([t[c].to_numpy() for c in ch]).astype(float)
        vals, counts, times = [], [], []
        for i in range(int(DURATION * 100)):
            lo, hi = i / 100, (i + 1) / 100
            mask = (ts >= lo) & (ts < hi)
            counts.append(int(mask.sum()))
            times.append(round((lo + hi) / 2, 6))
            vals.append(clean(np.mean(data[mask], axis=0), 3) if mask.any() else [None] * len(ch))
        waveforms[name] = dict(
            source=key, channels=ch, unit='native (undocumented)', sampleRate=100,
            nativeRateHz=INFO['features'][key].get('fps'),
            method='arithmetic mean in non-overlapping 10 ms bins; viewer preview only',
            timestamps=times, values=vals, sampleCounts=counts,
        )
        print('waveform', name, flush=True)

    metadata = dict(
        timeUnit='seconds',
        positionUnit='millimetres (capture frame)',
        eulerUnit='degrees',
        quaternion=dict(order='xyzw', status='derived', convention='Rz(yaw) Ry(pitch) Rx(roll)'),
        poseFrame='shared capture frame: −y desk, +x left, +z up',
        skeletonFrame='glove-local coordinates; not fused to the capture frame',
        skeletonNodeIds=[f'node{i:02d}' for i in range(50)],
        skeletonGroups=[dict(nodeIds=list(range(25)), side='undocumented'),
                        dict(nodeIds=list(range(25, 50)), side='undocumented')],
        skeletonTopology='not declared; links follow node index order',
        gazeUnit='eye-camera pixels',
        alignment='episode-relative timestamps; nearest sample for poses, skeleton and gaze',
        sources=sources,
    )
    sample = dict(schemaVersion='1.0', recordingId=ID, taskTitle='把糖按口味分开',
                  duration=DURATION, fps=FPS, clipStart=0.0, metadata=metadata,
                  frames=frames, waveforms=waveforms)
    (OUT / 'sample.json').write_text(json.dumps(sample, ensure_ascii=False, separators=(',', ':')))

    # ---- annotation: subtask segments carry their own timings ----
    ann = json.loads((EP / 'annotation/episode_000000_structured.json').read_text())
    info = json.loads((EP / 'meta/collect_info.jsonl').read_text().splitlines()[0])
    subs = ann.get('subtask') or []
    obj_names = [o['name'] for o in ann.get('objects') or []]
    steps, segments = [], []
    for i, s in enumerate(subs):
        text = s.get('text') or s.get('notes') or ''
        mentions = [n for n in obj_names if n.lower() in text.lower()]
        steps.append(dict(index=i, text=text, mentions=mentions, groups=[]))
        segments.append(dict(start=round(float(s['start_s']), 3), end=round(float(s['end_s']), 3)))
    steps_ts = [s['text'] for s in steps]
    (OUT / 'annotations.json').write_text(json.dumps(
        dict(steps=steps_ts, source='annotation/episode_000000_structured.json#subtask',
             timing=dict(segments=segments, source='annotator')), ensure_ascii=False, indent=1))

    # ---- objects: the annotator's own list, with what it recorded ----
    objects = []
    for o in ann.get('objects') or []:
        a = o.get('attributes') or {}
        objects.append(dict(name=o['name'], id=None, color=None, shape=None,
                            material=a.get('material'), dims={}, weightG=None,
                            table={'x': None, 'y': None, 'angle': None}))
    episode_objects = dict(scene=info.get('scene') or ann.get('scene'), task=info.get('task_name'),
                           objects=objects, steps=steps)
    objs_path = Path('public/data/objects.json')
    allobjs = json.loads(objs_path.read_text()) if objs_path.exists() else {}
    allobjs = {ID: episode_objects}
    objs_path.write_text(json.dumps(allobjs, ensure_ascii=False, separators=(',', ':')))

    # ---- media ----
    vids = EP / 'videos/chunk-000'
    head = {'left': 'observation.images.headband_left_rgb', 'right': 'observation.images.headband_right_rgb',
            'bleft': 'observation.images.headband_bleft_rgb', 'bright': 'observation.images.headband_bright_rgb'}
    for k, key in head.items():
        encode(vids / key / 'episode_000000.mp4', OUT / f'main-headband-{k}.mp4', 640, 400, 28)
    for k, key in (('left', 'observation.images.left_wrist_rgb'), ('right', 'observation.images.right_wrist_rgb')):
        encode(vids / key / 'episode_000000.mp4', OUT / f'main-wrist-{k}.mp4', 640, 480, 26)
    encode(vids / 'observation.images.third_rgb/episode_000000.mp4', OUT / 'main-third.mp4', 640, 480, 26)
    encode(vids / 'observation.images.depth_headband_left_rectified/episode_000000.mp4',
           OUT / 'main-depth.mp4', 640, 396, 26, vf='format=gray,normalize=blackpt=black:whitept=white')

    run('-ss', '1', '-i', OUT / 'main-headband-left.mp4', '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', OUT / 'poster.jpg')
    run('-ss', '1', '-i', OUT / 'main-headband-left.mp4', '-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '5', OUT / 'thumb.jpg')
    run('-t', '12', '-i', OUT / 'main-headband-left.mp4', '-vf', 'scale=240:150', '-an', '-c:v', 'libx264',
        '-preset', 'veryfast', '-crf', '33', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT / 'preview.mp4')

    print('done', {p.name: p.stat().st_size for p in OUT.iterdir() if p.is_file()})


if __name__ == '__main__':
    main()
