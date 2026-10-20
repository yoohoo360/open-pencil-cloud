#!/usr/bin/env python3
"""Pre-cut PingFang SC into unicode-range TTF slices for CanvasKit on-demand load."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[3]
SOURCE_DIR = ROOT / "packages/core/assets"
CORE_OUT = ROOT / "packages/core/assets/pingfang-sc"
REACT_OUT = ROOT / "packages/react/public/pingfang-sc"

# All packaged PingFang SC faces — each gets its own unicode-range slice directory.
STYLES = {
    "Thin": "PingFangSC-Thin.ttf",
    "UltraLight": "PingFangSC-Ultralight.ttf",
    "Light": "PingFangSC-Light.ttf",
    "Regular": "PingFangSC-Regular.ttf",
    "Medium": "PingFangSC-Medium.ttf",
    "SemiBold": "PingFangSC-Semibold.ttf",
}

# Always-loaded punctuation / latin / fullwidth punct for UI chrome.
BASE_BLOCKS = [
    (0x0020, 0x007E),
    (0x00A0, 0x00FF),
    (0x2000, 0x206F),
    (0x3000, 0x303F),
    (0xFF00, 0xFFEF),
]

HAN_CHUNK = 300
MANIFEST_VERSION = 1


def codepoints_in_font(path: Path) -> set[int]:
    font = TTFont(path)
    cps: set[int] = set()
    for table in font["cmap"].tables:
        cps.update(table.cmap)
    font.close()
    return cps


def format_unicodes(cps: list[int]) -> str:
    if not cps:
        return ""
    ranges: list[str] = []
    start = prev = cps[0]

    def push(a: int, b: int) -> None:
        ah, bh = f"{a:04X}", f"{b:04X}"
        ranges.append(f"U+{ah}" if a == b else f"U+{ah}-{bh}")

    for cp in cps[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        push(start, prev)
        start = prev = cp
    push(start, prev)
    # Normalize single form to U+XXXX (push already does U+)
    return ", ".join(ranges)


def subset_font(source: Path, unicodes: list[int], dest: Path) -> None:
    options = subset.Options()
    options.ignore_missing_unicodes = True
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.recommended_glyphs = True
    options.recalc_bounds = True
    options.recalc_timestamp = False
    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(dest), options)
    font.close()


def plan_slices(cps: set[int]) -> list[tuple[str, list[int]]]:
    base: set[int] = set()
    for start, end in BASE_BLOCKS:
        base.update(cp for cp in cps if start <= cp <= end)

    remaining = sorted(cps - base)
    slices: list[tuple[str, list[int]]] = [("base", sorted(base))]

    for index in range(0, len(remaining), HAN_CHUNK):
        chunk = remaining[index : index + HAN_CHUNK]
        slices.append((f"{index // HAN_CHUNK:03d}", chunk))
    return [(name, unicodes) for name, unicodes in slices if unicodes]


def generate_style(style: str, source_name: str) -> dict:
    source = SOURCE_DIR / source_name
    if not source.is_file():
        raise FileNotFoundError(source)

    cps = codepoints_in_font(source)
    planned = plan_slices(cps)
    out_dir = CORE_OUT / style
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    slices_meta = []
    total_bytes = 0
    for name, unicodes in planned:
        file_name = f"{name}.ttf"
        dest = out_dir / file_name
        subset_font(source, unicodes, dest)
        size = dest.stat().st_size
        total_bytes += size
        slices_meta.append(
            {
                "id": name,
                "file": file_name,
                "unicodes": format_unicodes(unicodes),
                "codePoints": unicodes,
                "byteLength": size,
            }
        )
        print(f"  {style}/{file_name}: {len(unicodes)} cps, {size / 1024:.1f} KiB")

    manifest = {
        "version": MANIFEST_VERSION,
        "family": "PingFang SC",
        "style": style,
        "source": source_name,
        "sliceCount": len(slices_meta),
        "totalBytes": total_bytes,
        "slices": [
            {
                "id": item["id"],
                "file": item["file"],
                "unicodes": item["unicodes"],
                "byteLength": item["byteLength"],
                # Compact range list for runtime matching (not full codepoint arrays).
                "ranges": compress_ranges(item["codePoints"]),
            }
            for item in slices_meta
        ],
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"  {style}: {len(slices_meta)} slices, {total_bytes / 1024 / 1024:.2f} MiB total")
    return manifest


def compress_ranges(cps: list[int]) -> list[list[int]]:
    if not cps:
        return []
    ranges: list[list[int]] = []
    start = prev = cps[0]
    for cp in cps[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        ranges.append([start, prev])
        start = prev = cp
    ranges.append([start, prev])
    return ranges


def sync_to_react() -> None:
    if REACT_OUT.exists():
        shutil.rmtree(REACT_OUT)
    shutil.copytree(CORE_OUT, REACT_OUT)
    print(f"synced → {REACT_OUT.relative_to(ROOT)}")


def write_index() -> None:
    """List every style directory that has a manifest (partial regenerations keep others)."""
    styles = sorted(
        path.name
        for path in CORE_OUT.iterdir()
        if path.is_dir() and (path / "manifest.json").is_file()
    )
    index = {
        "version": MANIFEST_VERSION,
        "family": "PingFang SC",
        "styles": styles,
        "basePath": "/pingfang-sc",
    }
    payload = json.dumps(index, indent=2) + "\n"
    (CORE_OUT / "index.json").write_text(payload)
    (REACT_OUT / "index.json").write_text(payload)
    print(f"index styles: {', '.join(styles)}")


def main() -> int:
    styles = STYLES
    if len(sys.argv) > 1:
        wanted = set(sys.argv[1:])
        styles = {k: v for k, v in STYLES.items() if k in wanted}
        if not styles:
            print("No matching styles", file=sys.stderr)
            return 1

    CORE_OUT.mkdir(parents=True, exist_ok=True)
    for style, source_name in styles.items():
        print(f"subsetting {style} from {source_name}")
        generate_style(style, source_name)
    sync_to_react()
    write_index()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
