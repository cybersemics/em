# Converting Figma lighting to CSS

The Command Universe lighting was derived from Figma's “Desktop / Command Palette / #2a” frame through the Figma MCP connection. Keep the resulting fixed gradients explicit in `src/recipes/dialogRecipe.ts`; the mathematical construction below is an authoring technique, not an application API.

## Soft elliptical lights

An ordinary two-stop radial gradient interpolates opacity linearly. A soft light can instead be approximated with a bell-shaped falloff:

```text
opacity(t) = peakOpacity × exp(−4.5 × t²)
```

Here `t` is radial distance divided by the ellipse's radius. Sample at `t = 0, 0.1, …, 1`, round the resulting alpha values to four decimals, and force the final stop to zero. Write those eleven values as explicit `rgba()` stops at 0%, 10%, …, 100% in a `radial-gradient(horizontalRadius verticalRadius at centerX centerY, …)` declaration. This technique was called `bellGradient` in the original conversion; it is not a CSS function.

Layer several gradients to reproduce a compound light. The original room light used five fitted ellipses and the foreground wash used four. Their geometry, colors and sampled stops are retained explicitly in the recipe. They are fixed artwork, not runtime tuning controls.

## Converting luminance masks

The original conversion observed different Figma falloffs for white fading to transparent and opaque white fading to grey. Its transparent mask was fitted using:

```text
brightness(t) = inner + (outer − inner) × t
cssAlpha(t) = brightness(t) ^ 2.2
```

For this glass mask, inner is 1 and outer is 0. Eleven samples, rounded to three decimals, produce alphas 1, 0.793, 0.612, 0.456, 0.325, 0.218, 0.133, 0.071, 0.029, 0.006, 0. These become black RGBA stops in a CSS alpha mask. The name `luminanceMaskStops` referred to the Figma source; its generated CSS used alpha masking.

The helper also supported a direct brightness interpolation and smoothstep progress (`3t² − 2t³`) to avoid a ring where a nonzero falloff levels out. Neither option was used for this mask. Treat the 2.2 fit as a measured property of this conversion, not a universal Figma or browser rule.

## Geometry and verification

The reference glass was 678px wide. Container query units preserve the lighting geometry relative to its panel: divide a Figma pixel distance by 6.78 to obtain `cqw`. The glass fill and edge share a falloff; the background room light and foreground washes scale with panel width. The streak images have their blur baked in.

Export the Figma reference, compare it at the same panel size, and inspect both tall and narrow panels. Check dark gradual colors for banding in each target browser. The original conversion used CSS gradients to avoid banding observed with decoded images; opacity was placed in the color stops rather than on an enclosing faded layer. Those observations should be rechecked when converting new designs or changing compositing.

The glass blur and glass surface share a containing block. Keep backdrop filters outside ancestors whose opacity is animated: fade the blur and foreground surfaces individually, while their common layout container owns scale. This lets CSS keep the blur aligned without copying element coordinates or dimensions from JavaScript.
