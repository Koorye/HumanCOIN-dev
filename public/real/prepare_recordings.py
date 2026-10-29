#!/usr/bin/env python3
"""Build and verify all preview recording bundles, preserving original assets.

Run with python3 prepare_recordings.py; --verify-only checks existing bundles.
Index directories are relative to v2-assets/ (the real-viewer.js directory).
All filenames within each index entry are relative to that entry's directory.
Recordings run sequentially because prepare_real uses module globals.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

import numpy as np
import prepare_real as module

BASE = Path(__file__).resolve().parent
CAMERAS = ('left', 'right', 'bleft', 'bright')
VIDEOS = {camera: f'main-headband-{camera}.mp4' for camera in CAMERAS}


def load(path):
    return json.loads(path.read_text(), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))


def dump(path, value):
    path.write_text(json.dumps(module.safe(value), ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def annotations(rec):
    notes = module.load_lines(rec / 'meta/collect_info.jsonl')[0]['notes']
    return dict(steps=[line.strip() for line in notes.splitlines() if re.match(r'^\s*\d+[.、．)]', line)],
                source='meta/collect_info.jsonl:notes', timing=None)


def preserved_hashes():
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in BASE.iterdir()
            if p.is_file() and p.name not in {'prepare_recordings.py', 'recordings-index.json', 'annotations.json', 'prepare-recordings.log'}}


def build():
    originals = preserved_hashes()
    previews = load(BASE / 'media-previews.json')
    entries = []
    for number, preview in enumerate(previews):
        rec = module.ROOT / preview['id']
        original = rec.name == module.RECS[0].name
        out = BASE if original else BASE / 'recordings' / rec.name
        out.mkdir(parents=True, exist_ok=True)
        module.MAIN, module.OUT = rec, out
        if original:
            assert load(out / 'sample.json')['recordingId'] == rec.name
            manifest_name = 'headband-manifest.json'
        else:
            print(f'[{number + 1}/8] samples {rec.name}', flush=True)
            metadata = module.samples()
            sample = load(out / 'sample.json')
            for waveform in sample['waveforms'].values():
                waveform['sourcePath'] = str(rec / 'data/chunk-000/episode_000000' / (waveform['source'] + '.parquet'))
            module.dump('sample.json', sample)
            records = []
            for camera, filename in VIDEOS.items():
                print(f'[{number + 1}/8] video {camera} {rec.name}', flush=True)
                records.append(module.aligned_video('observation.images.headband_' + camera + '_rgb', filename))
            manifest_name = 'manifest.json'
            qc = module.load_lines(rec / 'meta/qc_reports.jsonl')[0]
            manifest = dict(schemaVersion='1.0', recordingId=rec.name, taskTitle=sample['taskTitle'],
                            sourcePath=str(rec), sample='sample.json', annotations='annotations.json',
                            duration=16, fps=30, clipStart=3, clipEnd=19, mainVideos=records,
                            metadata=metadata, qc=dict(source=str(rec / 'meta/qc_reports.jsonl'), level=qc['level']),
                            note='Nearest per-camera timestamps; cross-device hardware synchronization accuracy unverified.')
            dump(out / manifest_name, manifest)
        dump(out / 'annotations.json', annotations(rec))
        thumbnail = Path(preview['poster']).name
        assert (BASE / thumbnail).is_file()
        entries.append(dict(id=rec.name, title=preview['title'], titleEn=preview['titleEn'],
                            directory='./real/' if original else f'./real/recordings/{rec.name}/',
                            sample='sample.json', manifest=manifest_name, videos=VIDEOS.copy(),
                            thumbnail=thumbnail if original else f'../../{thumbnail}',
                            annotations='annotations.json', duration=16, fps=30, clipStart=3, clipEnd=19))
        print(f'[{number + 1}/8] bundle complete {rec.name}', flush=True)
    assert originals == preserved_hashes(), 'An original asset changed'
    dump(BASE / 'recordings-index.json', dict(schemaVersion='1.0', recordings=entries))


def verify():
    index = load(BASE / 'recordings-index.json')
    previews = load(BASE / 'media-previews.json')
    assert [entry['id'] for entry in index['recordings']] == [entry['id'] for entry in previews]
    count = 0
    max_delta = 0.0
    for entry in index['recordings']:
        out = (BASE.parent / entry['directory']).resolve()
        assert out.is_relative_to(BASE)
        sample = load(out / entry['sample'])
        manifest = load(out / entry['manifest'])
        assert sample['recordingId'] == manifest['recordingId'] == entry['id']
        assert sample['duration'] == entry['duration'] == 16 and sample['clipStart'] == 3
        assert sample['fps'] == 30 and len(sample['frames']) == 480
        rec = module.ROOT / entry['id']
        assert load(out / entry['annotations']) == annotations(rec)
        assert (out / entry['thumbnail']).is_file()
        assert len(manifest['mainVideos']) == 4
        targets = 3 + np.arange(480) / 30
        for camera, video in zip(CAMERAS, manifest['mainVideos']):
            assert video['file'] == entry['videos'][camera]
            assert video['recordingId'] == entry['id']
            assert video['clipStart'] == 3 and video['clipEnd'] == 19
            ts = module.table(rec, video['stream'])['timestamp'].to_numpy()
            indices = module.nearest(ts, targets)
            np.testing.assert_array_equal(indices, video['sourceFrameIndices'])
            np.testing.assert_allclose(ts[indices], video['sourceTimestamps'], atol=0.00000051, rtol=0)
            info = module.probe(out / video['file'])
            assert float(info['duration']) == 16 and int(info['nb_frames']) == 480
            assert info['codec_name'] == 'h264' and info['r_frame_rate'] == '30/1'
            subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-threads', '2', '-i',
                            str(out / video['file']), '-f', 'null', '-'], check=True)
            max_delta = max(max_delta, video['maxAbsDeltaSeconds'])
            count += 1
        for label, source in sample['metadata']['sources'].items():
            assert Path(source['sourcePath']).is_relative_to(rec)
            ts = module.table(rec, source['source'])['timestamp'].to_numpy()
            indices = module.nearest(ts, targets)
            np.testing.assert_allclose([frame['sync'][label]['sourceTimestamp'] for frame in sample['frames']],
                                       ts[indices], atol=0.000000001, rtol=0)
        for name, waveform in sample['waveforms'].items():
            tab = module.table(rec, waveform['source'])
            ts = tab['timestamp'].to_numpy()
            data = np.column_stack([tab[channel].to_numpy() for channel in waveform['channels']])
            assert waveform['sampleRate'] == 100
            assert len(waveform['values']) == len(waveform['sampleCounts']) == len(waveform['timestamps']) == 1600
            for i in range(1600):
                lo = 3 + i / 100
                mask = (ts >= lo) & (ts < lo + .01)
                assert waveform['sampleCounts'][i] == int(mask.sum())
                expected = module.safe(module.clean(np.mean(data[mask], axis=0), 3)) if mask.any() else [None] * len(waveform['channels'])
                assert waveform['values'][i] == expected, (entry['id'], name, i)
        for path in out.glob('*.json'):
            load(path)
        print(f'verified {entry["id"]}: 4 decoded videos, 480 frames, all waveform bins match source', flush=True)
    print(f'PASS: 8 bundles, {count} decoded 16-second videos; maximum camera alignment delta {max_delta:.9f}s', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    if not args.verify_only:
        build()
    verify()
