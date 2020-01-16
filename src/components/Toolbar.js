import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import {
  overlayReveal,
  overlayHide,
  scrollPrioritize
} from '../action-creators/toolbar'
import {
  SHORTCUT_HINT_OVERLAY_TIMEOUT,
  SCROLL_PRIORITIZATION_TIMEOUT
} from '../constants'
import { isTouchEnabled, isSafari } from '../browser.js'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

export const Toolbar = connect(({ toolbarOverlay, scrollPrioritized, settings: { dark } }) => ({ dark, toolbarOverlay, scrollPrioritized }))(({ dark, toolbarOverlay, scrollPrioritized }) => {

  const [holdTimer, setHoldTimer] = useState()
  const [holdTimer2, setHoldTimer2] = useState()
  const [lastScrollLeft, setLastScrollLeft] = useState()
  const [initialScrollLeft, setInitialScrollLeft] = useState()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState()
  const [overlayName, setOverlayName] = useState()
  const [overlayDescription, setOverlayDescription] = useState()

  const shortcutIds = [
    'search',
    'exportContext',
    'toggleContextView',
    'delete',
    'indent',
    'outdent',
  ]

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
    const window90 = window.innerWidth * 0.9
    const toolbarElement = document.getElementById('toolbar')
    const scrollLeft = toolbarElement.scrollLeft
    setInitialScrollLeft(scrollLeft)

    /** set event listeners start */
    window.addEventListener('mouseup', clearHoldTimer)
    window.addEventListener('touchend', clearHoldTimer)
    window.addEventListener('resize', () => {
      const window90 = window.innerWidth * 0.9
      if (toolbarElement.scrollWidth < window90) {
        setLeftArrowElementClassName('hidden')
        setRightArrowElementClassName('hidden')
      }
      if (toolbarElement.scrollWidth > window90) setLeftArrowElementClassName('shown')
      else if (toolbarElement.scrollWidth > window90) setLeftArrowElementClassName('hidden')
    })
    /** set event listeners end */

    if (toolbarElement.scrollWidth < window90) setLeftArrowElementClassName('hidden')
    else setLeftArrowElementClassName('shown')

  }, [])

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
              // const window90 = window.innerWidth * 0.9
              // console.log(scrollDifference)
              if (scrollDifference >= 5 || scrollDifference <= -5) {
                scrollPrioritize(true)
                overlayHide()
              }

              if (target.scrollLeft < initialScrollLeft) setRightArrowElementClassName('shown')
              else if (target.scrollLeft >= initialScrollLeft) setRightArrowElementClassName('hidden')

              if (isSafari()) {
                const toolbarElement = document.getElementById('toolbar')
                const scrollLeft = target.scrollLeft
                const endOfScrollingPoint = toolbarElement.scrollWidth - toolbarElement.clientWidth
                if (scrollLeft !== lastScrollLeft) setLastScrollLeft(scrollLeft)
                if (scrollLeft <= -endOfScrollingPoint) setLeftArrowElementClassName('hidden')
                else setLeftArrowElementClassName('shown')
              }
              else {
                if (target.scrollLeft <= 1) setLeftArrowElementClassName('hidden')
                else setLeftArrowElementClassName('shown')
              }
              /* works on safari - end */

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
            <span id='left-arrow' className={leftArrowElementClassName}>&#x3c;</span>
            {shortcutIds.map(id => {
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
            <span id='right-arrow' className={rightArrowElementClassName}>&#x3e;</span>
          </div>
          <TransitionGroup>
            <CSSTransition>
            {toolbarOverlay && !scrollPrioritized ?
              <div className={isTouchEnabled() ? 'touch-toolbar-overlay' : 'toolbar-overlay'}>
                <div className={'overlay-name'}>{overlayName}</div>
                <div className={'overlay-body'}>{overlayDescription}</div>
              </div> :
              <span className='hidden'></span>}
            </CSSTransition>
          </TransitionGroup>
        </div>
      </div>
    )
  }
)
