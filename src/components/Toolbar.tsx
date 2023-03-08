/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/
import React, { FC, useEffect, useRef, useState } from 'react'
import { connect, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Icon from '../@types/Icon'
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
  fg: string
  fontSize: number
  isPressing: boolean
  onTapDown: (id: string) => void
  onTapUp: (id: string) => void
  shortcutId: string
}

const ARROW_SCROLL_BUFFER = 20

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { fontSize, isLoading, distractionFreeTyping, showHiddenThoughts } = state

  return {
    isLoading,
    fontSize,
    // We cannot know if any one the shortcut's active status,has changed, so we re-render everytime thoughts or cursor is changed
    distractionFreeTyping,
    // Needed to add this to re-render Toolbar when hidden thought is toggled.
    showHiddenThoughts,
  }
}

/**
 * ToolbarIcon component.
 */
const ToolbarIcon: FC<ToolbarIconProps> = ({ disabled, fg, fontSize, isPressing, onTapDown, onTapUp, shortcutId }) => {
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
      onClick={e => {
        e.preventDefault()
        if (!isButtonExecutable || disabled) return
        exec(store.dispatch, store.getState, e, { type: 'toolbar' })
      }}
    >
      <SVG
        size={fontSize}
        style={{
          cursor: isButtonExecutable ? 'pointer' : 'default',
          fill: isButtonExecutable && isButtonActive ? fg : 'gray',
          width: fontSize + 4,
          height: fontSize + 4,
        }}
      />
    </div>
  )
}

/** Toolbar component. */
const Toolbar = ({ fontSize, distractionFreeTyping }: ReturnType<typeof mapStateToProps>) => {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState<string | undefined>()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState<string | undefined>()
  const [pressingToolbarId, setPressingToolbarId] = useState<string | null>(null)
  // track scrollLeft after each touchend
  // this is used to reset pressingToolbarId when the user has scrolled at least 5px
  const lastScrollLeft = useRef<number>(0)
  const arrowWidth = fontSize / 3
  const colors = useSelector(themeColors)

  /** Shows or hides the toolbar scroll arrows depending on where the scroll bar is. */
  const updateArrows = () => {
    const el = toolbarRef.current
    if (el) {
      setLeftArrowElementClassName(el.scrollLeft > ARROW_SCROLL_BUFFER ? 'shown' : 'hidden')
      setRightArrowElementClassName(
        el.offsetWidth + el.scrollLeft < el.scrollWidth - ARROW_SCROLL_BUFFER ? 'shown' : 'hidden',
      )
    }
  }

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
    .filter(shortcutById)
  const shortcutIds = userShortcutIds.length > 0 ? userShortcutIds : TOOLBAR_DEFAULT_SHORTCUTS

  /**********************************************************************
   * Event Handlers
   **********************************************************************/

  /** Handles toolbar scroll event. */
  const onScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrollDifference = e.target ? Math.abs(lastScrollLeft.current - (e.target as HTMLElement).scrollLeft) : 0

    if (scrollDifference >= 5) {
      setPressingToolbarId(null)
    }

    updateArrows()
  }

  /**********************************************************************
   * Render
   **********************************************************************/

  return (
    <CSSTransition in={!distractionFreeTyping} timeout={600} classNames='fade-600' unmountOnExit>
      <div aria-label='toolbar' className='toolbar-container'>
        <div className='toolbar-mask' />
        <div>
          <div
            id='toolbar'
            ref={toolbarRef}
            className='toolbar'
            onTouchEnd={e => {
              setPressingToolbarId(null)
              if (e.target) {
                lastScrollLeft.current = (e.target as HTMLElement).scrollLeft
              }
            }}
            onScroll={onScroll}
          >
            <span id='left-arrow' className={leftArrowElementClassName}>
              <TriangleLeft width={arrowWidth} height={fontSize} fill='gray' />
            </span>
            {shortcutIds.map(id => (
              <ToolbarIcon
                fg={colors.fg}
                fontSize={fontSize}
                isPressing={pressingToolbarId === id}
                key={id}
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

export default connect(mapStateToProps)(Toolbar)
