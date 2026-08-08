#!/usr/bin/env bash
# Regenerates the Command Center active-button glow asset.
#
# The glow is a pre-blurred blue->purple bloom, baked at build time so the WebView never runs a
# `filter: blur` under a mix-blend-mode at runtime (that combination corrupts Android's GPU
# compositor). Colors mirror {colors.commandCenterBlue} -> {colors.commandCenterPurple} and the
# 180deg direction of --active-glow-gradient in panda.config.ts. If those change, update here.
#
# Requires ImageMagick 7 (`magick`). Run from the repo root: bash scripts/gen-active-glow.sh
set -euo pipefail

OUT="public/img/command-center/active-glow.png"
BLUE="#6a9ab5"    # colors.commandCenterBlue
PURPLE="#2d087e"  # colors.commandCenterPurple
mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Full-canvas vertical gradient (blue top -> purple bottom). Full-bleed so masking the alpha
# never pulls black into the RGB (avoids dark halos around the soft edge).
magick -size 256x256 gradient:"${BLUE}-${PURPLE}" "$TMP/grad.png"

# Soft alpha mask: a heavily-feathered rounded-rect blob approximating the old ~23px blur.
magick -size 256x256 xc:black -fill white \
  -draw "roundrectangle 48,48,208,208,36,36" -blur 0x28 "$TMP/mask.png"

# Combine gradient RGB with the soft blob alpha; flatten to 8-bit and strip metadata.
magick "$TMP/grad.png" "$TMP/mask.png" -alpha off -compose CopyOpacity -composite \
  -depth 8 -strip "$OUT"

echo "Wrote $OUT"
