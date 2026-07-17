#!/usr/bin/env python3
"""Pre-bake per-section variants of the sidebar glow images.

iOS/WebKit allocates a fresh GPU buffer every time a filtered layer is (re)rendered and releases
them lazily; the sidebar's hue-rotate/saturate(+blur) glow layers grew GPU memory by hundreds of
MB per section switch until jetsam killed the WebKit GPU process. Baking the section tints (and
the Safari-only 8px blur) into static assets lets iOS render plain images — no runtime filter,
no buffers to allocate. Chromium keeps runtime static filters (Blink caches them well).

Uses the CSS Filter Effects spec matrices for hue-rotate and saturate (NOT ImageMagick's HSL
-modulate, which is different math) so baked pixels match what CSS produced.

Usage: python3 scripts/gen-sidebar-overlays.py  (requires ImageMagick `magick` with AVIF support)
"""
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
IMG = ROOT / 'public/img/sidebar'  # webp outputs (shipped)
SRC = ROOT / 'scripts/sidebar-overlay-src'  # base avif inputs (build-time only, NOT shipped)

# hue/saturate per section — shared with SECTIONS in src/components/Sidebar.tsx via this JSON, so
# the baked webps and the runtime-tinted gradient (tintColor) derive from one source of truth.
TINTS = json.loads((ROOT / 'src/components/sidebarSectionTints.json').read_text())
SECTIONS = [(sec_id, t['hue'], t['saturate']) for sec_id, t in TINTS.items()]
BLUR_PX = 8  # CSS blur(8px), Safari-only at runtime — baked in here.


def hue_rotate_matrix(deg: float):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [
        [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
        [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283],
        [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
    ]


def saturate_matrix(sat: float):
    return [
        [0.213 + 0.787 * sat, 0.715 - 0.715 * sat, 0.072 - 0.072 * sat],
        [0.213 - 0.213 * sat, 0.715 + 0.285 * sat, 0.072 - 0.072 * sat],
        [0.213 - 0.213 * sat, 0.715 - 0.715 * sat, 0.072 + 0.928 * sat],
    ]


def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


for layer in (1, 2):
    src = SRC / f'overlay-layer-{layer}.avif'
    for sec_id, hue, sat in SECTIONS:
        # CSS applies filters left-to-right: hue-rotate THEN saturate → saturate ∘ hue.
        m = matmul(saturate_matrix(sat), hue_rotate_matrix(hue))
        cm = ' '.join(f'{v:.6f}' for row in m for v in row)
        # WebP: these are soft blurred gradients — lossy WebP compresses them ~100x vs PNG
        # with no visible difference at q82.
        out = IMG / f'overlay-layer-{layer}-{sec_id}.webp'
        subprocess.run(
            # 50% resolution: the baked blur makes the downscale invisible, and half-res
            # quarters the GPU compositing bandwidth of these always-resident layers.
            ['magick', str(src), '-color-matrix', f'3x3: {cm}', '-blur', f'0x{BLUR_PX}',
             '-resize', '50%', '-quality', '82', str(out)],
            check=True,
        )
        print(f'{out.name}: {out.stat().st_size // 1024}KB')
