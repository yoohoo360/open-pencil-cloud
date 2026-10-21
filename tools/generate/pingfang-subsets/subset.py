#!/usr/bin/env python3
"""Pre-cut PingFang SC into unicode-range TTF slices for CanvasKit on-demand load."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Optional

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[3]
TOOL_DIR = Path(__file__).resolve().parent
# Full faces: tool-local sources only — never under packages/core/assets or react/public.
SOURCE_DIR = TOOL_DIR / "sources"
CORE_OUT = ROOT / "packages/core/assets/pingfang-sc"
REACT_OUT = ROOT / "packages/react/public/pingfang-sc"

# Source face → packaged slice dir. Public ships `common.ttf` per style, not the whole face.
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

# 通用规范汉字表 · 一级（常用字）。Checked-in as U+XXXX lines.
LEVEL1_TABLE = Path(__file__).resolve().parent / "tables" / "general-standard-level1.txt"

MANIFEST_VERSION = 5


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


def load_level1_codepoints(path: Path = LEVEL1_TABLE) -> set[int]:
    """Parse `U+XXXX` (optional `# comment`) or bare characters, one entry per line."""
    if not path.is_file():
        raise FileNotFoundError(path)
    cps: set[int] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.split("#", 1)[0].strip()
        if not raw:
            continue
        if raw.upper().startswith("U+"):
            cps.add(int(raw[2:], 16))
            continue
        cps.add(ord(raw[0]))
    return cps


def plan_slices(
    cps: set[int], level1: Optional[set[int]] = None
) -> list[tuple[str, list[int]]]:
    """One packaged shard: `common` (UI chrome + 一级). Uncovered glyphs use network fallback."""
    level1 = level1 if level1 is not None else load_level1_codepoints()

    base: set[int] = set()
    for start, end in BASE_BLOCKS:
        base.update(cp for cp in cps if start <= cp <= end)

    # Latin/punct + level-1 Han in a single hot shard. No `rare.ttf` — CanvasKit falls
    # through to Google `text=` CJK subsets for the rest.
    common = sorted(base | (cps & level1))
    return [("common", common)] if common else []


def generate_style(style: str, source_name: str) -> dict:
    source = SOURCE_DIR / source_name
    if not source.is_file():
        raise FileNotFoundError(source)

    cps = codepoints_in_font(source)
    level1 = load_level1_codepoints()
    planned = plan_slices(cps, level1)
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

    # Per-style manifest: file sizes only. Shared unicode coverage lives in config.json.
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
                "byteLength": item["byteLength"],
            }
            for item in slices_meta
        ],
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"  {style}: {len(slices_meta)} slices, {total_bytes / 1024 / 1024:.2f} MiB total")
    return {
        "manifest": manifest,
        "coverage": [
            {
                "id": item["id"],
                "file": item["file"],
                "ranges": compress_ranges(item["codePoints"]),
            }
            for item in slices_meta
        ],
    }


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


def write_index(styles: list[str]) -> None:
    index = {
        "version": MANIFEST_VERSION,
        "family": "PingFang SC",
        "styles": styles,
        "basePath": "/pingfang-sc",
        "config": "config.json",
    }
    payload = json.dumps(index, indent=2) + "\n"
    (CORE_OUT / "index.json").write_text(payload)
    (REACT_OUT / "index.json").write_text(payload)
    print(f"index styles: {', '.join(styles)}")


def write_coverage_config(styles: list[str], coverage: list[dict]) -> None:
    """Shared lookup table: which shard owns which code points (all weights)."""
    default_slice = next((s["id"] for s in coverage if s["id"] == "common"), coverage[0]["id"])
    config = {
        "version": MANIFEST_VERSION,
        "family": "PingFang SC",
        "defaultSlice": default_slice,
        "basePath": "/pingfang-sc",
        "styles": styles,
        "slices": coverage,
    }
    payload = json.dumps(config, ensure_ascii=False, indent=2) + "\n"
    (CORE_OUT / "config.json").write_text(payload)
    (REACT_OUT / "config.json").write_text(payload)
    total_cps = sum(end - start + 1 for slice in coverage for start, end in slice["ranges"])
    print(f"config.json: {len(coverage)} slices, ~{total_cps} codepoints, default={default_slice}")


def main() -> int:
    styles = STYLES
    if len(sys.argv) > 1:
        wanted = set(sys.argv[1:])
        styles = {k: v for k, v in STYLES.items() if k in wanted}
        if not styles:
            print("No matching styles", file=sys.stderr)
            return 1

    CORE_OUT.mkdir(parents=True, exist_ok=True)
    coverage = None  # type: Optional[list]
    for style, source_name in styles.items():
        print(f"subsetting {style} from {source_name}")
        result = generate_style(style, source_name)
        # Unicode partitions are identical across weights — keep the first plan.
        if coverage is None:
            coverage = result["coverage"]
    sync_to_react()
    all_styles = sorted(
        path.name
        for path in CORE_OUT.iterdir()
        if path.is_dir() and (path / "manifest.json").is_file()
    )
    if coverage is None:
        print("No coverage produced", file=sys.stderr)
        return 1
    write_coverage_config(all_styles, coverage)
    write_index(all_styles)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
