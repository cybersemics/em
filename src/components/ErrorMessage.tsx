import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { error } from '../action-creators'
import { State } from '../util/initialState'
import { Connected } from '../types'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ error }: State) => ({ value: error })

/** An error message that can be dismissed with a close button. */
const ErrorMessage = ({ value, dispatch }: Connected<{ value?: any }>) =>
  <TransitionGroup>
    {value
      ? <CSSTransition key={0} timeout={200} classNames='fade'>
        <div className='error-message'>
          {value.toString()}
          <a className='upper-right status-close-x text-small' onClick={() =>
            dispatch(error({ value: null }))
          }>✕</a>
        </div>
      </CSSTransition>
      : null}
  </TransitionGroup>

export default connect(mapStateToProps)(ErrorMessage)
