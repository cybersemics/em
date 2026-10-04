import { motion } from 'motion/react'
import { ComponentType, MouseEvent, TouchEvent } from 'react'
import { css } from '../../styled-system/css'
import { formattingBarOptionRecipe } from '../../styled-system/recipes'
import IconType from '../@types/IconType'
import { isTouch } from '../browser'
import durations from '../util/durations'
import fastClick from '../util/fastClick'
import haptics from '../util/haptics'
import FormattingBarIcon from './FormattingBarIcon'

/** An option in a Formatting Bar picker, with the bar's actual icon size and focus-preserving touch activation. */
const FormattingBarPickerButton = ({
  Icon,
  label,
  selected,
  selectionGroup,
  onSelect,
  iconSize,
  padding = 4,
  ...iconProps
}: Omit<IconType, 'size' | 'cssRaw'> & {
  Icon: ComponentType<IconType>
  label: string
  selected: boolean
  /** Names the set of options that one selection moves between, e.g. a row of the Color Picker. The selected tile slides between the options of a group as the selection changes. */
  selectionGroup: string
  /** Explicit dimensions for options such as the color palette, which has its own established size. */
  iconSize: number
  padding?: number
  onSelect: (event: MouseEvent | TouchEvent) => void
}) => {
  const buttonSize = Math.max(28, iconSize + padding * 2)

  /** Applies the option on release while preserving the editor's focus and cancelling the synthetic click. */
  const activate = (event: MouseEvent | TouchEvent) => {
    event.preventDefault()
    event.stopPropagation()
    haptics.light()
    onSelect(event)
  }

  return (
    <button
      type='button'
      title={label}
      aria-label={label}
      aria-pressed={selected}
      data-selected={selected ? 'true' : 'false'}
      className={formattingBarOptionRecipe()}
      style={{ width: buttonSize, height: buttonSize }}
      {...fastClick(
        event => {
          // Touch already activated on release. Consume a following click without applying the option again.
          event.preventDefault()
          event.stopPropagation()
          if (!isTouch) activate(event)
        },
        {
          enableHaptics: false,
          tapDown: event => {
            event.stopPropagation()
            if (!isTouch) event.preventDefault()
          },
        },
      )}
      // React's passive touchstart cannot suppress iOS's synthetic mouse events; cancel them on release (#5608).
      onTouchEnd={isTouch ? activate : undefined}
    >
      {selected && (
        // The selected tile. Options of a group share its layoutId, so when the selection moves, motion animates the
        // new option's tile from where the old one was. One that appears without an old one, such as when the picker
        // opens, just appears. Its negative z-index puts it behind the icons of every option in the popover, not just
        // its own, so it passes under the icons of the options it slides across. That relies on the option not being a
        // stacking context of its own.
        <motion.span
          aria-hidden='true'
          layoutId={`formatting-bar-selected-option-${selectionGroup}`}
          transition={{ duration: durations.get('fast') / 1000, ease: 'easeInOut' }}
          className={css({
            position: 'absolute',
            inset: '-1px',
            zIndex: -1,
            borderRadius: '6px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'formattingBarPopoverSelectedBorder',
            backgroundColor: 'formattingBarPopoverSelectedBg',
            pointerEvents: 'none',
          })}
        />
      )}
      <FormattingBarIcon Icon={Icon} size={iconSize} {...iconProps} />
    </button>
  )
}

export default FormattingBarPickerButton
