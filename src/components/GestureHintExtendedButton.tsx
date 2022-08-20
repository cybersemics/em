import React from 'react'
import { useDispatch } from 'react-redux'
import showModal from '../action-creators/showModal'
import GestureDiagram from './GestureDiagram'

/** A button that activates the extended gesture hint. */
const GestureHintExtendedButton: React.FC = () => {
  const dispatch = useDispatch()

  return (
    <div onClick={() => dispatch(showModal({ id: 'gesture-help' }))} style={{ display: 'inline-flex' }}>
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
