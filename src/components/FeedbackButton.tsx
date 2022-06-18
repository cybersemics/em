import React from 'react'
import showModal from '../action-creators/showModal'
import FeedbackIcon from './icons/FeedbackIcon'
import { useDispatch } from 'react-redux'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {
  const dispatch = useDispatch()
  return (
    <div style={{ display: 'inline-flex' }} onClick={() => dispatch(showModal({ id: 'feedback' }))}>
      <FeedbackIcon size={26} />
    </div>
  )
}

export default FeedbackButton
