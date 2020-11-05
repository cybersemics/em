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
  ROOT_TOKEN,
  SCROLL_PRIORITIZATION_TIMEOUT,
  SHORTCUT_HINT_OVERLAY_TIMEOUT,
  TOOLBAR_DEFAULT_SHORTCUTS,
} from '../constants'

// util
import {
  parentOf, pathToContext,
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
import Shortcut from './Shortcut'
import { isUndoEnabled } from '../util/isUndoEnabled'
import { isRedoEnabled } from '../util/isRedoEnabled'

const ARROW_SCROLL_BUFFER = 20
const fontSizeLocal = +(localStorage['Settings/Font Size'] || DEFAULT_FONT_SIZE)

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = state => {

  const { cursor, isLoading, toolbarOverlay, scrollPrioritized, showHiddenThoughts, showSplitView, showTopControls } = state
  const context = cursor && pathToContext(cursor)
  const contextOfCursor = context ? parentOf(context) : [ROOT_TOKEN]

  return {
    cursorOnTableView: attributeEquals(state, contextOfCursor, '=view', 'Table'),
    cursorOnAlphabeticalSort: attributeEquals(state, contextOfCursor, '=sort', 'Alphabetical'),
    cursorPinOpen: cursor && attributeEquals(state, context, '=pin', 'true'),
    cursorPinSubthoughts: attributeEquals(state, contextOfCursor, '=pinChildren', 'true'),
    cursorOnNote: cursor && attribute(state, context, '=note') != null,
    cursorOnProseView: attributeEquals(state, contextOfCursor, '=view', 'Prose'),
    dark: theme(state) !== 'Light',
    isLoading,
    fontSize: isLoading ? fontSizeLocal : +(getSetting(state, 'Font Size') || DEFAULT_FONT_SIZE),
    redoEnabled: isRedoEnabled(state),
    scrollPrioritized,
    showHiddenThoughts,
    showSplitView,
    toolbarOverlay,
    undoEnabled: isUndoEnabled(state),
    showTopControls
  }
}

/** Toolbar component. */
const Toolbar = ({ cursorOnTableView, cursorOnAlphabeticalSort, cursorPinOpen, cursorPinSubthoughts, cursorOnNote, cursorOnProseView, dark, fontSize, toolbarOverlay, scrollPrioritized, showHiddenThoughts, showSplitView, showTopControls, undoEnabled, redoEnabled }) => {
  const [holdTimer, setHoldTimer] = useState()
  const [holdTimer2, setHoldTimer2] = useState()
  const [lastScrollLeft, setLastScrollLeft] = useState()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState()

  const fg = dark ? 'white' : 'black'
  const arrowWidth = fontSize / 3

  const shortcut = shortcutById(toolbarOverlay)

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
    if (toolbarElement) {
      setLeftArrowElementClassName(toolbarElement.scrollLeft > ARROW_SCROLL_BUFFER ? 'shown' : 'hidden')
      setRightArrowElementClassName(toolbarElement.offsetWidth + toolbarElement.scrollLeft < toolbarElement.scrollWidth - ARROW_SCROLL_BUFFER ? 'shown' : 'hidden')
    }
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
    <CSSTransition in={showTopControls} timeout={600} classNames='fade-600' unmountOnExit>
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
            <span id='left-arrow' className={leftArrowElementClassName}><TriangleLeft width={arrowWidth} height={fontSize} fill='gray' /></span>
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
                      : id === 'splitSentences' ? fg
                      : id === 'subcategorizeOne' ? fg
                      : id === 'subcategorizeAll' ? fg
                      : id === 'toggleHiddenThoughts' && !showHiddenThoughts ? fg
                      : id === 'exportContext' ? fg
                      : id === 'undo' && undoEnabled ? fg
                      : id === 'redo' && redoEnabled ? fg
                      : 'gray',
                      width: fontSize + 4,
                      height: fontSize + 4,
                    }} />
                </div>
              )
            })}
            <span id='right-arrow' className={rightArrowElementClassName}><TriangleRight width={arrowWidth} height={fontSize} fill='gray' /></span>
          </div>
          <TransitionGroup>
            {toolbarOverlay ?
              <CSSTransition timeout={800} classNames='fade'>
                <div className={isTouchEnabled() ? 'touch-toolbar-overlay' : 'toolbar-overlay'}>
                  <div className='overlay-name'>{shortcut.name}</div>
                  {shortcut.gesture || shortcut.keyboard || shortcut.overlay
                    ? <div className='overlay-shortcut'><Shortcut {...shortcut} /></div>
                    : null
                  }
                  <div className='overlay-body'>{shortcut.description}</div>
                </div>
              </CSSTransition> : null}
          </TransitionGroup>
        </div>
      </div>
    </CSSTransition>
  )
}

export default connect(mapStateToProps)(Toolbar)
