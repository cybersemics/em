/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/

import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { shortcutById } from '../shortcuts'
import { isTouchEnabled } from '../browser'
import { store } from '../store'

import {
  overlayHide,
  overlayReveal,
  scrollPrioritize,
} from '../action-creators/toolbar'

// constants
import {
  DEFAULT_FONT_SIZE,
  SCROLL_PRIORITIZATION_TIMEOUT,
  SHORTCUT_HINT_OVERLAY_TIMEOUT,
  TOOLBAR_DEFAULT_SHORTCUTS,
} from '../constants'

// util
import {
  pathToContext,
} from '../util'

// selectors
import {
  attribute,
  attributeEquals,
  getSetting,
  subtree,
  theme,
} from '../selectors'

// components
import TriangleLeft from './TriangleLeft'
import TriangleRight from './TriangleRight'

const ARROW_SCROLL_BUFFER = 20
const fontSizeLocal = +(localStorage['Settings/Font Size'] || DEFAULT_FONT_SIZE)

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = state => {

  const { cursor, isLoading, toolbarOverlay, scrollPrioritized, showHiddenThoughts, showSplitView } = state
  const context = cursor && pathToContext(cursor)

  return {
    cursorOnTableView: cursor && attributeEquals(state, context, '=view', 'Table'),
    cursorOnAlphabeticalSort: cursor && attributeEquals(state, context, '=sort', 'Alphabetical'),
    cursorPinOpen: cursor && attributeEquals(state, context, '=pin', 'true'),
    cursorPinSubthoughts: cursor && attributeEquals(state, context, '=pinChildren', 'true'),
    cursorOnNote: cursor && attribute(state, context, '=note') != null,
    cursorOnProseView: cursor && attributeEquals(state, context, '=view', 'Prose'),
    dark: theme(state) !== 'Light',
    isLoading,
    fontSize: isLoading ? fontSizeLocal : +(getSetting(state, 'Font Size') || DEFAULT_FONT_SIZE),
    scrollPrioritized,
    showHiddenThoughts,
    showSplitView,
    toolbarOverlay,
  }
}

/** Toolbar component. */
const Toolbar = ({ cursorOnTableView, cursorOnAlphabeticalSort, cursorPinOpen, cursorPinSubthoughts, cursorOnNote, cursorOnProseView, dark, fontSize, toolbarOverlay, scrollPrioritized, showHiddenThoughts, showSplitView }) => {
  const [holdTimer, setHoldTimer] = useState()
  const [holdTimer2, setHoldTimer2] = useState()
  const [lastScrollLeft, setLastScrollLeft] = useState()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState()
  const [overlayName, setOverlayName] = useState()
  const [overlayDescription, setOverlayDescription] = useState()

  const fg = dark ? 'white' : 'black'
  const arrowHeight = fontSize / 1.5

  useEffect(() => {
    if (toolbarOverlay) {
      const { name, description } = shortcutById(toolbarOverlay)
      setOverlayName(name)
      setOverlayDescription(description)
    }
  })

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
    const toolbarElement = document.getElementById('toolbar')
    setLeftArrowElementClassName(toolbarElement.scrollLeft > ARROW_SCROLL_BUFFER ? 'shown' : 'hidden')
    setRightArrowElementClassName(toolbarElement.offsetWidth + toolbarElement.scrollLeft < toolbarElement.scrollWidth - ARROW_SCROLL_BUFFER ? 'shown' : 'hidden')
  }

  /** Clears the timer that waits for the overlay delay. */
  const clearHoldTimer = () => {
    store.dispatch(overlayHide())
    store.dispatch(scrollPrioritize(false))
    clearTimeout(holdTimer)
    clearTimeout(holdTimer2)
  }

  /** Sets the timer that wairts for the overlay delay. */
  const startOverlayTimer = id => {
    // on chrome setTimeout doesn't seem to work on the first click, clearing it before hand fixes the problem
    clearTimeout(holdTimer)
    setHoldTimer(setTimeout(() => {
      if (!scrollPrioritized) {
        store.dispatch(overlayReveal(id))
      }
    }, SHORTCUT_HINT_OVERLAY_TIMEOUT))
  }

  // fallback to defaults if user does not have Settings defined
  const userShortcutIds = subtree(store.getState(), ['Settings', 'Toolbar', 'Visible:'])
    .map(subthought => subthought.value)
    .filter(shortcutById)
  const shortcutIds = userShortcutIds.length > 0
    ? userShortcutIds
    : TOOLBAR_DEFAULT_SHORTCUTS

  /**********************************************************************
   * Event Handlers
   **********************************************************************/

  /** Set the last scroll position at the beginning of a swipe. */
  const onTouchStart = e => {
    store.dispatch(scrollPrioritize(true))
    setLastScrollLeft(e.target.scrollLeft)
  }

  /** Sets the last scroll position and clears the overlay timer at the end of a swipe. */
  const onTouchEnd = e => {
    setLastScrollLeft(e.target.scrollLeft)
    store.dispatch(scrollPrioritize(false))
    clearHoldTimer()
    clearTimeout(holdTimer2)
  }

  /** Clears the overlay timer if scrolling. */
  const onTouchMove = e => {
    const touch = e.touches[0]
    const toolbarEl = document.getElementById('toolbar')
    const touchedEl = document.elementFromPoint(touch.pageX, touch.pageY)

    // detect touchleave
    if (!toolbarEl.contains(touchedEl)) {
      store.dispatch(overlayHide())
      clearTimeout(holdTimer)
    }
  }

  /** Handles toolbar scroll event. */
  const onScroll = e => {
    const target = e.target
    const scrollDifference = Math.abs(lastScrollLeft - target.scrollLeft)

    if (scrollDifference >= 5) {
      store.dispatch(scrollPrioritize(true))
      store.dispatch(overlayHide())
      clearTimeout(holdTimer)
    }

    updateArrows()

    // detect scrolling stop and removing scroll prioritization 100ms after end of scroll
    clearTimeout(holdTimer2)
    setHoldTimer2(setTimeout(() => {
      setLastScrollLeft(target.scrollLeft)
      store.dispatch(scrollPrioritize(false))
    }, SCROLL_PRIORITIZATION_TIMEOUT))
  }

  /**********************************************************************
   * Render
   **********************************************************************/

  return (
    <div className='toolbar-container'>
      <div className="toolbar-mask" />
      <div>
        <div
          id='toolbar'
          className='toolbar'
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          onScroll={onScroll}
        >
          <span id='left-arrow' className={leftArrowElementClassName}><TriangleLeft width={arrowHeight / 2} height={arrowHeight} fill='gray' /></span>
          {shortcutIds.map(id => {
            const { name, svg: Icon, exec } = shortcutById(id)
            return (
              <div
                key={name}
                id={id}
                className='toolbar-icon'
                onMouseOver={() => startOverlayTimer(id)}
                onMouseUp={clearHoldTimer}
                onMouseOut={clearHoldTimer}
                onTouchEnd={clearHoldTimer}
                onTouchStart={() => startOverlayTimer(id)}
                onClick={e => {
                  exec(store.dispatch, store.getState, e, { type: 'toolbar' })
                }}
              >
                <Icon id={id}
                  style={{
                    fill: id === 'search' ? fg
                    : id === 'outdent' ? fg
                    : id === 'indent' ? fg
                    : id === 'toggleTableView' && cursorOnTableView ? fg
                    : id === 'toggleSort' && cursorOnAlphabeticalSort ? fg
                    : id === 'pinOpen' && cursorPinOpen ? fg
                    : id === 'pinSubthoughts' && cursorPinSubthoughts ? fg
                    : id === 'note' && cursorOnNote ? fg
                    : id === 'delete' ? fg
                    : id === 'toggleContextView' ? fg
                    : id === 'proseView' && cursorOnProseView ? fg
                    : id === 'toggleSplitView' && showSplitView ? fg
                    : id === 'subcategorizeOne' ? fg
                    : id === 'subcategorizeAll' ? fg
                    : id === 'toggleHiddenThoughts' && !showHiddenThoughts ? fg
                    : id === 'exportContext' ? fg
                    : id === 'undo' ? fg
                    : id === 'redo' ? fg
                    : 'gray',
                    width: fontSize + 4,
                    height: fontSize + 4,
                  }} />
              </div>
            )
          })}
          <span id='right-arrow' className={rightArrowElementClassName}><TriangleRight width={arrowHeight / 2} height={arrowHeight} fill='gray' /></span>
        </div>
        <TransitionGroup>
          {toolbarOverlay ?
            <CSSTransition timeout={200} classNames='fade'>
              <div className={isTouchEnabled() ? 'touch-toolbar-overlay' : 'toolbar-overlay'}>
                <div className={'overlay-name'}>{overlayName}</div>
                <div className={'overlay-body'}>{overlayDescription}</div>
              </div>
            </CSSTransition> : null}
        </TransitionGroup>
      </div>
    </div>
  )
}

export default connect(mapStateToProps)(Toolbar)
