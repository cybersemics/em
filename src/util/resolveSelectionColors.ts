import rgbToHex from './rgbToHex'
import rgbaToHex from './rgbaToHex'

/** Text color applied by a background-color command for contrast against the background (always black, per product design). */
const CONTRAST_COLOR = '#000000'

/** Normalizes a color to an alpha-aware hex so that colors differing only in opacity are not treated as equal — e.g.
 * opaque white (fg, the thought default) vs 50%-alpha white (fgNote, the note default), which both collapse to #ffffff
 * under an alpha-dropping conversion. This is what lets a note be explicitly set to white without being mistaken for a
 * reset to its own (translucent) default (#4657). Passes 6-digit hex inputs (e.g. the default background) through. */
const toComparableColor = (color: string): string => (color.startsWith('#') ? rgbToHex(color) : rgbaToHex(color))

/**
 * Resolves the canonical foreground and background produced by a selection color command.
 *
 * A foreColor sets the text color and clears the background; a backColor sets the background and forces a contrasting
 * (black) text color. A color set to the corresponding theme default clears it instead of applying a redundant
 * default-colored wrapper (foreColor → default text color, backColor → default background), leaving no markup (#3901).
 * This folds ColorPicker's former two-dispatch foreColor + backColor pairing into a single transform (#4637).
 */
const resolveSelectionColors = (
  command: 'foreColor' | 'backColor',
  colorValue: string | undefined,
  defaultColor: string | undefined,
  defaultBackgroundColor: string | undefined,
): { color: string | null; background: string | null } => {
  /** Returns true when the selected color equals the corresponding theme default. */
  const isDefault = (value: string | undefined, defaultValue: string | undefined) =>
    value !== undefined && defaultValue !== undefined && toComparableColor(value) === toComparableColor(defaultValue)

  if (command === 'foreColor') {
    return { color: isDefault(colorValue, defaultColor) ? null : (colorValue ?? null), background: null }
  }

  // a backColor set to the default background clears both the background and the forced contrast color
  if (isDefault(colorValue, defaultBackgroundColor)) return { color: null, background: null }
  return { color: CONTRAST_COLOR, background: colorValue ?? null }
}

export default resolveSelectionColors
