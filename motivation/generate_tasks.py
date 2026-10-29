#!/usr/bin/env python3
"""Original synthetic task schematics. Pillow + ffmpeg; no physiological data/claims.
Run: python generate_tasks.py [--output-dir PATH]
Critical event anchors at t=2.5 s: gaze (.60,.54), emg (.56,.62), eeg (.65,.48).
No duplicated-frame pauses: presentation playback controls any intended freeze.
"""
from pathlib import Path
import argparse
import json
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SECONDS = 800, 450, 24, 8
ROOT = Path(__file__).resolve().parent
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F = {s: ImageFont.truetype(FONT, s) for s in (11, 12, 13, 14, 16, 18)}
FB = {s: ImageFont.truetype(BOLD, s) for s in (12, 14, 20, 24)}
INK = '#e4edf4'
MUTED = '#8d9eaf'
CYAN = '#71d8e5'


def ease(a, b, t):
    u = max(0, min(1, (t-a)/(b-a)))
    return u*u*(3-2*u)


def mix(a, b, u):
    return a+(b-a)*u


def text(d, xy, value, size=14, fill=INK, bold=False, anchor=None):
    d.text(xy, value, font=(FB if bold else F)[size], fill=fill, anchor=anchor)


def rr(d, box, fill, radius=10, outline=None, width=1):
    d.rounded_rectangle(tuple(round(v) for v in box), radius=radius, fill=fill, outline=outline, width=width)


def background():
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        u=y/H
        d.line((0,y,W,y), fill=(int(12+8*u), int(20+10*u), int(31+13*u)))
    rr(d, (35,105,765,386), '#1c2c3b', 22, '#3a4d60')
    for x in range(55,760,32):
        d.line((x,115,x,375), fill='#243545')
    for y in range(122,380,32):
        d.line((45,y,755,y), fill='#243545')
    d.line((55,371,745,371), fill='#425263')
    return im

BASE=background()


def frame(title, subtitle, index, t, phase):
    im=BASE.copy()
    d=ImageDraw.Draw(im)
    text(d,(36,24),title,24,bold=True)
    text(d,(36,61),subtitle,13,fill=MUTED)
    rr(d,(626,25,764,52),'#223746',7)
    text(d,(695,38),'SYNTHETIC DEMO',11,CYAN,anchor='mm')
    text(d,(51,121),f'0{index} / TABLETOP TASK',11,MUTED)
    text(d,(748,121),'OBLIQUE VIEW',11,MUTED,anchor='ra')
    text(d,(36,405),phase,16)
    text(d,(764,430),'Original schematic · no physiological data',11,MUTED,anchor='ra')
    d.line((36,438,764,438),fill='#304356',width=2)
    d.line((36,438,36+728*t/SECONDS,438),fill=CYAN,width=2)
    return im


def shadow(im, box, blur=9, opacity=100):
    layer=Image.new('RGBA',im.size)
    ImageDraw.Draw(layer).ellipse(box,fill=(0,0,0,opacity))
    im.paste(Image.alpha_composite(im.convert('RGBA'),layer.filter(ImageFilter.GaussianBlur(blur))).convert('RGB'))


def block(im,x,y,color,label,lift=0,selected=False):
    shadow(im,(x-43,y+17,x+48,y+45),7)
    d=ImageDraw.Draw(im)
    yy=y-lift
    d.polygon([(x-37,yy-19),(x+23,yy-19),(x+39,yy-5),(x-21,yy-5)],fill=color)
    d.polygon([(x-37,yy-19),(x-21,yy-5),(x-21,yy+34),(x-37,yy+19)],fill='#364655')
    rr(d,(x-21,yy-5,x+39,yy+34),color,3, '#b4c7ce' if selected else '#667887')
    text(d,(x+9,yy+14),label,14,'#101e29',True,anchor='mm')
    if selected:
        d.arc((x-53,yy-36,x+54,yy+51),15,338,fill=CYAN,width=2)


def hand(im,x,y,grip=False,angle=0):
    # Local (0,0) is the finger/contact anchor. The wrist extends toward bottom left.
    layer=Image.new('RGBA',(230,210))
    d=ImageDraw.Draw(layer)
    c='#bdcbd5'; edge='#71899b'
    pts=[(77,195),(39,160),(69,119),(78,82),(91,44),(102,39),(111,46),(108,79),(127,73),(143,80),(158,97),(165,119),(153,139),(122,157)]
    d.polygon(pts,fill=c)
    d.line(pts+[pts[0]],fill=edge,width=2)
    rr(d,(83,8,103,94),c,10,edge,2)
    if grip:
        rr(d,(103,35,151,52),c,8,edge,2)
        rr(d,(136,45,154,88),c,8,edge,2)
    else:
        d.line((111,91,127,108,124,126),fill=edge,width=2)
        d.line((96,110,112,127),fill=edge,width=2)
    d.line((52,160,83,183),fill='#68849a',width=5)
    if angle:
        layer=layer.rotate(angle,resample=Image.Resampling.BICUBIC,center=(93,8))
    scale = .70
    layer = layer.resize((161,147), Image.Resampling.LANCZOS)
    left, top = round(x-93*scale), round(y-8*scale)
    # The forearm enters at the table edge; reserve the footer for readable captions.
    visible_height = min(layer.height, max(0, 385-top))
    if visible_height:
        layer = layer.crop((0,0,layer.width,visible_height))
        im.paste(layer,(left,top),layer)


def ring(d,x,y,t,color=CYAN):
    r=15+3*math.sin(t*4)
    d.ellipse((x-r,y-r,x+r,y+r),outline=color,width=2)
    d.line((x-5,y,x+5,y),fill=color,width=1)
    d.line((x,y-5,x,y+5),fill=color,width=1)


def gaze(t):
    phase = 'Scan the options' if t<1.25 else 'Select the coral block' if t<2.5 else 'Selection reached' if t<3 else 'Reach and move the selected block'
    im=frame('Gaze / select & reach','Three colored options · one selected object',1,t,phase)
    move=ease(4.0,7.9,t)
    x,y=480+83*move,243-35*move
    block(im,257,239,'#6aaac7','A')
    block(im,373,206,'#d8bc75','B')
    block(im,x,y,'#dd8e85','C',selected=t>=1.3)
    d=ImageDraw.Draw(im)
    text(d,(193,328),'OPTIONS',11,MUTED)
    # Explicit attention cursor arrives at the target before the hand reaches it.
    u=ease(.3,1.4,t)
    gx=mix(257,480,u); gy=mix(239,243,u)
    d.line((110,174,gx,gy),fill='#416876',width=1)
    d.ellipse((93,164,125,183),outline=CYAN,width=2)
    d.ellipse((105,169,113,178),fill=CYAN)
    ring(d,gx if t<3 else x,gy if t<3 else y,t)
    u=ease(1.45,2.5,t)
    hx=mix(625,480,u); hy=mix(361,243,u)
    if t>3:
        hx=x; hy=y
    hand(im,hx,hy,grip=t>3.6)
    return im


def emg(t):
    phase='Two identical-looking boxes' if t<1.3 else 'Grip the selected box' if t<2.5 else 'Load encountered at contact' if t<3 else 'Adjust the grip and lift the heavier box'
    im=frame('EMG / grip & lift','Same appearance · different simulated loads',2,t,phase)
    # The selected box contact point is exactly (448,279) at the event.
    lift=66*ease(3.05,6.8,t)+2*math.sin(t*2)*ease(6.8,7.9,t)
    block(im,272,249,'#a9b8c3','01')
    block(im,448,279,'#a9b8c3','02',lift,selected=t>1)
    d=ImageDraw.Draw(im)
    text(d,(237,316),'REFERENCE',11,MUTED)
    text(d,(425,337),'SELECTED',11,CYAN)
    if t>=2.5:
        rr(d,(551,171,714,225),'#243a49',9,'#506879')
        text(d,(566,181),'SIMULATED LOAD',11,MUTED)
        text(d,(566,199),'02 > 01',16,INK)
        d.line((548,212,490,255-lift),fill='#688697',width=1)
    u=ease(.5,2.5,t)
    hx=mix(568,448,u); hy=mix(361,279,u)-lift
    hand(im,hx,hy,grip=True)
    d=ImageDraw.Draw(im)
    if t>3:
        d.line((510,289,510,227-lift*.4),fill=CYAN,width=2)
        d.polygon([(505,234-lift*.4),(510,225-lift*.4),(515,234-lift*.4)],fill=CYAN)
        text(d,(526,276),'LIFT',11,CYAN)
    return im


def eeg(t):
    phase='Approach the socket' if t<2.5 else 'Insertion blocked at the interface' if t<3 else 'Retract and realign' if t<5.1 else 'Insert the aligned connector'
    im=frame('EEG / align & insert','Connector task · blocked attempt and correction',3,t,phase)
    d=ImageDraw.Draw(im)
    shadow(im,(502,239,706,283),8)
    d=ImageDraw.Draw(im)
    d.polygon([(520,169),(666,169),(697,189),(550,189)],fill='#718795')
    rr(d,(520,189,697,267),'#425b6c',8,'#8499a5')
    # Front-facing socket is centered at normalized (.65,.48).
    rr(d,(510,194,535,238),'#0d1925',4,'#90a9b7',2)
    d.rectangle((519,202,526,230),fill='#c8b46c')
    text(d,(578,218),'SOCKET',12,INK,True)
    d.line((641,226,673,226),fill='#819cae',width=2)
    if t<=2.5:
        u=ease(.25,2.5,t); x=mix(300,520,u); angle=14
    elif t<3:
        x=520-1.2*math.sin((t-2.5)*10); angle=14
    elif t<4.3:
        x=mix(520,426,ease(3,4.3,t)); angle=mix(14,0,ease(3.2,4.9,t))
    else:
        x=mix(426,550,ease(4.8,7.5,t)); angle=mix(14,0,ease(3.2,4.9,t))
    y=216
    # Rotated connector has its nose at the exact interface anchor.
    a=math.radians(angle)
    def pt(px,py):
        return (x+px*math.cos(a)-py*math.sin(a),y+px*math.sin(a)+py*math.cos(a))
    d.line([pt(-235,48),pt(-155,20),pt(-100,0)],fill='#101b26',width=13)
    d.line([pt(-235,48),pt(-155,20),pt(-100,0)],fill='#778fa0',width=5)
    d.polygon([pt(-26,-9),pt(0,-9),pt(0,9),pt(-26,9)],fill='#c9c3a1')
    d.polygon([pt(-103,-23),pt(-26,-23),pt(-26,23),pt(-103,23)],fill='#7bb5c5',outline='#b6d5df',width=2)
    d.line([pt(-86,-15),pt(-86,15)],fill='#43778b',width=3)
    hand(im,*pt(-60,22),grip=True)
    d=ImageDraw.Draw(im)
    if 2.3<t<3.35:
        for k in (-1,0,1):
            d.line((526,216+k*14,541,216+k*20),fill='#f1a07c',width=2)
        text(d,(553,302),'BLOCKED',12,'#f1a07c',True)
    elif t>6.5:
        d.ellipse((650,244,657,251),fill='#8dd6b8')
        text(d,(553,302),'CONNECTED',12,'#8dd6b8',True)
    text(d,(180,337),'PLUG',11,MUTED)
    return im


TASKS={'gaze':gaze,'emg':emg,'eeg':eeg}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output-dir',type=Path,default=ROOT)
    args=ap.parse_args(); args.output_dir.mkdir(parents=True,exist_ok=True)
    results={}
    for name,render in TASKS.items():
        path=args.output_dir/f'{name}-task.mp4'
        cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(path)]
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
        try:
            for n in range(FPS*SECONDS):
                proc.stdin.write(render(n/FPS).tobytes())
        finally:
            proc.stdin.close()
        if proc.wait()!=0:
            raise RuntimeError(f'ffmpeg failed: {path}')
        render(2.5).save(args.output_dir/f'{name}-task.jpg',quality=95,subsampling=0)
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=codec_name,pix_fmt,width,height,r_frame_rate,nb_read_frames:format=duration','-of','json',str(path)]))
        stream=probe['streams'][0]
        assert (stream['codec_name'],stream['pix_fmt'],stream['width'],stream['height'],stream['r_frame_rate'],stream['nb_read_frames'])==('h264','yuv420p',W,H,'24/1','192')
        assert abs(float(probe['format']['duration'])-SECONDS)<.01
        results[path.name]=probe
        print(f'Verified {path.name}: H.264 yuv420p {W}x{H}, 24 fps, 192 frames, 8 seconds',flush=True)
    (args.output_dir/'ffprobe-verification.json').write_text(json.dumps(results,indent=2)+'\n')


if __name__=='__main__':
    main()
