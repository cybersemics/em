import React, { FC, MutableRefObject } from 'react'
import { useSelector } from 'react-redux'
import DragToolbarZone from '../@types/DragToolbarZone'
import Icon from '../@types/Icon'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import { isTouch } from '../browser'
import useToolbarLongPress from '../hooks/useToolbarLongPress'
import themeColors from '../selectors/themeColors'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'
import onTapDownProps from '../util/onTapDown'
import onTapUpProps from '../util/onTapUp'
import DragAndDropToolbarButton, { DraggableToolbarButtonProps } from './DragAndDropToolbarButton'

export interface ToolbarButtonProps {
  // see ToolbarProps.customize
  customize?: boolean
  disabled?: boolean
  fontSize: number
  isPressing: boolean
  lastScrollLeft: MutableRefObject<number>
  onTapUp?: (e: React.MouseEvent | React.TouchEvent) => void
  onTapDown?: (e: React.MouseEvent | React.TouchEvent) => void
  selected?: boolean
  shortcutId: ShortcutId
}

/** A single button in the Toolbar. */
const ToolbarButtonComponent: FC<DraggableToolbarButtonProps> = ({
  customize,
  disabled,
  dragSource,
  dropTarget,
  fontSize,
  isDragging,
  isHovering,
  isPressing,
  lastScrollLeft,
  onTapUp,
  onTapDown,
  selected,
  shortcutId,
}) => {
  const colors = useSelector(themeColors)
  const shortcut = shortcutById(shortcutId)
  if (!shortcut) {
    throw new Error('Missing shortcut: ' + shortcutId)
  }
  const { svg, exec, isActive, canExecute } = shortcut

  if (!svg) {
    throw new Error('The svg property is required to render a shortcut in the Toolbar. ' + shortcutId)
  }

  const isButtonActive = useSelector((state: State) => (customize ? selected : !isActive || isActive(() => state)))
  const isButtonExecutable = useSelector((state: State) => customize || !canExecute || canExecute(() => state))
  const longPress = useToolbarLongPress({
    disabled: !customize,
    isDragging,
    shortcut,
    sourceZone: DragToolbarZone.Toolbar,
  })

  // TODO: type svg correctly
  const SVG = svg as React.FC<Icon>

  return dropTarget(
    dragSource(
      <div
        {...longPress.props}
        aria-label={shortcut.label}
        key={shortcutId}
        style={{
          // offset top to avoid changing container height
          // marginBottom: isPressing ? -10 : 0,
          // top: isButtonExecutable && isPressing ? 10 : 0,
          transform: `translateY(${
            isButtonExecutable && isPressing && !longPress.isPressed && !isDragging ? 0.25 : 0
          }em`,
          position: 'relative',
          cursor: isButtonExecutable ? 'pointer' : 'default',
          transition: 'transform 200ms ease-out',
        }}
        className='toolbar-icon'
        // tapDown
        {...onTapDownProps((e: React.MouseEvent | React.TouchEvent) => {
          longPress.props[isTouch ? 'onTouchStart' : 'onMouseDown'](e)

          // prevents editable blur
          if (!customize) {
            e.preventDefault()
          }
          onTapDown?.(e)
        })}
        // tapUp
        {...onTapUpProps((e: React.MouseEvent | React.TouchEvent) => {
          longPress.props[isTouch ? 'onTouchEnd' : 'onMouseUp'](e)
          const iconEl = e.target as HTMLElement
          const toolbarEl = iconEl.closest('.toolbar')!
          const scrollDifference = Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft)

          if (!customize && isButtonExecutable && !disabled && scrollDifference < 5) {
            exec(store.dispatch, store.getState, e, { type: 'toolbar' })
          }

          lastScrollLeft.current = toolbarEl.scrollLeft
          onTapUp?.(e)
        })}
      >
        {selected && <div style={{ height: 2, backgroundColor: colors.highlight }}></div>}

        {
          // invert colors while long pressing or dragging
          // cannot wrap SVG and maintain proper height since SVG has top-padding
          (longPress.isPressed || isDragging) && (
            <div
              style={{
                width: fontSize + 15,
                height: fontSize + 15,
                backgroundColor: colors.fg,
                position: 'absolute',
                zIndex: -1,
                top: 9,
                left: 2,
              }}
            ></div>
          )
        }
        {
          // drop hover
          isHovering && (
            <div
              style={{
                borderRadius: 3,
                position: 'absolute',
                top: '18%',
                left: -2,
                // match the height of the inverted button
                height: '66.666%',
                width: 3,
                backgroundColor: colors.highlight,
              }}
            />
          )
        }
        <SVG
          size={fontSize}
          style={{
            position: 'relative',
            cursor: isButtonExecutable ? 'pointer' : 'default',
            fill:
              longPress.isPressed || isDragging ? colors.bg : isButtonExecutable && isButtonActive ? colors.fg : 'gray',
            width: fontSize + 4,
            height: fontSize + 4,
          }}
        />
      </div>,
    ),
  )
}

// export drag and drop higher order toolbar button component
const ToolbarButton = DragAndDropToolbarButton(ToolbarButtonComponent)

export default ToolbarButton
