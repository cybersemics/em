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
      style={{ overflow: 'hidden', width: 30, height: 20, marginTop: 2, marginRight: -16 }}
    >
      <GestureDiagram path={'rdr'} size={55} strokeWidth={4} style={{ marginTop: -19, marginLeft: -8 }} />
    </div>
  )
}

export default GestureHintExtendedButton
