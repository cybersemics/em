# Converting Figma lighting to CSS

The Command Universe's desktop lighting comes from Figma's “Desktop / Command Palette / #2a” frame. The lights are written as fixed gradients in [`src/recipes/dialogRecipe.ts`](../../src/recipes/dialogRecipe.ts). This page explains how those values were derived, so a changed design can be converted the same way. Nothing here runs in the app.

## Soft elliptical lights

A two-stop radial gradient fades opacity linearly, which reads as a hard-edged disc. The lights instead use a bell-shaped falloff:

```text
opacity(t) = peakOpacity × exp(−4.5 × t²)
```

`t` is the distance from the centre divided by the ellipse's radius. Sample it at `t = 0, 0.1, …, 1`, round each alpha to four decimals, and set the last one to zero. Those eleven values become `rgba()` stops at 0%, 10%, …, 100% in a `radial-gradient(horizontalRadius verticalRadius at centerX centerY, …)`.

A compound light is several of these layered: the room light (`roomLight`) is five ellipses, and the wash over the panel (`topLight`) is four. Their geometry, colours and stops are fixed artwork, not settings to tune at runtime.

## Converting luminance masks

Figma fades white to transparent differently from how CSS fades an alpha mask. The glass's shared falloff (`desktopLightMaskOnGlass`) matches Figma's with:

```text
brightness(t) = inner + (outer − inner) × t
cssAlpha(t) = brightness(t) ^ 2.2
```

For the glass, inner is 1 and outer is 0. Eleven samples, rounded to three decimals, give the alphas 1, 0.793, 0.612, 0.456, 0.325, 0.218, 0.133, 0.071, 0.029, 0.006 and 0, written as black `rgba()` stops in a CSS alpha mask.

The 2.2 exponent was measured for this mask, not a general rule of Figma or browsers. If a falloff that doesn't reach zero shows a ring where it levels out, smoothstep progress (`3t² − 2t³`) in place of `t` removes it.

## Geometry and verification

The reference glass is 678px wide. The glass positioner is an inline-size container, so dividing a Figma distance in pixels by 6.78 gives `cqw`, and the room light and washes scale with the panel. The glass fill and edge share one falloff. The streak images have their blur baked in.

To check a conversion, export the Figma frame and compare it at the same panel size, on both a tall and a narrow panel. Look for banding in the dark, gradual colours in each target browser. Large lights are gradients rather than images because Chrome dithers gradients and decoded images banded; for the same reason, each light's opacity is in its colour stops rather than on a faded parent layer.

The glass blur and the glass share a containing block, so CSS keeps the blur aligned with the glass. A backdrop filter breaks when an ancestor's opacity animates, so the blur and each surface fade individually, while their common container only scales.
