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
    const toolbarElement = document.getElementById('toolbar')
    const scrollLeft = toolbarElement.scrollLeft
    if (scrollLeft !== lastScrollLeft) setLastScrollLeft(scrollLeft)
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
    clearTimeout(holdTimer)
  }

  const onHoldDownShortcut = id => {
    // on chrome setTimeout doesn't seem to work on the first click, clearing it before hand fixes the problem
    clearTimeout(holdTimer)
    setHoldTimer(setTimeout(() => {
      if (!scrollPrioritized) overlayReveal(id)
    }, SHORTCUT_HINT_OVERLAY_TIMEOUT))
  }

  const executeAction = (action) => {
    if (scrollPrioritized) return
    return action
  }

  return (
      <div>
        <div className='toolbar-container'>
          <div
            id='toolbar'
            className='toolbar'
            onTouchEnd={e => {
              const target = e.target
              setLastScrollLeft(target.scrollLeft)
              scrollPrioritize(false)
            }}
            onScroll={e => {
              const target = e.target
              const scrollDifference = lastScrollLeft - target.scrollLeft
              // const window90 = const window90 = Math.round(window.innerWidth * 0.9)
              // console.log(scrollDifference)
              if (scrollDifference >= 5 || scrollDifference <= -5) {
                scrollPrioritize(true)
                overlayHide()
              }

              updateArrows()

              // detect scrolling stop and removing scroll prioritization 100ms after end of scroll
              if (!isTouchEnabled()) {
                // reset holdTimer2
                clearTimeout(holdTimer2)
                setHoldTimer2(setTimeout(() => {
                  setLastScrollLeft(target.scrollLeft)
                  scrollPrioritize(false)
                }, SCROLL_PRIORITIZATION_TIMEOUT))
              }
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
                  onMouseDown={() => onHoldDownShortcut(id)}
                  onMouseOver={() => {
                      if (toolbarOverlay) overlayReveal(id)
                    }
                  }
                  onMouseUp={() => clearHoldTimer()}
                  onTouchEnd={() => clearHoldTimer()}
                  onTouchStart={() => onHoldDownShortcut(id)}
                  onClick={() => executeAction(exec(id))}
                >
                  <Icon id={id} fill={dark ? 'white' : 'black'} />
                </div>
              )
            })}
            <span id='right-arrow' className={rightArrowElementClassName}><span className='right-triangle'></span></span>
          </div>
          <TransitionGroup>
            {toolbarOverlay && !scrollPrioritized ?
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
