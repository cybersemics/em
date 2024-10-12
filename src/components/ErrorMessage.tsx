import { FC, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { errorActionCreator as error } from '../actions/error'
import toMilliseconds from '../util/toMilliseconds'
import CloseButton from './CloseButton'

/** An error message that can be dismissed with a close button. */
const ErrorMessage: FC = () => {
  const value = useSelector(state => state.error)
  const dispatch = useDispatch()
  const errorMessageRef = useRef<HTMLDivElement>(null)

  return (
    <TransitionGroup>
      {value ? (
        <CSSTransition
          key={0}
          nodeRef={errorMessageRef}
          timeout={toMilliseconds(token('durations.errorMessageFadeDuration'))}
          classNames='fade'
        >
          <div
            ref={errorMessageRef}
            className={css({
              position: 'fixed',
              top: 'safeAreaTop',
              left: '0',
              right: '0',
              padding: '5px 25px 5px 5px',
              backgroundColor: '#c23',
              color: 'white',
              textAlign: 'center',
              zIndex: 'popup',
              wordBreak: 'break-word',
            })}
          >
            {value.toString()}
            <CloseButton onClose={() => dispatch(error({ value: null }))} />
          </div>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default ErrorMessage
