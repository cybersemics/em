import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import {
  overlayReveal,
  overlayHide
} from '../action-creators/toolbar'
import {
  SHORTCUT_HINT_OVERLAY_TIMEOUT,
  SCROLL_PRIORITIZATION_TIMEOUT
} from '../constants'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

export const Toolbar = connect(({ toolbarOverlay, scrollPrioritized, settings: { dark } }) => ({ dark, toolbarOverlay, scrollPrioritized }))(({ dark, toolbarOverlay, scrollPrioritized }) => {

  const [holdTimer, setHoldTimer] = useState()
  const [holdTimer2, setHoldTimer2] = useState()
  const [lastScrollLeft, setLastScrollLeft] = useState()
  const [initialScrollLeft, setInitialScrollLeft] = useState()
  const [toolbarElementScrollWidth, setToolbarElementScrollWidth] = useState()
  const [leftArrowElementClassName = 'hidden', setLeftArrowElementClassName] = useState()
  const [rightArrowElementClassName = 'hidden', setRightArrowElementClassName] = useState()

  const shortcutIds = [
    'search',
    'exportContext',
    'toggleContextView',
    'delete',
    'indent',
    'outdent',
  ]

  const isTouchEnabled = () => {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  const clearHoldTimer = () => {
    overlayHide()
    clearTimeout(holdTimer)
  }

  const onHoldDownShortcut = id => {
    // on chrome setTimeout doesn't seem to work on the first click, clearing it before hand fixes the problem
    clearTimeout(holdTimer)
    setHoldTimer(setTimeout(() => {
      overlayReveal(id)
    }, SHORTCUT_HINT_OVERLAY_TIMEOUT))
  }

  useEffect(() => {
    const toolbarElement = document.getElementById('toolbar')
    const scrollLeft = toolbarElement.scrollLeft
    setInitialScrollLeft(scrollLeft)
    setLastScrollLeft(scrollLeft)
  }, [])

  useEffect(() => {
    const window90 = window.innerWidth * 0.9
    const toolbarElement = document.getElementById('toolbar')
    const scrollLeft = toolbarElement.scrollLeft
    const scrollWidth = toolbarElement.scrollWidth
    setToolbarElementScrollWidth(scrollWidth)

    /** set event listeners start */
    window.addEventListener('mouseup', clearHoldTimer)
    window.addEventListener('touchend', clearHoldTimer)
    window.addEventListener('resize', () => {
      if (toolbarElementScrollWidth > window90) setLeftArrowElementClassName('')
      else setLeftArrowElementClassName('hidden')
    })
    /** set event listeners end */

    if (toolbarElementScrollWidth > window90) setLeftArrowElementClassName('')
    else setLeftArrowElementClassName('hidden')

    if (scrollLeft < initialScrollLeft) setRightArrowElementClassName('')
    else if (scrollLeft >= initialScrollLeft) setRightArrowElementClassName('hidden')

    if (scrollLeft === 0) setLeftArrowElementClassName('hidden')
    else setLeftArrowElementClassName('')

  })

  return (
      <div>
        <div className='toolbar-container'>
          <div
            id='toolbar'
            className='toolbar'
            onScroll={e => {
              const target = e.target
              const scrollLeft = target.scrollLeft
              const scrollDifference = lastScrollLeft - scrollLeft

              if (scrollDifference >= 5 || scrollDifference <= -5) overlayHide()

              if (target.scrollLeft < initialScrollLeft) setRightArrowElementClassName('')
              else if (target.scrollLeft >= initialScrollLeft) setRightArrowElementClassName('hidden')
              if (target.scrollLeft === 0) setLeftArrowElementClassName('hidden')
              else setLeftArrowElementClassName('')

              // reset holdTimer2
              clearTimeout(holdTimer2)

              // detect scrolling stop and removing scroll prioritization 100ms after end of scroll
              setHoldTimer2(setTimeout(() => {
                setLastScrollLeft(scrollLeft)
                overlayHide()
              }, SCROLL_PRIORITIZATION_TIMEOUT))
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
                  onTouchStart={() => onHoldDownShortcut(id)}
                  onClick={() => exec(id)}
                >
                  <Icon id={id} fill={dark ? 'white' : 'black'} />
                </div>
              )
            })}
            <span id='right-arrow' className={rightArrowElementClassName}>&#x3e;</span>
          </div>
          <TransitionGroup>
            <CSSTransition key={0} timeout={200} classNames='fade'>
              {toolbarOverlay ?
                  () => {
                    const { name, description } = shortcutById(toolbarOverlay)
                    return (
                      <div className={isTouchEnabled() ? 'touch-toolbar-overlay' : 'toolbar-overlay'}>
                        <div className={'overlay-name'}>{name}</div>
                        <div className={'overlay-body'}>{description}</div>
                      </div>
                    )
                  }
              : <span></span>}
            </CSSTransition>
          </TransitionGroup>
        </div>
      </div>
    )
  }
)
