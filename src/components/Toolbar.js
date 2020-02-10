/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlray hidden on touch "leave"

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
  SHORTCUT_HINT_OVERLAY_TIMEOUT,
  SCROLL_PRIORITIZATION_TIMEOUT,
  TOOLBAR_SHORTCUT_IDS,
} from '../constants'

// util
import {
  hashContext,
  pathToContext,
} from '../util'

// components
import { TriangleLeft } from './TriangleLeft.js'
import { TriangleRight } from './TriangleRight.js'

const ARROW_SCROLL_BUFFER = 20

export const Toolbar = connect(({ contexts, cursor, toolbarOverlay, scrollPrioritized, settings: { dark }, showSplitView }) => ({ contexts, cursor, dark, toolbarOverlay, scrollPrioritized, showSplitView }))(({ contexts, cursor, dark, toolbarOverlay, scrollPrioritized, showSplitView, dispatch }) => {

  const [holdTimer, setHoldTimer] = useState()
  const [holdTimer2, setHoldTimer2] = useState()
  const [lastScrollLeft, setLastScrollLeft] = useState()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState()
  const [overlayName, setOverlayName] = useState()
  const [overlayDescription, setOverlayDescription] = useState()

  const cursorView = cursor
    ? (contexts[hashContext(pathToContext(cursor))] || {}).view
    : null
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

  return (
      <div className='toolbar-container'>
        <div
          id='toolbar'
          className='toolbar'
          onTouchStart={e => {
            scrollPrioritize(true)
            setLastScrollLeft(e.target.scrollLeft)
          }}
          onTouchEnd={e => {
            setLastScrollLeft(e.target.scrollLeft)
            scrollPrioritize(false)
            clearHoldTimer()
            clearTimeout(holdTimer2)
          }}
          onTouchMove={e => {
            const touch = e.touches[0]
            const toolbarEl = document.getElementById('toolbar')
            const touchedEl = document.elementFromPoint(touch.pageX, touch.pageY)

            // detect touchleave
            if (!toolbarEl.contains(touchedEl)) {
              overlayHide()
              clearTimeout(holdTimer)
            }
          }}
          onScroll={e => {
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
          }}
          >
          <span id='left-arrow' className={leftArrowElementClassName}><TriangleLeft width='6' fill='gray' /></span>
          {TOOLBAR_SHORTCUT_IDS.map(id => {
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
                  if (id === 'exportContext') {
                    dispatch({ type: 'showModal', id: 'export' })
                    dispatch({ type: 'exportExec', execFunc: shortcutById })
                  }
                  else {
                    exec(e)
                  }
                }}
              >
                <Icon id={id}
                  style={{
                    fill: id === 'toggleTableView' && cursorView === 'table' ? 'gray'
                      : id === 'toggleSplitView' && !showSplitView ? 'gray'
                      : id === 'undo' ? 'gray'
                      : id === 'redo' ? 'gray'
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
      </div>
    )
  }
)
