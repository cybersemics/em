import React from 'react'
import { useDispatch } from 'react-redux'
import alert from '../action-creators/alert'
import { AlertType } from '../constants'
import GestureHintIcon from './icons/GestureHintIcon'

/** A button that activates the extended gesture hint. */
const GestureHintExtendedButton: React.FC = () => {
  const dispatch = useDispatch()

  return (
    <div
      onClick={() =>
        dispatch(
          alert('*', {
            alertType: AlertType.GestureHintExtended,
            showCloseLink: true,
          }),
        )
      }
    >
      <GestureHintIcon size={20} />
    </div>
  )
}

export default GestureHintExtendedButton
