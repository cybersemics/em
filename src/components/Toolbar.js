import React from 'react'
import { connect } from 'react-redux'
import { shortcutById } from '../shortcuts'
import {
  overlayReveal,
  overlayHide,
  overlayUpdate
} from '../action-creators/toolbar'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

const isTouchEnabled = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  )
}

(() => {
  window.addEventListener('mouseup', () => {
    clearHoldTimer()
  })
  if (isTouchEnabled()) {
    window.addEventListener('touchend', () => {
      clearHoldTimer()
    })
  }
})()

const shortcutIds = [
  'outdent',
  'indent',
  'delete',
  'toggleContextView',
  'exportContext',
  'search',
]

const ToolbarMessageOverlay = ({
  classname = 'toolbar-overlay',
  name,
  description
}) => {
  return (
    <TransitionGroup>
      <CSSTransition key={0} timeout={200} classNames='fade'>
        <div className={classname}>
          <div className={'overlay-name'}>{name}</div>
          <div className={'overlay-body'}>{description}</div>
        </div>
      </CSSTransition>
    </TransitionGroup>
  )
}

var holdTimer
var currentId

const updateOverlayInfo = id => {
  // console.log('updating')
  currentId = id
  const { name, description } = shortcutById(id)
  overlayUpdate({ id, name, description })
}

const onHoldDownShortcut = id => {
  currentId = id
  // on chrome setTimeout doesn't seem to work on the first click, clearing it before hand fixes the problem
  clearTimeout(holdTimer)
  const { name, description } = shortcutById(id)
  holdTimer = setTimeout(() => {
    overlayReveal({ id, name, description })
  }, 500)
}

const clearHoldTimer = () => {
  overlayHide()
  clearTimeout(holdTimer)
}

export const Toolbar = connect(({ toolbarOverlay, settings: { dark } }) => ({
  dark,
  toolbarOverlay
}))(
  ({
    dark,
    toolbarOverlay: {
      showOverlay,
      shortcutId
    }
  }) => (
    <div>
      <div className={'toolbar-container'}>
        <div className='toolbar'>
          {shortcutIds.map(id => {
            const { name, svg: Icon, exec } = shortcutById(id)
            return (
              <div
                key={name}
                id={id}
                className='toolbar-icon'
                onMouseDown={() => onHoldDownShortcut(id)}
                onMouseOver={() => updateOverlayInfo(id)}
                onTouchStart={() => onHoldDownShortcut(id)}
                onClick={() => exec(id)}
              >
                <Icon id={id} fill={dark ? 'white' : 'black'} />
              </div>
            )
          })}
        </div>
        {!isTouchEnabled() && showOverlay && shortcutId === currentId ? (
          <ToolbarMessageOverlay
            name={shortcutById(shortcutId).name}
            description={shortcutById(shortcutId).description}
          />
        ) : null}
      </div>
      {isTouchEnabled() && showOverlay && shortcutId === currentId ? (
        <ToolbarMessageOverlay
          classname={'touch-toolbar-overlay'}
          name={shortcutById(shortcutId).name}
          description={shortcutById(shortcutId).description}
        />
      ) : null}
    </div>
  )
)
