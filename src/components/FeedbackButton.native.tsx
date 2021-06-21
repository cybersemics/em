import React from 'react'
import FeedbackIcon from './icons/FeedbackIcon'
import { TouchableOpacity } from 'react-native'
import { showModal } from '../action-creators'
import { useDispatch } from 'react-redux'
/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {

  const dispatch = useDispatch()

  return (
    <TouchableOpacity onPress={() => dispatch(showModal({ id: 'feedback' }))}>
      <FeedbackIcon size={40} />
    </TouchableOpacity >
  )
}

export default FeedbackButton
