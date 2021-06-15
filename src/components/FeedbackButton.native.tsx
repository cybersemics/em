import React from 'react'
import FeedbackIcon from './icons/FeedbackIcon'
import { TouchableOpacity } from 'react-native'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {

  return (
    <TouchableOpacity
      onPress={() => console.log('dispatch show feedback modal')}
    >
      <FeedbackIcon size={40} />
    </TouchableOpacity>
  )
}

export default FeedbackButton
