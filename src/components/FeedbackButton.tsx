import React from 'react'
import { showModal } from '../action-creators'
import ChatIcon from './ChatIcon'
import { useDispatch } from 'react-redux'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {
  const dispatch = useDispatch()
  return (
    <div style={{
      display: 'inline-flex'
    }} onClick={() => dispatch(showModal({
      id: 'feedback'
    }))}>
      <ChatIcon size={20}/>
    </div>
  )
}

export default FeedbackButton
