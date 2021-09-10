/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/

import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { connect, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { shortcutById } from '../shortcuts'
import { isTouch } from '../browser'
import { store } from '../store'
import { overlayHide, overlayReveal, scrollPrioritize } from '../action-creators/toolbar'
import { SCROLL_PRIORITIZATION_TIMEOUT, SHORTCUT_HINT_OVERLAY_TIMEOUT, TOOLBAR_DEFAULT_SHORTCUTS } from '../constants'
import { subtree, theme } from '../selectors'
import { Icon, State, Timer } from '../@types'
import { createSelector } from 'reselect'

// components
import TriangleLeft from './TriangleLeft'
import TriangleRight from './TriangleRight'
import Shortcut from './Shortcut'

const ARROW_SCROLL_BUFFER = 20

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { fontSize, isLoading, toolbarOverlay, scrollPrioritized, showTopControls, showHiddenThoughts } = state

  return {
    dark: theme(state) !== 'Light',
    isLoading,
    fontSize,
    scrollPrioritized,
    toolbarOverlay,
    // We cannot know if any one the shortcut's active status,has changed, so we re-render everytime thoughts or cursor is changed
    showTopControls,
    // Needed to add this to re-render Toolbar when hidden thought is toggled.
    showHiddenThoughts,
  }
}

interface ToolbarIconProps {
  shortcutId: string
  isPressing: boolean
  startOverlayTimer: (id: string) => void
  clearHoldTimer: () => void
  setPressingToolbarId: (id: string) => void
  fontSize: number
  fg: string
}

/**
 * Selects thoughts from the state.
 */
const thoughtsSelector = (state: State) => state.thoughts
/**
 * Selects cursor from the state.
 */
const cursorSelector = (state: State) => state.cursor

/**
 * Creates new memoized selector with a boolean function as a tranform function. It  only recomputes on change in thoughts and cursor.
 */
const makeBooleanSelector = (check: () => boolean) => createSelector([thoughtsSelector, cursorSelector], () => check())

/**
 * ToolbarIcon component.
 */
const ToolbarIcon: FC<ToolbarIconProps> = ({
  shortcutId,
  isPressing,
  startOverlayTimer,
  clearHoldTimer,
  setPressingToolbarId,
  fontSize,
  fg,
}) => {
  const shortcut = shortcutById(shortcutId)
  if (!shortcut) {
    throw new Error('Missing shortcut: ' + shortcutId)
  }
  const { svg, exec, isActive, canExecute } = shortcut

  if (!svg) {
    throw new Error('The svg property is required to render a shortcut in the Toolbar. ' + shortcutId)
  }

  const isActiveSelector = useCallback(isActive ? makeBooleanSelector(() => isActive(store.getState)) : () => true, [
    isActive,
  ])

  const canExecuteSelector = useCallback(
    canExecute ? makeBooleanSelector(() => canExecute(store.getState)) : () => true,
    [canExecute],
  )

  const isButtonActive = useSelector((state: State) => isActiveSelector(state))

  const isButtonExecutable = useSelector((state: State) => canExecuteSelector(state))

  // TODO: type svg correctly
  const SVG = svg as React.FC<Icon>

  return (
    <div
      key={shortcutId}
      id={shortcutId}
      style={{
        paddingTop: isButtonExecutable && isPressing ? '10px' : '',
        cursor: isButtonExecutable ? 'pointer' : 'default',
      }}
      className='toolbar-icon'
      onMouseOver={() => startOverlayTimer(shortcutId)}
      onMouseUp={clearHoldTimer}
      onMouseDown={e => {
        setPressingToolbarId(shortcutId)
        // prevents editable blur
        e.preventDefault()
      }}
      onMouseOut={clearHoldTimer}
      onTouchEnd={clearHoldTimer}
      onTouchStart={() => {
        startOverlayTimer(shortcutId)
        setPressingToolbarId(shortcutId)
      }}
      onClick={e => {
        e.preventDefault()
        if (!isButtonExecutable) return
        exec(store.dispatch, store.getState, e, { type: 'toolbar' })
      }}
    >
      <SVG
        style={{
          cursor: isButtonExecutable ? 'pointer' : 'default',
          fill: isButtonExecutable && isButtonActive ? fg : 'gray',
          width: fontSize + 4,
          height: fontSize + 4,
          boxSizing: 'content-box',
        }}
      />
    </div>
  )
}

/** Toolbar component. */
const Toolbar = ({
  dark,
  fontSize,
  toolbarOverlay,
  scrollPrioritized,
  showTopControls,
}: ReturnType<typeof mapStateToProps>) => {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [holdTimer, setHoldTimer] = useState<Timer>(0 as unknown as Timer)
  const [holdTimer2, setHoldTimer2] = useState<Timer>(0 as unknown as Timer)
  const [lastScrollLeft, setLastScrollLeft] = useState<number | undefined>()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState<string | undefined>()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState<string | undefined>()
  const [pressingToolbarId, setPressingToolbarId] = useState<string | null>(null)
  const fg = dark ? 'white' : 'black'
  const arrowWidth = fontSize / 3

  const shortcut = toolbarOverlay ? shortcutById(toolbarOverlay) : null

  useEffect(() => {
    window.addEventListener('mouseup', clearHoldTimer)
    window.addEventListener('touchend', clearHoldTimer)
    window.addEventListener('resize', updateArrows)
    updateArrows()

    return () => {
      window.removeEventListener('mouseup', clearHoldTimer)
      window.removeEventListener('touchend', clearHoldTimer)
      window.removeEventListener('resize', updateArrows)
    }
  }, [])

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

  /** Clears the timer that waits for the overlay delay. */
  const clearHoldTimer = () => {
    store.dispatch(overlayHide())
    store.dispatch(scrollPrioritize(false))
    clearTimeout(holdTimer)
    clearTimeout(holdTimer2)
    setPressingToolbarId(null)
  }

  /** Sets the timer that wairts for the overlay delay. */
  const startOverlayTimer = (id: string) => {
    // on chrome setTimeout doesn't seem to work on the first click, clearing it before hand fixes the problem
    clearTimeout(holdTimer!)
    setHoldTimer(
      setTimeout(() => {
        if (!scrollPrioritized) {
          store.dispatch(overlayReveal(id))
        }
      }, SHORTCUT_HINT_OVERLAY_TIMEOUT),
    )
  }

  // fallback to defaults if user does not have Settings defined
  const userShortcutIds = subtree(store.getState(), ['Settings', 'Toolbar', 'Visible:'])
    .map(subthought => subthought.value)
    .filter(shortcutById)
  const shortcutIds = userShortcutIds.length > 0 ? userShortcutIds : TOOLBAR_DEFAULT_SHORTCUTS

  /**********************************************************************
   * Event Handlers
   **********************************************************************/

  /** Set the last scroll position at the beginning of a swipe. */
  const onTouchStart = (e: React.TouchEvent) => {
    store.dispatch(scrollPrioritize(true))
    if (e.target) {
      setLastScrollLeft((e.target as HTMLElement).scrollLeft)
    }
  }

  /** Sets the last scroll position and clears the overlay timer at the end of a swipe. */
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.target) {
      setLastScrollLeft((e.target as HTMLElement).scrollLeft)
    }
    store.dispatch(scrollPrioritize(false))
    clearHoldTimer()
    clearTimeout(holdTimer2)
  }

  /** Clears the overlay timer if scrolling. */
  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const touchedEl = document.elementFromPoint(touch.pageX, touch.pageY)

    // detect touchleave
    if (!toolbarRef.current?.contains(touchedEl)) {
      store.dispatch(overlayHide())
      clearTimeout(holdTimer)
    }
  }

  /** Handles toolbar scroll event. */
  const onScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrollDifference =
      lastScrollLeft != null && e.target ? Math.abs(lastScrollLeft - (e.target as HTMLElement).scrollLeft) : 0

    if (scrollDifference >= 5) {
      store.dispatch(scrollPrioritize(true))
      store.dispatch(overlayHide())
      setPressingToolbarId(null)
      clearTimeout(holdTimer)
    }

    updateArrows()

    // detect scrolling stop and removing scroll prioritization 100ms after end of scroll
    clearTimeout(holdTimer2)
    setHoldTimer2(
      setTimeout(() => {
        if (e.target) {
          setLastScrollLeft((e.target as HTMLElement).scrollLeft)
        }
        store.dispatch(scrollPrioritize(false))
      }, SCROLL_PRIORITIZATION_TIMEOUT),
    )
  }

  /**********************************************************************
   * Render
   **********************************************************************/

  return (
    <CSSTransition in={showTopControls} timeout={600} classNames='fade-600' unmountOnExit>
      <div className='toolbar-container'>
        <div className='toolbar-mask' />
        <div>
          <div
            id='toolbar'
            ref={toolbarRef}
            className='toolbar'
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchMove}
            onScroll={onScroll}
          >
            <span id='left-arrow' className={leftArrowElementClassName}>
              <TriangleLeft width={arrowWidth} height={fontSize} fill='gray' />
            </span>
            {shortcutIds.map(id => {
              return (
                <ToolbarIcon
                  shortcutId={id}
                  key={id}
                  startOverlayTimer={startOverlayTimer}
                  setPressingToolbarId={setPressingToolbarId}
                  fg={fg}
                  fontSize={fontSize}
                  clearHoldTimer={clearHoldTimer}
                  isPressing={pressingToolbarId === id}
                />
              )
            })}
            <span id='right-arrow' className={rightArrowElementClassName}>
              <TriangleRight width={arrowWidth} height={fontSize} fill='gray' />
            </span>
          </div>
          <TransitionGroup>
            {shortcut && toolbarOverlay ? (
              <CSSTransition timeout={800} classNames='fade'>
                <div className={isTouch ? 'touch-toolbar-overlay' : 'toolbar-overlay'}>
                  <div className='overlay-name'>{shortcut.label}</div>
                  {shortcut.gesture || shortcut.keyboard || shortcut.overlay ? (
                    <div className='overlay-shortcut'>
                      <Shortcut {...shortcut} />
                    </div>
                  ) : null}
                  <div className='overlay-body'>{shortcut.description}</div>
                </div>
              </CSSTransition>
            ) : null}
          </TransitionGroup>
        </div>
      </div>
    </CSSTransition>
  )
}

export default connect(mapStateToProps)(Toolbar)
