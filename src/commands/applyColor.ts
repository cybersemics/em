import Command from '../@types/Command'
import Key from '../@types/Key'
import { formatSelectionColorActionCreator as formatSelectionColor } from '../actions/formatSelectionColor'
import { ColorToken } from '../colors.config'
import isDocumentEditable from '../util/isDocumentEditable'

/** The swatch colors, in the order they appear in the ColorPicker. Applies to both the text color and background color rows. */
const swatchColors: ColorToken[] = ['fg', 'gray', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red']

/** A keyboard shortcut and the color it applies. Text colors are bound to Cmd/Ctrl + Shift + <n> and background colors to Alt + <n>, where <n> is the 1-based swatch position. */
type ColorShortcut = { keyboard: Key; color?: ColorToken; backgroundColor?: ColorToken }

/** Ordered color shortcuts. The index of each entry corresponds to the index of its keyboard shortcut in the command's keyboard array. */
const colorShortcuts: ColorShortcut[] = [
  ...swatchColors.map((color, i): ColorShortcut => ({ keyboard: { key: `${i + 1}`, meta: true, shift: true }, color })),
  ...swatchColors.map(
    (backgroundColor, i): ColorShortcut => ({ keyboard: { key: `${i + 1}`, alt: true }, backgroundColor }),
  ),
]

/** Applies a text color or background color to the cursor thought via a keyboard shortcut, equivalent to tapping the corresponding swatch in the color picker. */
const applyColor: Command = {
  id: 'applyColor',
  label: 'Apply Color',
  description: 'Applies a text color or background color to the cursor via a keyboard shortcut.',
  keyboard: colorShortcuts.map(shortcut => shortcut.keyboard),
  multicursor: {
    disallow: true,
    error: 'Cannot change text color with multiple thoughts.',
  },
  hideFromHelp: true,
  hideFromDesktopCommandUniverse: true,
  hideFromGestureMenu: true,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  exec: (dispatch, _getState, _e, { keyboardIndex }) => {
    if (keyboardIndex == null) return
    const shortcut = colorShortcuts[keyboardIndex]
    if (!shortcut) return
    dispatch(formatSelectionColor({ color: shortcut.color, backgroundColor: shortcut.backgroundColor }))
  },
}

export default applyColor
