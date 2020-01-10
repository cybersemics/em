/* eslint-disable fp/no-let */
import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import {
  overlayReveal,
  overlayHide
} from '../action-creators/toolbar'
import { SHORTCUT_HINT_OVERLAY_TIMEOUT } from '../constants'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

export const Toolbar = connect(({ toolbarOverlay, settings: { dark } }) => ({ dark, toolbarOverlay }))(({ dark, toolbarOverlay }) => {

  const [holdTimer, setHoldTimer] = useState()
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
    setInitialScrollLeft(toolbarElement.scrollLeft)
  }, [])

  useEffect(() => {
    const window90 = window.innerWidth * 0.9
    const toolbarElement = document.getElementById('toolbar')
    setToolbarElementScrollWidth(toolbarElement.scrollWidth)

    /** set event listeners start */
    window.addEventListener('mouseup', clearHoldTimer)
    window.addEventListener('touchend', clearHoldTimer)
    window.addEventListener('resize', () => {
      if (toolbarElementScrollWidth > window90) setLeftArrowElementClassName('')
      else setLeftArrowElementClassName('hidden')
    })
    /** set even listeners end */

    if (toolbarElementScrollWidth > window90) setLeftArrowElementClassName('')
    else setLeftArrowElementClassName('hidden')

    if (toolbarElement.scrollLeft < initialScrollLeft) setRightArrowElementClassName('')
    else if (toolbarElement.scrollLeft >= initialScrollLeft) setRightArrowElementClassName('hidden')

    if (toolbarElement.scrollLeft === 0) setLeftArrowElementClassName('hidden')
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
              if (target.scrollLeft < initialScrollLeft) setRightArrowElementClassName('')
              else if (target.scrollLeft >= initialScrollLeft) setRightArrowElementClassName('hidden')
              if (target.scrollLeft === 0) setLeftArrowElementClassName('hidden')
              else setLeftArrowElementClassName('')
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
