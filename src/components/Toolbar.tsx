/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/
import React, { FC, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Icon from '../@types/Icon'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import subtree from '../selectors/subtree'
import themeColors from '../selectors/themeColors'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'
import TriangleLeft from './TriangleLeft'
import TriangleRight from './TriangleRight'

interface ToolbarIconProps {
  disabled?: boolean
  fontSize: number
  isPressing: boolean
  lastScrollLeft: MutableRefObject<number>
  onTapDown: (id: ShortcutId) => void
  onTapUp: (id: ShortcutId) => void
  shortcutId: ShortcutId
}

/**
 * ToolbarIcon component.
 */
const ToolbarIcon: FC<ToolbarIconProps> = ({
  disabled,
  fontSize,
  lastScrollLeft,
  isPressing,
  onTapDown,
  onTapUp,
  shortcutId,
}) => {
  const shortcut = shortcutById(shortcutId)
  if (!shortcut) {
    throw new Error('Missing shortcut: ' + shortcutId)
  }
  const { svg, exec, isActive, canExecute } = shortcut

  if (!svg) {
    throw new Error('The svg property is required to render a shortcut in the Toolbar. ' + shortcutId)
  }

  const isButtonActive = useSelector((state: State) => !isActive || isActive(() => state))
  const isButtonExecutable = useSelector((state: State) => !canExecute || canExecute(() => state))
  const colors = useSelector(themeColors)

  // TODO: type svg correctly
  const SVG = svg as React.FC<Icon>

  return (
    <div
      aria-label={shortcut.label}
      key={shortcutId}
      style={{
        paddingTop: isButtonExecutable && isPressing ? '10px' : '',
        position: 'relative',
        cursor: isButtonExecutable ? 'pointer' : 'default',
      }}
      className='toolbar-icon'
      onMouseDown={e => {
        // prevents editable blur
        e.preventDefault()
        onTapDown(shortcutId)
      }}
      onMouseUp={() => {
        onTapUp(shortcutId)
      }}
      onTouchStart={() => {
        onTapDown(shortcutId)
      }}
      onTouchEnd={(e: React.TouchEvent) => {
        const iconEl = e.target as HTMLElement
        const toolbarEl = iconEl.closest('.toolbar')!
        const scrollDifference = Math.abs(lastScrollLeft.current - toolbarEl.scrollLeft)

        if (isButtonExecutable && !disabled && scrollDifference < 5) {
          exec(store.dispatch, store.getState, e, { type: 'toolbar' })
        }

        lastScrollLeft.current = toolbarEl.scrollLeft
        onTapUp(shortcutId)
      }}
    >
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

/** Toolbar component. */
const Toolbar = () => {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState<string | undefined>()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState<string | undefined>()
  const [pressingToolbarId, setPressingToolbarId] = useState<string | null>(null)
  // track scrollLeft after each touchend
  // this is used to reset pressingToolbarId when the user has scrolled at least 5px
  const lastScrollLeft = useRef<number>(0)
  const { fontSize, distractionFreeTyping } = useSelector((state: State) => {
    const { fontSize, isLoading, distractionFreeTyping, showHiddenThoughts } = state
    return {
      isLoading,
      fontSize,
      // we cannot know if any one the shortcut's active status has changed, so we re-render every time the thoughts or cursor has changed
      distractionFreeTyping,
      // re-render only
      showHiddenThoughts,
    }
  }, shallowEqual)

  /**********************************************************************
   * Methods
   **********************************************************************/

  /** Shows or hides the toolbar scroll arrows depending on where the scroll bar is. */
  const updateArrows = useCallback(() => {
    const el = toolbarRef.current
    if (el) {
      setLeftArrowElementClassName(el.scrollLeft > 20 ? 'shown' : 'hidden')
      setRightArrowElementClassName(el.offsetWidth + el.scrollLeft < el.scrollWidth - 20 ? 'shown' : 'hidden')
    }
  }, [])

  /** Handles toolbar scroll event. */
  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const scrollDifference = e.target ? Math.abs(lastScrollLeft.current - (e.target as HTMLElement).scrollLeft) : 0

    if (scrollDifference >= 5) {
      setPressingToolbarId(null)
    }

    updateArrows()
  }, [])

  /**********************************************************************
   * Effects
   **********************************************************************/

  useEffect(() => {
    window.addEventListener('resize', updateArrows)
    updateArrows()

    return () => {
      window.removeEventListener('resize', updateArrows)
    }
  }, [])

  // fallback to defaults if user does not have Settings defined
  const visibleShortcutsId = contextToThoughtId(store.getState(), ['Settings', 'Toolbar', 'Visible:'])
  const userShortcutIds = (visibleShortcutsId ? subtree(store.getState(), visibleShortcutsId) : [])
    .map(subthought => subthought.value)
    .filter(shortcutIdString => !!shortcutById(shortcutIdString as ShortcutId)) as ShortcutId[]
  const shortcutIds = userShortcutIds.length > 0 ? userShortcutIds : TOOLBAR_DEFAULT_SHORTCUTS
  const arrowWidth = fontSize / 3

  /**********************************************************************
   * Render
   **********************************************************************/

  return (
    <CSSTransition in={!distractionFreeTyping} timeout={600} classNames='fade-600' unmountOnExit>
      <div aria-label='toolbar' className='toolbar-container'>
        <div
          className='toolbar-mask'
          style={{
            // must scale height with fontSize, since height does not scale linearly with em or px
            height: fontSize + 30,
          }}
        />
        <div>
          <div
            id='toolbar'
            ref={toolbarRef}
            className='toolbar'
            onTouchEnd={e => {
              setPressingToolbarId(null)
            }}
            onScroll={onScroll}
          >
            <span id='left-arrow' className={leftArrowElementClassName}>
              <TriangleLeft width={arrowWidth} height={fontSize} fill='gray' />
            </span>
            {shortcutIds.map(id => (
              <ToolbarIcon
                fontSize={fontSize}
                isPressing={pressingToolbarId === id}
                key={id}
                lastScrollLeft={lastScrollLeft}
                onTapDown={setPressingToolbarId}
                onTapUp={() => setPressingToolbarId(null)}
                shortcutId={id}
              />
            ))}
            <span id='right-arrow' className={rightArrowElementClassName}>
              <TriangleRight width={arrowWidth} height={fontSize} fill='gray' />
            </span>
          </div>
        </div>
      </div>
    </CSSTransition>
  )
}

const ToolbarMemo = React.memo(Toolbar)
ToolbarMemo.displayName = 'Toolbar'

export default ToolbarMemo
