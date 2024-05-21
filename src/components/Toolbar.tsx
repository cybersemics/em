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
import { TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import getUserToolbar from '../selectors/getUserToolbar'
import { shortcutById } from '../shortcuts'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
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
  // track scrollLeft after each touchend
  // this is used to reset pressingToolbarId when the user has scrolled at least 5px
  const lastScrollLeft = useRef<number>(0)
  const toolbarContainerRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [leftArrowElementClassName, setLeftArrowElementClassName] = useState<string | undefined>('hidden')
  const [rightArrowElementClassName, setRightArrowElementClassName] = useState<string | undefined>('shown')
  const [pressingToolbarId, setPressingToolbarId] = useState<string | null>(null)
  const isDraggingAny = useSelector(state => !!state.dragShortcut)
  const distractionFreeTyping = distractionFreeTypingStore.useState()
  const fontSize = useSelector(state => state.fontSize)
  const arrowWidth = fontSize / 3

  // re-render only (why?)
  useSelector(state => state.showHiddenThoughts)

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
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const scrollDifference = e.target ? Math.abs(lastScrollLeft.current - (e.target as HTMLElement).scrollLeft) : 0

      if (scrollDifference >= 5) {
        setPressingToolbarId(null)
      }

      updateArrows()
    },
    [updateArrows],
  )

  /**********************************************************************
   * Effects
   **********************************************************************/

  useEffect(() => {
    window.addEventListener('resize', updateArrows)
    updateArrows()

    return () => {
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  // disable pressing on drag
  useEffect(() => {
    if (isDraggingAny) {
      setPressingToolbarId(null)
    }
  }, [isDraggingAny, setPressingToolbarId])

  /**********************************************************************
   * Render
   **********************************************************************/

  // custom user toolbar
  // fall back to defaults if user does not have Settings defined
  const shortcutIds = useSelector(state => {
    const userShortcutIds = getUserToolbar(state)
    return userShortcutIds || state.storageCache?.userToolbar || TOOLBAR_DEFAULT_SHORTCUTS
  }, shallowEqual)

  const onTapCancel = useCallback(() => {
    setPressingToolbarId(null)
  }, [])

  const onTapUp = useCallback(
    id => {
      setPressingToolbarId(null)
      onSelect?.(shortcutById(id))
    },
    [onSelect],
  )

  return (
    <CSSTransition
      nodeRef={toolbarContainerRef}
      in={!distractionFreeTyping}
      timeout={600}
      classNames='fade-600'
      unmountOnExit
    >
      <div
        ref={toolbarContainerRef}
        aria-label='toolbar'
        className={classNames({
          'toolbar-container': true,
          'toolbar-fixed': !customize,
        })}
        style={{
          // make toolbar flush with left padding
          marginLeft: customize ? -5 : 0,
          // offset extended drop area of ToolbarButton
          marginBottom: isDraggingAny ? '-7em' : 0,
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
                  onTapDown={setPressingToolbarId}
                  onTapUp={onTapUp}
                  onTapCancel={onTapCancel}
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
