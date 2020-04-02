/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/

import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { shortcutById } from '../shortcuts'
import { isTouchEnabled } from '../browser.js'

import {
  overlayReveal,
  overlayHide,
  scrollPrioritize
} from '../action-creators/toolbar'

// constants
import {
  EM_TOKEN,
  SHORTCUT_HINT_OVERLAY_TIMEOUT,
  SCROLL_PRIORITIZATION_TIMEOUT,
  TOOLBAR_DEFAULT_SHORTCUTS,
  DEFAULT_FONT_SIZE,
  BASE_FONT_SIZE,
} from '../constants'

// util
import {
  attribute,
  getSetting,
  meta,
  subtree,
} from '../util'

// components
import Scale from './Scale'
import TriangleLeft from './TriangleLeft.js'
import TriangleRight from './TriangleRight.js'

const ARROW_SCROLL_BUFFER = 20
const fontSizeLocal = +(localStorage['Settings/Font Size'] || DEFAULT_FONT_SIZE)

const mapStateToProps = () => ({ cursor, isLoading, toolbarOverlay, scrollPrioritized, showHiddenThoughts, showSplitView }) => ({
  cursor,
  dark: !meta([EM_TOKEN, 'Settings', 'Theme']).Light,
  isLoading,
  scale: (isLoading ? fontSizeLocal : getSetting('Font Size') || DEFAULT_FONT_SIZE) / BASE_FONT_SIZE,
  scrollPrioritized,
  showHiddenThoughts,
  showSplitView,
  toolbarOverlay,
})

const Toolbar = ({ cursor, dark, scale, toolbarOverlay, scrollPrioritized, showHiddenThoughts, showSplitView }) => {

  const [holdTimer, setHoldTimer] = useState()
  const [holdTimer2, setHoldTimer2] = useState()
  const [lastScrollLeft, setLastScrollLeft] = useState()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState()
  const [overlayName, setOverlayName] = useState()
  const [overlayDescription, setOverlayDescription] = useState()

  const fg = dark ? 'white' : 'black'
  // const bg = dark ? 'black' : 'white'

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

  const updateArrows = () => {
    const toolbarElement = document.getElementById('toolbar')
    setLeftArrowElementClassName(toolbarElement.scrollLeft > ARROW_SCROLL_BUFFER ? 'shown' : 'hidden')
    setRightArrowElementClassName(toolbarElement.offsetWidth + toolbarElement.scrollLeft < toolbarElement.scrollWidth - ARROW_SCROLL_BUFFER ? 'shown' : 'hidden')
  }

  const clearHoldTimer = () => {
    overlayHide()
    scrollPrioritize(false)
    clearTimeout(holdTimer)
    clearTimeout(holdTimer2)
  }

  const startOverlayTimer = id => {
    // on chrome setTimeout doesn't seem to work on the first click, clearing it before hand fixes the problem
    clearTimeout(holdTimer)
    setHoldTimer(setTimeout(() => {
      if (!scrollPrioritized) {
        overlayReveal(id)
      }
    }, SHORTCUT_HINT_OVERLAY_TIMEOUT))
  }

  // fallback to defaults if user does not have Settings defined
  const userShortcutIds = subtree(['Settings', 'Toolbar', 'Visible:'])
    .map(subthought => subthought.value)
    .filter(shortcutById)
  const shortcutIds = userShortcutIds.length > 0
    ? userShortcutIds
    : TOOLBAR_DEFAULT_SHORTCUTS

  /**********************************************************************
   * Event Handlers
   **********************************************************************/

  const onTouchStart = e => {
    scrollPrioritize(true)
    setLastScrollLeft(e.target.scrollLeft)
  }

  const onTouchEnd = e => {
    setLastScrollLeft(e.target.scrollLeft)
    scrollPrioritize(false)
    clearHoldTimer()
    clearTimeout(holdTimer2)
  }

  const onTouchMove = e => {
    const touch = e.touches[0]
    const toolbarEl = document.getElementById('toolbar')
    const touchedEl = document.elementFromPoint(touch.pageX, touch.pageY)

    // detect touchleave
    if (!toolbarEl.contains(touchedEl)) {
      overlayHide()
      clearTimeout(holdTimer)
    }
  }

  const onScroll = e => {
    const target = e.target
    const scrollDifference = Math.abs(lastScrollLeft - target.scrollLeft)

    if (scrollDifference >= 5) {
      scrollPrioritize(true)
      overlayHide()
      clearTimeout(holdTimer)
    }

    updateArrows()

    // detect scrolling stop and removing scroll prioritization 100ms after end of scroll
    clearTimeout(holdTimer2)
    setHoldTimer2(setTimeout(() => {
      setLastScrollLeft(target.scrollLeft)
      scrollPrioritize(false)
    }, SCROLL_PRIORITIZATION_TIMEOUT))
  }

  /**********************************************************************
   * Render
   **********************************************************************/

  return (
    <div className='toolbar-container'>
      <div className="toolbar-mask" />
      <Scale amount={scale}>
        <div
          id='toolbar'
          className='toolbar'
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          onScroll={onScroll}
        >
          <span id='left-arrow' className={leftArrowElementClassName}><TriangleLeft width='6' fill='gray' /></span>
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
                  exec(e)
                }}
              >
                <Icon id={id}
                  style={{
                    fill: id === 'toggleTableView' && cursor && attribute(cursor, '=view') === 'Table' ? 'gray'
                    : id === 'toggleSplitView' && !showSplitView ? 'gray'
                    : id === 'undo' ? 'gray'
                    : id === 'redo' ? 'gray'
                    : id === 'toggleHiddenThoughts' && !showHiddenThoughts ? 'gray'
                    : id === 'toggleSort' && cursor && attribute(cursor, '=sort') === 'Alphabetical' ? 'gray'
                    : id === 'pinOpen' && cursor && attribute(cursor, '=pin') === 'true' ? 'gray'
                    : fg
                  }} />
              </div>
            )
          })}
          <span id='right-arrow' className={rightArrowElementClassName}><TriangleRight width='6' fill='gray' /></span>
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
      </Scale>
    </div>
  )
}

export default connect(mapStateToProps)(Toolbar)
