#!/usr/bin/env python3
"""Build public/data/objects.json — the per-episode object table behind the
viewer's moment readout.

Two real sources are joined, and nothing is invented:

1. Session metadata, ``<session>/meta/collect_info.jsonl`` in the capture tree.
   Each episode records its own scene objects with name, colour (hex), shape,
   ``dims`` in cm, material, and a table pose (``cx``/``cy``/``ang``).
2. The upstream task-design library under Embodied-Brain-Collect/configs.
   Entries there carry a ``weight`` in grams. A weight is only carried over
   when the library entry agrees with the session object on name, shape and
   material *and* shares dimension keys within tolerance — and only when the
   agreement is unambiguous. Anything else is left null rather than guessed.

Usage:
    python3 scripts/build_object_index.py \
        --sessions /home/baai/ks3 \
        --library  /home/baai/Projects/Embodied-Brain-Collect/configs \
        --out      public/data/objects.json
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

# Dimension keys that must agree, and how far they may drift. The library is a
# design intent; the session is what was actually placed, so exact equality
# would reject real pairs over a rounding difference.
TOLERANCE = 0.08

DIM_UNITS = {
    "d": "d", "h": "h", "l": "l", "w": "w",
    "rx": "rx", "ry": "ry", "rz": "rz", "r": "r",
}


def load_jsonl_first(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                return json.loads(line)
    return {}


def walk_objects(node):
    """Yield every dict that looks like a library object entry."""
    if isinstance(node, dict):
        if isinstance(node.get("objects"), list):
            for item in node["objects"]:
                if isinstance(item, dict) and item.get("name"):
                    yield item
        for value in node.values():
            if isinstance(value, (dict, list)):
                yield from walk_objects(value)
    elif isinstance(node, list):
        for value in node:
            yield from walk_objects(value)


def load_weight_library(configs: Path) -> dict[str, list[dict]]:
    import yaml  # imported here so --help works without the dependency

    library: dict[str, list[dict]] = collections.defaultdict(list)
    patterns = ["task_designs/*.yaml", "environments/*/*_config.yaml"]
    seen: set[Path] = set()
    for pattern in patterns:
        for path in sorted(configs.glob(pattern)):
            if path in seen:
                continue
            seen.add(path)
            try:
                doc = yaml.safe_load(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            for obj in walk_objects(doc):
                weight = obj.get("weight")
                if weight is None:
                    continue
                library[obj["name"]].append({
                    "weightG": float(weight),
                    "shape": obj.get("shape"),
                    "material": obj.get("material"),
                    "dims": {k: v for k, v in (obj.get("dims") or {}).items() if k in DIM_UNITS},
                    "source": path.name,
                })
    return library


def dims_agree(session_dims: dict, library_dims: dict) -> bool:
    shared = set(session_dims) & set(library_dims)
    if not shared:
        return False
    for key in shared:
        try:
            a, b = float(session_dims[key]), float(library_dims[key])
        except (TypeError, ValueError):
            return False
        if abs(a - b) > TOLERANCE * max(1e-9, abs(b)):
            return False
    return True


def resolve_weight(obj: dict, library: dict[str, list[dict]]) -> float | None:
    """Return a weight only when every agreeing entry carries the same one."""
    candidates = library.get(obj.get("name") or "")
    if not candidates:
        return None
    dims = obj.get("dims") or {}
    agreeing = [
        c for c in candidates
        if c["shape"] == obj.get("shape")
        and (c["material"] or "") == (obj.get("material") or "")
        and dims_agree(dims, c["dims"])
    ]
    if not agreeing:
        return None
    weights = {c["weightG"] for c in agreeing}
    return weights.pop() if len(weights) == 1 else None


def build_object(entry: dict, library: dict[str, list[dict]]) -> dict:
    dims = {k: v for k, v in (entry.get("dims") or {}).items() if k in DIM_UNITS}
    return {
        "name": entry.get("name"),
        "id": entry.get("id"),
        "color": entry.get("color"),
        "shape": entry.get("shape"),
        "material": entry.get("material"),
        "dims": dims,
        "weightG": resolve_weight(entry, library),
        "table": {"x": entry.get("cx"), "y": entry.get("cy"), "angle": entry.get("ang")},
    }


# --- step parsing -----------------------------------------------------------
#
# The step list is the only action text the capture records, and it is
# explicitly untimed. Each step is reduced to its own Chinese sentence plus the
# names of the objects that sentence refers to — a mechanical read of the
# source, adding no semantics.
#
# The action *verb* is deliberately not resolved here. Every translated string
# in the site lives in `src/content.ts`, so this file emits the Chinese source
# text and lets the readout map it onto a bilingual verb.

ORDINAL = re.compile(r"^\s*\d+\s*[.、．)]\s*")
TRAILING_INDEX = re.compile(r"\d+$")

# Some steps name a whole group rather than the instances the recording placed
# ("取对应的饮品放到卡片上面"). Those words are recorded separately so the
# readout can show a precise mention and a candidate set distinctly.
GROUP_WORDS = ["饮品", "筷子", "药品", "卡片"]
DRINKS = ["可乐", "旺仔牛奶", "橙汁", "葡萄汁", "菠萝汁", "西柚汁", "青柠汁",
          "蔓越莓汁", "水蜜桃饮料", "番茄汁", "柠檬水", "乌龙茶", "水杯"]


def base_name(name: str) -> str:
    return TRAILING_INDEX.sub("", name)


def literal_mentions(text: str, names: list[str]) -> list[str]:
    """Object names actually written in the sentence.

    Matching is longest-first over consumed spans, so "筷子筒" in the text is
    one mention of the holder and not also a mention of the chopsticks it
    contains.
    """
    taken = [False] * len(text)
    hits: list[str] = []
    for name in sorted(names, key=len, reverse=True):
        start = 0
        while True:
            at = text.find(name, start)
            if at < 0:
                break
            span = range(at, at + len(name))
            if not any(taken[i] for i in span):
                for i in span:
                    taken[i] = True
                if name not in hits:
                    hits.append(name)
            start = at + 1
    return [n for n in names if n in hits]


def group_members(word: str, names: list[str]) -> list[str]:
    if word == "饮品":
        return [n for n in names if base_name(n) in DRINKS]
    if word == "筷子":
        return [n for n in names if base_name(n) == "筷子"]
    if word == "药品":
        return [n for n in names if base_name(n) == "药"]
    if word == "卡片":
        return [n for n in names if n.endswith("卡片")]
    return []


def parse_steps(raw_steps: list[str], objects: list[dict]) -> list[dict]:
    names = [o["name"] for o in objects if o.get("name")]
    steps = []
    for index, raw in enumerate(raw_steps):
        text = ORDINAL.sub("", raw).strip()
        mentions = literal_mentions(text, names)
        groups = []
        for word in GROUP_WORDS:
            if word not in text:
                continue
            members = [n for n in group_members(word, names) if n not in mentions]
            if members:
                groups.append({"word": word, "members": members})
        steps.append({
            "index": index,
            "text": text,
            "mentions": mentions,
            "groups": groups,
        })
    return steps


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sessions", default="/home/baai/ks3")
    ap.add_argument("--library", default="/home/baai/Projects/Embodied-Brain-Collect/configs")
    ap.add_argument("--recordings", default="public/data/recordings.json")
    ap.add_argument("--out", default="public/data/objects.json")
    args = ap.parse_args()

    index_path = Path(args.recordings)
    index = json.loads(index_path.read_text(encoding="utf-8"))
    library = load_weight_library(Path(args.library))

    out: dict[str, dict] = {}
    stats = {"objects": 0, "weighted": 0, "recordings": 0}
    missing = []
    for rec in index:
        session = Path(args.sessions) / rec["id"]
        collect = session / "meta" / "collect_info.jsonl"
        if not collect.is_file():
            missing.append(rec["id"])
            continue
        meta = load_jsonl_first(collect)
        objects = [build_object(o, library) for o in (meta.get("objects") or [])]
        steps = parse_steps(
            [s for s in (meta.get("notes") or "").splitlines() if re.match(r"^\s*\d+[.、．)]", s)],
            objects,
        )
        out[rec["id"]] = {
            "scene": meta.get("scene"),
            "task": meta.get("task_name"),
            "objects": objects,
            "steps": steps,
        }
        stats["recordings"] += 1
        stats["objects"] += len(objects)
        stats["weighted"] += sum(1 for o in objects if o["weightG"] is not None)

    Path(args.out).write_text(
        json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {args.out}: {stats['recordings']} recordings, "
          f"{stats['objects']} objects, {stats['weighted']} with a validated weight")
    if missing:
        print(f"skipped (no session metadata): {', '.join(missing)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
