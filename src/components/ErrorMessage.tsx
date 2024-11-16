import { FC, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { errorActionCreator as error } from '../actions/error'
import usePositionFixed from '../hooks/usePositionFixed'
import CloseButton from './CloseButton'
import FadeTransition from './FadeTransition'

/** An error message that can be dismissed with a close button. */
const ErrorMessage: FC = () => {
  const value = useSelector(state => state.error)
  const dispatch = useDispatch()
  const errorMessageRef = useRef<HTMLDivElement>(null)
  const positionFixedStyles = usePositionFixed()

  return (
    <TransitionGroup>
      {value ? (
        <FadeTransition key={0} nodeRef={errorMessageRef}>
          <div
            ref={errorMessageRef}
            className={css({
              left: '0',
              right: '0',
              padding: '5px 25px 5px 5px',
              backgroundColor: 'error',
              color: 'white',
              textAlign: 'center',
              zIndex: 'popup',
              wordBreak: 'break-word',
            })}
            style={{
              ...positionFixedStyles,
              top: `calc(${token('spacing.safeAreaTop')} + ${positionFixedStyles.top}px)`,
            }}
          >
            {value.toString()}
            <CloseButton onClose={() => dispatch(error({ value: null }))} />
          </div>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default ErrorMessage
