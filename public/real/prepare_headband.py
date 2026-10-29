#!/usr/bin/env python3
"""Prepare four authorized headband streams on the existing 3–19s timeline."""
import json
from prepare_real import aligned_video, OUT

streams = [('left','main-headband-left.mp4'),('right','main-headband-right.mp4'),('bleft','main-headband-bleft.mp4'),('bright','main-headband-bright.mp4')]
if __name__ == '__main__':
    records = []
    for camera, filename in streams:
        records.append(aligned_video('observation.images.headband_'+camera+'_rgb', filename))
        print(filename, flush=True)
    (OUT/'headband-manifest.json').write_text(json.dumps({'recordingId':'L3-001-2026-10-27-13-28-54','mainVideos':records,'note':'Nearest per-camera timestamps; cross-device hardware synchronization accuracy unverified.'},ensure_ascii=False,indent=2))
