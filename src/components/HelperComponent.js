import React from 'react'
import * as classNames from 'classnames'

// constants
import {
  FADEOUT_DURATION,
  HELPER_CLOSE_DURATION,
  HELPER_REMIND_ME_LATER_DURATION,
} from '../constants.js'

// util
import {
  animateWelcome,
  helperCleanup,
} from '../util.js'

// needs to be a class component to use componentWillUnmount
export class HelperComponent extends React.Component {

  constructor(props) {
    super(props)
    this.ref = React.createRef()
  }

  componentDidMount() {

    // for helpers that appear within the hierarchy, we have to do some hacky css patching to fix the stack order of next siblings and descendants.

    // if (this.ref.current) {
    //   const closestParentItem = this.ref.current.parentNode.parentNode
    //   closestParentItem.parentNode.classList.add('helper-container')
    //   let siblingsAfter = nextSiblings(closestParentItem)
    //   for (let i=0; i<siblingsAfter.length; i++) {
    //     if (siblingsAfter[i].classList) {
    //       siblingsAfter[i].classList.add('sibling-after')
    //     }
    //   }
    //   siblingsAfter = nextSiblings(closestParentItem.parentNode)
    //   for (let i=0; i<siblingsAfter.length; i++) {
    //     if (siblingsAfter[i].classList) {
    //       siblingsAfter[i].classList.add('sibling-after')
    //     }
    //   }
    // }

    // add a global escape listener
    this.escapeListener = e => {
      if (this.props.show && e.key === 'Escape') {
        e.stopPropagation()
        this.close(HELPER_CLOSE_DURATION)
        window.removeEventListener('keydown', this.escapeListener)
      }
    }

    // helper method to animate and close the helper
    this.close = duration => {
      const { id, dispatch } = this.props
      window.removeEventListener('keydown', this.escapeListener)
      helperCleanup()
      if (this.ref.current) {
        this.ref.current.classList.add('animate-fadeout')
      }
      setTimeout(() => {
        dispatch({ type: 'helperRemindMeLater', id, duration })
        if (this.props.id === 'welcome') {
          animateWelcome()
        }
      }, FADEOUT_DURATION)
    }

    // use capturing so that this fires before the global window Escape which removes the cursor
    window.addEventListener('keydown', this.escapeListener, true)
  }

  componentWillUnmount() {
    helperCleanup()
    window.removeEventListener('keydown', this.escapeListener)
  }

  render() {
    const { show, id, title, arrow, center, opaque, onSubmit, className, style, positionAtCursor, top, children, dispatch } = this.props

    const sel = document.getSelection()
    const cursorCoords = sel.type !== 'None' ? sel.getRangeAt(0).getClientRects()[0] || {} : {}

    if (!show) return null

    return <div ref={this.ref} style={Object.assign({}, style, top ? { top: 55 } : null, positionAtCursor ? {
      top: cursorCoords.y,
      left: cursorCoords.x
    } : null )} className={className + ' ' + classNames({
        helper: true,
        animate: true,
        [`helper-${id}`]: true,
        center,
        opaque
      })}>
      <div className={classNames({
        'helper-content': true,
        [arrow]: arrow
      })}>
        {title ? <p className='helper-title'>{title}</p> : null}
        <div className='helper-text'>{children}</div>
        <div className='helper-actions'>
          {
          id === 'welcome' ? <a className='button' onClick={() => {
            animateWelcome()
            dispatch({ type: 'helperComplete', id })
          }}>START TUTORIAL</a> :
          id === 'feedback' ? <div>
            <a className='button button-small button-inactive' onClick={() => {
              dispatch({ type: 'helperRemindMeLater', id })
            }}>Cancel</a>
            <a className='button button-small button-active' onClick={e => {
              if (onSubmit) {
                onSubmit(e)
              }
              dispatch({ type: 'helperRemindMeLater', id })
          }}>Send</a>
          </div> :
          id === 'shortcuts' ? <a className='button' onClick={() => {
            dispatch({ type: 'helperRemindMeLater', id })
          }}>Close</a> :
          <span>
            <a onClick={() => { dispatch({ type: 'helperComplete', id }) }}>Got it!</a>
            <span> </span><a onClick={() => this.close(HELPER_REMIND_ME_LATER_DURATION)}>Remind me later</a>
            {//<span> </span><a onClick={() => this.close(HELPER_REMIND_ME_TOMORROW_DURATION)}>Remind me tomorrow</a>
            }
          </span>}
          {id === 'welcome' ? <div><a onClick={() => {
            dispatch({ type: 'helperComplete', id })
            dispatch({ type: 'deleteTutorial' })
          }}>Skip tutorial</a></div> : null}
        </div>
        <a className='helper-close' onClick={() => this.close(HELPER_CLOSE_DURATION)}><span>✕</span></a>
      </div>
    </div>
  }
}

