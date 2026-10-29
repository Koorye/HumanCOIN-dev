#!/usr/bin/env python3
"""Build local demo assets from authorized L3 data; no network operations."""
import json, math, subprocess, tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import pyarrow.parquet as pq

OUT = Path(__file__).resolve().parent
ROOT = Path('/home/baai/ks3')
IDS = ['13-28-54','13-30-47','13-33-02','13-38-41','13-42-02','13-47-37','13-53-30','13-54-34']
RECS = [ROOT / ('L3-001-2026-10-27-' + t) for t in IDS]
MAIN = RECS[0]
START, DURATION, FPS = 3., 16., 30

def dump(name, data):
    (OUT/name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False))
def load(path): return json.loads(path.read_text())
def table(rec, key): return pq.read_table(rec/'data/chunk-000/episode_000000'/(key+'.parquet'))
def video(rec, key): return rec/'videos/chunk-000'/key/'episode_000000.mp4'
def run(args): subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y']+list(map(str,args)),check=True)
def probe(path): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_frames,duration,pix_fmt','-of','json',str(path)]))['streams'][0]
def nearest(ts, target):
    i=np.searchsorted(ts,target).clip(1,len(ts)-1)
    return np.where(abs(ts[i-1]-target)<=abs(ts[i]-target),i-1,i)
def clean(a, digits=6):
    a=np.asarray(a,dtype=np.float64); return np.where(np.isfinite(a),np.round(a,digits),np.nan).tolist()
def safe(obj):
    if isinstance(obj,float) and not math.isfinite(obj): return None
    if isinstance(obj,list): return [safe(x) for x in obj]
    if isinstance(obj,dict): return {k:safe(v) for k,v in obj.items()}
    return obj

def aligned_video(key, filename):
    src=video(MAIN,key); info=probe(src)
    ts=table(MAIN,key)['timestamp'].to_numpy()
    assert int(info['nb_frames'])==len(ts), (key,info,len(ts))
    targets=START+np.arange(int(DURATION*FPS))/FPS
    indices=nearest(ts,targets)
    h=round(int(info['height'])*640/int(info['width'])/2)*2
    dec=subprocess.Popen(['ffmpeg','-v','error','-threads','2','-i',str(src),'-vf',f'scale=640:{h}','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
    enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'640x{h}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/filename)],stdin=subprocess.PIPE)
    wanted=0
    try:
        for ix in range(len(ts)):
            frame=dec.stdout.read(640*h*3)
            if len(frame)!=640*h*3: raise RuntimeError('truncated decode')
            while wanted<len(indices) and indices[wanted]==ix:
                enc.stdin.write(frame); wanted+=1
            if wanted==len(indices): break
    finally:
        dec.stdout.close(); dec.terminate(); dec.wait(); enc.stdin.close()
    assert enc.wait()==0 and wanted==480
    return dict(file=filename,recordingId=MAIN.name,stream=key,sourcePath=str(src),clipStart=START,clipEnd=START+DURATION,alignment='nearest camera parquet timestamp per 30fps target; source frame index maps 1:1 to camera parquet row',sourceFrameIndices=indices.tolist(),sourceTimestamps=clean(ts[indices]),deltaSeconds=clean(ts[indices]-targets),maxAbsDeltaSeconds=float(max(abs(ts[indices]-targets))),probe=probe(OUT/filename))

def quat(euler):
    # Derived only: Rz(yaw) Ry(pitch) Rx(roll), degree input, xyzw output.
    r,p,y=np.deg2rad(euler)/2; cr,sr=np.cos(r),np.sin(r); cp,sp=np.cos(p),np.sin(p); cy,sy=np.cos(y),np.sin(y)
    return clean([sr*cp*cy-cr*sp*sy,cr*sp*cy+sr*cp*sy,cr*cp*sy-sr*sp*cy,cr*cp*cy+sr*sp*sy])

def samples():
    targets=START+np.arange(480)/FPS
    sources={}; frames=[dict(timestamp=round(i/FPS,6),sourceTimestamp=round(float(t),6),poses={},sync={}) for i,t in enumerate(targets)]
    for label in ['head','left','right','skeleton','gaze']:
        key={'head':'head_pose','left':'left_wrist_pose','right':'right_wrist_pose','skeleton':'hand_skeleton','gaze':'eye_gaze'}[label]
        full='observation.'+key; tab=table(MAIN,full); ts=tab['timestamp'].to_numpy(); cols=[c for c in tab.column_names if c not in ['timestamp','episode_index']]
        a=np.column_stack([tab[c].to_numpy() for c in cols]); idx=nearest(ts,targets)
        sources[label]=dict(source=full,sourcePath=str(MAIN/'data/chunk-000/episode_000000'/(full+'.parquet')),columns=cols,nativeRateHz=load(MAIN/'meta/info.json')['features'][full]['fps'],maxAbsDeltaSeconds=float(max(abs(ts[idx]-targets))))
        for j,i in enumerate(idx):
            values=a[i]; stamp=round(float(ts[i]),9); delta=round(float(ts[i]-targets[j]),9)
            frames[j]['sync'][label]={'sourceTimestamp':stamp,'deltaSeconds':delta}
            if label in ['head','left','right']:
                frames[j]['poses'][label]=dict(position=clean(values[:3]),euler=clean(values[3:]),quaternion=quat(values[3:]))
            elif label=='skeleton':
                nodes=values.reshape(50,6); frames[j]['skeleton']=dict(positions=clean(nodes[:,:3]),euler=clean(nodes[:,3:]))
            else: frames[j]['gaze']=dict(xy=clean(values),sourceTimestamp=stamp,deltaSeconds=delta)
    waveforms={}
    for name,key,ch in [('eeg','eeg',['Fp1','Fp2','F3','F4','C3','C4','P3','P4']),('leftEmg','left_wrist_emg',[f'dim_{i}' for i in range(8)]),('rightEmg','right_wrist_emg',[f'dim_{i}' for i in range(8)])]:
        full='observation.'+key; tab=table(MAIN,full); ts=tab['timestamp'].to_numpy(); data=np.column_stack([tab[c].to_numpy() for c in ch]); vals=[]; counts=[]; times=[]
        for i in range(1600):
            lo=START+i/100; hi=lo+.01; mask=(ts>=lo)&(ts<hi); counts.append(int(mask.sum())); times.append(round((lo+hi)/2-START,6)); vals.append(clean(np.mean(data[mask],axis=0),3) if mask.any() else [None]*len(ch))
        waveforms[name]=dict(source=full,channels=ch,unit='native (undocumented)',sampleRate=100,nativeRateHz=load(MAIN/'meta/info.json')['features'][full]['fps'],method='arithmetic mean in non-overlapping 10ms episode-time bins; visualization only, not clinical analysis',timestamps=times,values=vals,sampleCounts=counts,appliedOffsetSeconds=0)
    metadata=dict(timeUnit='seconds',positionUnit='native (undocumented; no scaling applied)',eulerUnit='native angle (degree interpretation inferred from values; not declared by metadata)',quaternion=dict(order='xyzw',status='derived_assumption',convention='Rz(yaw) Ry(pitch) Rx(roll), degrees; not calibrated or source-native'),poseFrame='native HTC VIVE tracking frame; axes/origin undocumented',skeletonFrame='native glove coordinates; node00 and node25 are zero roots, separate from VIVE world; not fused',skeletonNodeIds=[f'node{i:02d}' for i in range(50)],skeletonGroups=[dict(nodeIds=list(range(25)),side='undocumented'),dict(nodeIds=list(range(25,50)),side='undocumented')],skeletonTopology='not declared; do not assert finger connectivity or left/right mapping',gazeUnit='native x/y (undocumented; pixel-like values); not normalized or projected to ego camera',gazeCamera='observation.images.eye_rgb; correspondence inferred from Pupil Labs device, no gaze-camera calibration supplied',alignment='episode-relative parquet timestamps, nearest neighbor poses/skeleton/gaze, no clock offset added',sources=sources)
    result=dict(schemaVersion='1.0',recordingId=MAIN.name,taskTitle=load_lines(MAIN/'meta/tasks.jsonl')[0]['task'],duration=DURATION,fps=FPS,clipStart=START,metadata=metadata,frames=frames,waveforms=waveforms)
    dump('sample.json',safe(result)); return metadata

def load_lines(path): return [json.loads(x) for x in path.read_text().splitlines() if x.strip()]

def main():
    OUT.mkdir(exist_ok=True)
    metadata=samples()
    main_videos=[aligned_video('observation.images.headband_left_rgb','main-ego.mp4'),aligned_video('observation.images.third_rgb','main-third.mp4')]
    run(['-ss','5','-i',OUT/'main-ego.mp4','-frames:v','1','-q:v','2',OUT/'poster.jpg'])
    candidates=[dict(recordingId=r.name,title=load_lines(r/'meta/tasks.jsonl')[0]['task'],sourcePath=str(r),duration=load(r/'meta/info.json')['total_frames']/30) for r in RECS]
    keys=['headband_left_rgb']*8+['right_wrist_rgb','left_wrist_rgb','headband_right_rgb','eye_rgb']
    tiles=[]
    with tempfile.TemporaryDirectory(dir=OUT,prefix='.tiles-') as td:
        for i,key in enumerate(keys):
            r=RECS[i%8]; stream='observation.images.'+key
            tiles.append(dict(index=i+1,recordingId=r.name,title=candidates[i%8]['title'],stream=stream,sourcePath=str(video(r,stream)),clipStart=3,clipEnd=19,alignment='independent montage tile, source video PTS seconds; not synchronized between different recordings',thumbnail=f'thumb-{i+1:02d}.jpg',tile=f'{td}/{i:02d}.mp4'))
        def tile(t):
            run(['-threads','2','-ss','3','-i',t['sourcePath'],'-t','16','-an','-vf','scale=240:180:force_original_aspect_ratio=increase,crop=240:180,setsar=1,fps=30','-c:v','libx264','-threads','2','-preset','fast','-crf','26','-pix_fmt','yuv420p',t['tile']])
            run(['-ss','4','-i',t['tile'],'-frames:v','1','-q:v','3',OUT/t['thumbnail']])
            print('tile',t['index'],flush=True)
        with ThreadPoolExecutor(max_workers=3) as ex: list(ex.map(tile,tiles))
        args=[]
        for t in tiles: args+=['-threads','1','-i',t['tile']]
        layout='|'.join(f'{(i%4)*240}_{(i//4)*180}' for i in range(12))
        args+=['-filter_complex_threads','1','-filter_complex',f'xstack=inputs=12:layout={layout}:fill=black','-t','16','-an','-c:v','libx264','-threads','2','-crf','25','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',OUT/'montage.mp4']; run(args)
        for t in tiles: del t['tile']
    for c in candidates: c['poster']=next(t['thumbnail'] for t in tiles if t['recordingId']==c['recordingId'])
    cal=load_lines(MAIN/'meta/calibrations.jsonl')[0]['calibrations']
    manifest=dict(schemaVersion='1.0',sourceRoot=str(ROOT),mainRecordingId=MAIN.name,taskTitle=candidates[0]['title'],sample='sample.json',poster='poster.jpg',duration=DURATION,fps=FPS,clipStart=START,clipEnd=19,mainVideos=main_videos,montage=dict(file='montage.mp4',columns=4,rows=3,width=960,height=540,tiles=tiles,probe=probe(OUT/'montage.mp4')),candidates=candidates,metadata=metadata,calibration=dict(source=str(MAIN/'meta/calibrations.jsonl'),available='headband camera-camera and camera-IMU only; no glove-VIVE or gaze-ego extrinsics',timeshiftCamImuSeconds={k:v['timeshift_cam_imu'] for k,v in cal['ego_headband']['camera_imu-camchain-imucam'].items()},appliedToDemoSeconds=0,note='calibration shifts relate camera to IMU; not added again to already episode-relative streams'),qc=dict(source=str(MAIN/'meta/qc_reports.jsonl'),level=load_lines(MAIN/'meta/qc_reports.jsonl')[0]['level'],streamFindings={k:v.get('findings',[]) for k,v in load_lines(MAIN/'meta/qc_reports.jsonl')[0]['qc_report']['streams'].items()},note='source WARN retained; EEG impedance is one reading and stale; demo does not represent impedance quality or medical signal validity'),files={p.name:dict(bytes=p.stat().st_size) for p in OUT.iterdir() if p.is_file() and not p.name.startswith('check-')})
    dump('manifest.json',safe(manifest))
    for p in OUT.glob('check-*.jpg'): p.unlink()
    print(json.dumps({p.name:p.stat().st_size for p in OUT.iterdir() if p.is_file()},ensure_ascii=False),flush=True)

if __name__=='__main__': main()
