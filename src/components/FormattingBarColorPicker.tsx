import { RefObject } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { formatSelectionColorActionCreator as formatSelectionColor } from '../actions/formatSelectionColor'
import { ColorToken } from '../colors.config'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import viewportStore from '../stores/viewportStore'
import isColorSelected from '../util/isColorSelected'
import FormattingBarPickerButton from './FormattingBarPickerButton'
import FormattingBarPopover from './FormattingBarPopover'
import TextColorIcon from './icons/TextColor'

/** The palette shared by the foreground and background rows. */
const colors: ColorToken[] = ['fg', 'gray', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red']

/** The original color palette's visual icon box in pixels. */
const SWATCH_ICON_SIZE = 32.88

/** The Formatting Bar's color picker, using the existing selection-color action and selected-color predicate. */
const FormattingBarColorPicker = ({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) => {
  const dispatch = useDispatch()
  const show = useSelector(state => state.showColorPicker)
  const theme = useSelector(themeColors)
  const foreColor = commandStateStore.useSelector(state => state.foreColor)
  const backColor = commandStateStore.useSelector(state => state.backColor)
  const viewportWidth = viewportStore.useSelector(state => state.innerWidth)
  // Preserve the original 2px padding and nine swatches per row within the popover's 30px screen margins.
  const swatchIconSize = Math.min(SWATCH_ICON_SIZE, (viewportWidth - 60) / colors.length - 4)

  /** Returns whether the swatch of the given color in the given row matches the selection's color. */
  const matches = (kind: 'foreground' | 'background', color: ColorToken) =>
    isColorSelected(theme, { foreColor, backColor }, kind === 'foreground' ? { color } : { backgroundColor: color })
  const foregroundMatched = colors.some(color => matches('foreground', color))
  const backgroundMatched = colors.some(color => matches('background', color))

  /** Returns whether the swatch is shown as selected. Text with no color of its own matches no swatch, since the command state reports the editor's default colors as no color at all, so the default text color swatch stands for it. */
  const isSelected = (kind: 'foreground' | 'background', color: ColorToken) =>
    matches(kind, color) || (kind === 'foreground' && color === 'fg' && !foregroundMatched && !backgroundMatched)

  // Setting either color clears the other's selection, so the two rows share one selected tile, which slides between
  // them. Should both rows ever have a selection, the background row draws its own tile, since two tiles cannot share a
  // layoutId.
  const bothRowsSelected = foregroundMatched && backgroundMatched

  return (
    <FormattingBarPopover
      anchorRef={anchorRef}
      ariaLabel='Color Picker'
      show={show}
      title='Color'
      description='Choose a text or background color for your thoughts.'
    >
      {(['foreground', 'background'] as const).map(kind => (
        <div
          key={kind}
          aria-label={kind === 'foreground' ? 'text color swatches' : 'background color swatches'}
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            maxWidth: '100%',
            // The selected swatch's heavier letter fades in rather than switching on.
            '& svg line': {
              transition: 'stroke-width {durations.fast} ease-in-out',
            },
          })}
        >
          {colors.map(color => {
            const swatch = kind === 'foreground' ? { color } : { backgroundColor: color }
            const selected = isSelected(kind, color)
            return (
              <FormattingBarPickerButton
                key={color}
                Icon={TextColorIcon}
                iconSize={swatchIconSize}
                padding={2}
                label={color === 'fg' ? (kind === 'foreground' ? 'default' : 'inverse') : color}
                selected={selected}
                selectionGroup={bothRowsSelected && kind === 'background' ? 'color-background' : 'color'}
                // No outline around the selected swatch, which the selected tile already marks.
                fill='none'
                style={{
                  color: kind === 'foreground' ? token(`colors.${color}`) : token('colors.bg'),
                  backgroundColor: kind === 'background' ? token(`colors.${color}`) : undefined,
                  fontWeight: selected ? 'bold' : 'normal',
                }}
                onSelect={() => dispatch(formatSelectionColor(swatch))}
              />
            )
          })}
        </div>
      ))}
    </FormattingBarPopover>
  )
}

export default FormattingBarColorPicker
