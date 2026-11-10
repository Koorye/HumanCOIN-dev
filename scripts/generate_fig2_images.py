#!/usr/bin/env python3
"""Generate the scene atlas and acquisition-setting illustrations for §03.

Fig. 2 of the report shows the corpus as 18 scene classes and two collection
settings. The page needs one photograph per class plus one per setting, and the
report's own examples are tiny printed thumbnails, so this script draws them
with an image model instead of cropping the print resolution.

Every prompt shares one art direction — over-the-shoulder documentary, adult
hands only, no face, no legible lettering, soft daylight, muted cool palette —
so the atlas reads as one set rather than eighteen stock photographs. The
output is illustrative, not recorded HumanCOIN footage; `provenance.json`
records the model, prompt and size beside the images, and the page captions say
so.

Usage (key is never written to disk):

    IMAGE_API_KEY=... python3 scripts/generate_fig2_images.py
    IMAGE_API_KEY=... python3 scripts/generate_fig2_images.py --only kitchen,cafe
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

API_URL = "https://zyapi.xmsxb.com/v1/images/generations"
MODEL = "gpt-image-2.5-flare"
SIZE = "1536x1024"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "generated"
STATE = Path(__file__).resolve().parent / ".fig2-gen-state.json"

BASE = (
    "Editorial documentary photograph for an egocentric manipulation dataset. "
    "Over-the-shoulder view, only the subject's adult hands and forearms in frame, "
    "no face, no reflection of a face. Soft natural daylight, muted cool palette, "
    "fine 35mm grain, shallow depth of field, realistic and understated. "
    "No text, no lettering, no logos, no watermark, no UI overlay."
)

SCENES: dict[str, str] = {
    "bedroom": "A person folds a linen shirt on a neatly made bed in a calm bedroom; white duvet, blue-grey pillows, a wooden bedside table and a window with morning light.",
    "kitchen": "Hands slice fresh vegetables on a wooden cutting board beside a sink in a bright home kitchen; a bowl of tomatoes, herbs in a pot, pale stone counter.",
    "dining": "Hands set a ceramic plate and cutlery on a wooden dining table in a dining room; a linen napkin, two chairs, a pendant lamp above, late-afternoon light.",
    "supermarket": "A hand reaches for a packaged item on a stocked supermarket shelf; a deep aisle of shelves in soft focus, a shopping basket held in the other hand.",
    "cafe": "A barista's hands tamp ground coffee into a portafilter at a cafe counter; a ceramic cup, a grinder, a warm timber counter and blurred cafe interior.",
    "pharmacy": "Hands take a medicine box from a white pharmacy shelf; neatly arranged boxes and bottles, a clean counter, clinical daylight.",
    "books": "Hands pull a hardback book from a tall bookshelf in a quiet bookshop; rows of anonymous cloth spines with no legible lettering, warm wood, soft window light.",
    "fitness": "Hands adjust a weight plate on a dumbbell rack in a gym; rubber flooring, dark metal, tall windows with daylight, a water bottle nearby.",
    "retail": "Hands arrange folded knitwear on a display table in a small clothing boutique; stacked sweaters in muted colours, a wooden hanger rail behind.",
    "hotel": "Hands place a folded white towel and small amenity bottles on a hotel room desk; crisp white linen, a luggage rack and a soft lamp in the background.",
    "park": "Hands prune a low hedge with secateurs in a public park; green foliage, a gravel path, benches and trees in soft morning light.",
    "workbench": "Hands assemble a small mechanical part with a screwdriver on a workbench; a pegboard of tools behind, metal components and a tray of screws on the bench.",
    "office": "Hands sort paper documents into folders on an office desk; a keyboard, a monitor showing a neutral document out of focus, a cup of tea.",
    "warehouse": "Hands scan a cardboard box with a handheld barcode scanner beside stacked pallets in a warehouse aisle; concrete floor, steel shelving, high ceiling.",
    "medical": "Gloved hands arrange stainless-steel instruments on a tray in a clinic; sterile blue drapes, an examination light, a clean counter.",
    "agriculture": "Hands transplant a small seedling into dark soil in a greenhouse; rows of young plants, terracotta pots, diffused warm light through glass.",
    "classroom": "Hands arrange coloured wooden blocks and books on a classroom table; a blurred chalkboard and small chairs behind, bright school daylight.",
    "lab": "Gloved hands pipette liquid into glass test tubes on a laboratory bench; a rack of tubes, a beaker, cool white light, stainless surfaces.",
}

SETTINGS: dict[str, str] = {
    "controlled": (
        "Behind-the-shoulder view of a seated research participant at an instrumented desk, "
        "wearing a black EEG cap with electrodes, a slim four-lens headband across the forehead, "
        "black forearm bands and small motion-tracking markers on the wrists; cables run to a "
        "recording cart, a third-person camera on a tripod frames the desk from the side, small "
        "objects are laid out on the table. A calm laboratory room, pale walls, mixed daylight. "
        "No face, no text, no logos."
    ),
    "open": (
        "Behind-the-shoulder view of a shopper in a supermarket aisle, wearing a slim black "
        "four-lens headband and two small forearm bands, reaching for a product on the shelf; "
        "a shopping basket in the other hand, stocked shelves, clean daylight. Candid and "
        "unobtrusive, everyday clothing. No face, no text, no logos."
    ),
}

OBJECT = {
    "cup": (
        "A single white glazed ceramic cup, straight tapered sides, on a seamless very pale "
        "warm-white background, three-quarter view, soft studio light from the upper left, "
        "gentle contact shadow, product photography, centered, no handle visible, "
        "no text, no logos."
    ),
}


def brief(key: str) -> str:
    if key in SCENES:
        return f"{BASE} Scene: {SCENES[key]}"
    if key in SETTINGS:
        return f"{BASE} {SETTINGS[key]}"
    return OBJECT[key]


def generate(prompt: str) -> Image.Image:
    body = json.dumps({"model": MODEL, "prompt": prompt, "size": SIZE}).encode()
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.environ['IMAGE_API_KEY']}",
        },
    )
    with urllib.request.urlopen(req, timeout=420) as response:
        payload = json.loads(response.read())
    raw = base64.b64decode(payload["data"][0]["b64_json"])
    return Image.open(io.BytesIO(raw)).convert("RGB")


def target(key: str) -> Path:
    if key in SCENES:
        return OUT / "scenes" / f"{key}.jpg"
    if key in SETTINGS:
        return OUT / "settings" / f"{key}.jpg"
    return OUT / f"{key}.jpg"


def write(key: str, image: Image.Image) -> None:
    path = target(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    limit = 900 if key in OBJECT else 1440
    if image.width > limit:
        image = image.resize((limit, round(image.height * limit / image.width)), Image.LANCZOS)
    image.save(path, quality=87, optimize=True, progressive=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="comma-separated keys to (re)generate")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    if "IMAGE_API_KEY" not in os.environ:
        sys.exit("IMAGE_API_KEY is not set")

    keys = list(SCENES) + list(SETTINGS) + list(OBJECT)
    if args.only:
        wanted = {k.strip() for k in args.only.split(",") if k.strip()}
        keys = [k for k in keys if k in wanted]
        if not keys:
            sys.exit(f"no such key; choose from {', '.join(SCENES | SETTINGS | OBJECT)}")

    STATE.parent.mkdir(parents=True, exist_ok=True)
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    lock = threading.Lock()

    def work(key: str) -> str:
        started = time.time()
        image = generate(brief(key))
        with lock:
            write(key, image)
            state[key] = {
                "prompt": brief(key),
                "model": MODEL,
                "size": [image.width, image.height],
                "seconds": round(time.time() - started, 1),
            }
            STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
        return f"{key:12s} {image.width}×{image.height}  {time.time() - started:5.1f}s"

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(work, k): k for k in keys}
        for future in as_completed(futures):
            key = futures[future]
            try:
                print(future.result(), flush=True)
            except (urllib.error.HTTPError, urllib.error.URLError, KeyError) as exc:
                print(f"{key:12s} FAILED: {exc}", flush=True)

    provenance = {
        "synthetic": True,
        "model": MODEL,
        "purpose": (
            "Illustrative scene, acquisition-setting and object photographs for §03. "
            "They describe the classes and the settings; they are not frames from the corpus."
        ),
        "art_direction": BASE,
        "entries": state,
    }
    (OUT / "fig2-provenance.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"wrote {OUT / 'fig2-provenance.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
