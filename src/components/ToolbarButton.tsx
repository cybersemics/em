import React, { FC, MutableRefObject } from 'react'
import { useSelector } from 'react-redux'
import Icon from '../@types/Icon'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import themeColors from '../selectors/themeColors'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'

interface ToolbarButtonProps {
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
const ToolbarButton: FC<ToolbarButtonProps> = ({
  customize,
  disabled,
  fontSize,
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

  // TODO: type svg correctly
  const SVG = svg as React.FC<Icon>

  return (
    <div
      aria-label={shortcut.label}
      key={shortcutId}
      style={{
        top: isButtonExecutable && isPressing ? 10 : 0,
        position: 'relative',
        cursor: isButtonExecutable ? 'pointer' : 'default',
      }}
      className='toolbar-icon'
      onMouseDown={e => {
        // prevents editable blur
        e.preventDefault()
        onTapDown?.(e)
      }}
      onMouseUp={(e: React.MouseEvent) => {
        const iconEl = e.target as HTMLElement
        const toolbarEl = iconEl.closest('.toolbar')!
        const scrollDifference = Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft)

        if (!customize && isButtonExecutable && !disabled && scrollDifference < 5) {
          exec(store.dispatch, store.getState, e, { type: 'toolbar' })
        }

        lastScrollLeft.current = toolbarEl.scrollLeft
        onTapUp?.(e)
      }}
      onTouchStart={e => {
        onTapDown?.(e)
      }}
      onTouchEnd={(e: React.TouchEvent) => {
        const iconEl = e.target as HTMLElement
        const toolbarEl = iconEl.closest('.toolbar')!
        const scrollDifference = Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft)

        if (!customize && isButtonExecutable && !disabled && scrollDifference < 5) {
          exec(store.dispatch, store.getState, e, { type: 'toolbar' })
        }

        lastScrollLeft.current = toolbarEl.scrollLeft
        onTapUp?.(e)
      }}
    >
      {selected && <div style={{ height: 2, backgroundColor: colors.highlight }}></div>}
      <SVG
        size={fontSize}
        style={{
          cursor: isButtonExecutable ? 'pointer' : 'default',
          fill: isButtonExecutable && isButtonActive ? colors.fg : 'gray',
          width: fontSize + 4,
          height: fontSize + 4,
        }}
      />
    </div>
  )
}

export default ToolbarButton
