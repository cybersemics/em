import React from 'react'
import { useDispatch } from 'react-redux'
import alert from '../action-creators/alert'
import { AlertType } from '../constants'
import GestureDiagram from './GestureDiagram'

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
      style={{ display: 'inline-flex' }}
    >
      <GestureDiagram
        path={'ldr'}
        width={20}
        height={20}
        strokeWidth={5}
        // override viewBox for better cropping
        viewBox='-5 55 85 50'
        style={{ marginRight: 1 }}
      />
    </div>
  )
}

export default GestureHintExtendedButton
