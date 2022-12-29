import React from 'react'
import { useDispatch } from 'react-redux'
import Modal from '../@types/Modal'
import showModal from '../action-creators/showModal'
import FeedbackIcon from './icons/FeedbackIcon'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {
  const dispatch = useDispatch()
  return (
    <div
      style={{ display: 'inline-flex' }}
      onClick={() => dispatch(showModal({ id: Modal.feedback }))}
      title='Feedback'
    >
      <FeedbackIcon size={26} />
    </div>
  )
}

export default FeedbackButton
