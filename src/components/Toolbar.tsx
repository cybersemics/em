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
import { EM_TOKEN, TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import { shortcutById } from '../shortcuts'
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
  const arrowWidth = fontSize / 3

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

  /**********************************************************************
   * Render
   **********************************************************************/

  // fallback to defaults if user does not have Settings defined
  // const shortcutIds = TOOLBAR_DEFAULT_SHORTCUTS
  const shortcutIds = useSelector((state: State) => {
    const userShortcutsThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
    const userShortcutIds = (userShortcutsThoughtId ? getChildrenRanked(state, userShortcutsThoughtId) : [])
      .map(subthought => subthought.value)
      .filter(shortcutIdString => !!shortcutById(shortcutIdString as ShortcutId)) as ShortcutId[]
    return userShortcutIds.length > 0 ? userShortcutIds : TOOLBAR_DEFAULT_SHORTCUTS
  }, shallowEqual)

  return (
    <CSSTransition in={!distractionFreeTyping} timeout={600} classNames='fade-600' unmountOnExit>
      <div
        aria-label='toolbar'
        className={classNames({
          'toolbar-container': true,
          'toolbar-fixed': !customize,
        })}
        style={{
          // make toolbar flush with left padding
          marginLeft: customize ? -5 : 0,
        }}
      >
        <div
          className='toolbar-mask'
          style={{
            // must scale height with fontSize, since height does not scale linearly with em or px
            height: fontSize + 30,
          }}
        />
        <div>
          <span id='left-arrow' className={leftArrowElementClassName}>
            <TriangleLeft width={arrowWidth} height={fontSize} fill='gray' />
          </span>
          <div
            id='toolbar'
            ref={toolbarRef}
            className='toolbar'
            onTouchEnd={e => {
              setPressingToolbarId(null)
            }}
            onScroll={onScroll}
            style={{
              marginLeft: customize ? -3 : 0,
              paddingLeft: customize ? 3 : 0,
            }}
          >
            {shortcutIds.map(id => {
              return (
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
              )
            })}
          </div>

          <span id='right-arrow' className={rightArrowElementClassName}>
            <TriangleRight width={arrowWidth} height={fontSize} fill='gray' />
          </span>
        </div>
      </div>
    </CSSTransition>
  )
}

const ToolbarMemo = React.memo(Toolbar)
ToolbarMemo.displayName = 'Toolbar'

export default ToolbarMemo
