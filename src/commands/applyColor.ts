import Command from '../@types/Command'
import Key from '../@types/Key'
import { formatSelectionColorActionCreator as formatSelectionColor } from '../actions/formatSelectionColor'
import { ColorToken } from '../colors.config'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** The swatch colors, in the order they appear in the ColorPicker. Applies to both the text color and background color rows. */
const swatchColors: ColorToken[] = ['fg', 'gray', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red']

/** A keyboard shortcut and the color it applies. Text colors are bound to Cmd/Ctrl + Option/Alt + <n> and background colors to Option/Alt + <n>, where <n> is the 0-based swatch position (0 is the default color). */
type ColorShortcut = { keyboard: Key; color?: ColorToken; backgroundColor?: ColorToken }

/** Ordered color shortcuts. The index of each entry corresponds to the index of its keyboard shortcut in the command's keyboard array. */
const colorShortcuts: ColorShortcut[] = [
  ...swatchColors.map((color, i): ColorShortcut => ({ keyboard: { key: `${i}`, meta: true, alt: true }, color })),
  ...swatchColors.map((backgroundColor, i): ColorShortcut => ({
    keyboard: { key: `${i}`, alt: true },
    backgroundColor,
  })),
]

/** Applies a text color or background color to the cursor thought or all selected thoughts via a keyboard shortcut, equivalent to tapping the corresponding swatch in the color picker. */
const applyColor: Command = {
  id: 'applyColor',
  label: 'Apply Color',
  description: `Applies a text color to the cursor: ${swatchColors
    .map((color, i) => `${i} ${i === 0 ? 'default' : color}`)
    .join(', ')}. Use Option/Alt + the same number to apply a background color.`,
  keyboard: colorShortcuts.map(shortcut => shortcut.keyboard),
  // The command is bound to a shortcut per color, so display the range of digits rather than a single shortcut.
  keyboardDisplay: { key: `0-${swatchColors.length - 1}`, meta: true, alt: true },
  // formatSelectionColor already applies the color to every selected thought itself, through formatSelection's
  // multicursor branch, which brackets the edits with setIsMulticursorExecuting so they collapse into a single undo
  // step — the same path as tapping a swatch in the ColorPicker on a multiselect. A single dispatch therefore covers
  // the whole multiselect. The per-cursor loop of multicursor: true would re-enter that branch once per selected
  // thought and prematurely end its undo bracket after the first iteration.
  multicursor: false,
  hideFromGestureMenu: true,
  canExecute: state => isDocumentEditable() && (!!state.cursor || hasMulticursor(state)),
  exec: (dispatch, _getState, _e, { keyboardIndex }) => {
    if (keyboardIndex == null) return
    const shortcut = colorShortcuts[keyboardIndex]
    if (!shortcut) return
    dispatch(formatSelectionColor({ color: shortcut.color, backgroundColor: shortcut.backgroundColor }))
  },
}

export default applyColor
