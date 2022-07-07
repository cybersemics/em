import React from 'react'
import { TouchableOpacity } from 'react-native'
import { useDispatch } from 'react-redux'
import showModal from '../action-creators/showModal'
import FeedbackIcon from './icons/FeedbackIcon'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {
  const dispatch = useDispatch()

  return (
    <TouchableOpacity onPress={() => dispatch(showModal({ id: 'feedback' }))}>
      <FeedbackIcon size={40} />
    </TouchableOpacity>
  )
}

export default FeedbackButton
