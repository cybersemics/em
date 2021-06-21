import React from 'react'
import FeedbackIcon from './icons/FeedbackIcon'
import { TouchableOpacity } from 'react-native'
import { showModal } from '../action-creators'
import { useDispatch, useSelector } from 'react-redux'
import { State } from '../util/initialState'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {

  const dispatch = useDispatch()

  const modal = useSelector((state: State) => state.showModal)

  React.useEffect(() => {
    console.log({ modal })
  }, [modal])

  return (
    <TouchableOpacity onPress={() => dispatch(showModal({ id: 'feedback' }))}>
      <FeedbackIcon size={40} />
    </TouchableOpacity >
  )
}

export default FeedbackButton
