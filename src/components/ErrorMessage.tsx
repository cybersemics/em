import { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import error from '../action-creators/error'
import fastClick from '../util/fastClick'

/** An error message that can be dismissed with a close button. */
const ErrorMessage: FC = () => {
  const value = useSelector(state => state.error)
  const dispatch = useDispatch()
  return (
    <TransitionGroup>
      {value ? (
        <CSSTransition key={0} timeout={200} classNames='fade'>
          <div className='error-message'>
            {value.toString()}
            <a className='upper-right status-close-x text-small' {...fastClick(() => dispatch(error({ value: null })))}>
              ✕
            </a>
          </div>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default ErrorMessage
