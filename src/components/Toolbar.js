/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlray hidden on touch "leave"

*/

import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'

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

// components
import { isTouchEnabled } from '../browser.js'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

const ARROW_SCROLL_BUFFER = 20

export const Toolbar = connect(({ toolbarOverlay, scrollPrioritized, settings: { dark } }) => ({ dark, toolbarOverlay, scrollPrioritized }))(({ dark, toolbarOverlay, scrollPrioritized }) => {

  const [holdTimer, setHoldTimer] = useState()
  const [holdTimer2, setHoldTimer2] = useState()
  const [lastScrollLeft, setLastScrollLeft] = useState()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState()
  const [overlayName, setOverlayName] = useState()
  const [overlayDescription, setOverlayDescription] = useState()

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
      <div>
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
            <span id='left-arrow' className={leftArrowElementClassName}><span className='left-triangle'></span></span>
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
                  onClick={e => exec(e)}
                >
                  <Icon id={id} fill={dark ? 'white' : 'black'} />
                </div>
              )
            })}
            <span id='right-arrow' className={rightArrowElementClassName}><span className='right-triangle'></span></span>
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
)
