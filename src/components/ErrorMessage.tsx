import { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { errorActionCreator as error } from '../actions/error'
import usePositionFixed from '../hooks/usePositionFixed'
import CloseButton from './CloseButton'
import FadeTransition from './FadeTransition'

/** An error message that can be dismissed with a close button. */
const ErrorMessage: FC = () => {
  const value = useSelector(state => state.error)
  const dispatch = useDispatch()
  const positionFixedStyles = usePositionFixed()

  return (
    <TransitionGroup>
      {value ? (
        <FadeTransition duration='fast'>
          <div
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
