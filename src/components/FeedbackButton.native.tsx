import React from 'react'
import FeedbackIcon from './icons/FeedbackIcon'
import { TouchableOpacity } from 'react-native'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {

  return (
    <TouchableOpacity>
      <FeedbackIcon size={40} />
    </TouchableOpacity>
  )
}

export default FeedbackButton
