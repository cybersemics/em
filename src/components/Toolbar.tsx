/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/
import classNames from 'classnames'
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import ShortcutType from '../@types/Shortcut'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import subtree from '../selectors/subtree'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'
import ToolbarButton from './ToolbarButton'
import TriangleLeft from './TriangleLeft'
import TriangleRight from './TriangleRight'

interface ToolbarProps {
  // places the toolbar into customize mode where buttons can be dragged and dropped.
  customize?: boolean
  onSelect?: (shortcut: ShortcutType) => void
  selected?: ShortcutId
}

/** Toolbar component. */
const Toolbar: FC<ToolbarProps> = ({ customize, onSelect, selected }) => {
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
      <div
        aria-label='toolbar'
        className={classNames({
          'toolbar-container': true,
          'toolbar-fixed': !customize,
        })}
      >
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
            style={{
              maxWidth: customize ? '100%' : 'calc(100% - 3em)',
            }}
          >
            <span id='left-arrow' className={leftArrowElementClassName}>
              <TriangleLeft width={arrowWidth} height={fontSize} fill='gray' />
            </span>
            {shortcutIds.map(id => (
              <ToolbarButton
                customize={customize}
                fontSize={fontSize}
                isPressing={pressingToolbarId === id}
                key={id}
                lastScrollLeft={lastScrollLeft}
                onTapDown={e => {
                  setPressingToolbarId(id)
                }}
                onTapUp={() => {
                  setPressingToolbarId(null)
                  onSelect?.(shortcutById(id)!)
                }}
                selected={selected === id}
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
