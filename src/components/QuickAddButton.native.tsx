import React from 'react'
import AddIcon from './AddIcon'
import { useDispatch } from 'react-redux'
import toggleAbsoluteContext from '../action-creators/toggleAbsoluteContext'
// import isAbsolute from '../util/isAbsolute'
import { TouchableOpacity } from 'react-native'

/**
 * Quick Add Button.
 */
const QuickAddButton: React.FC = () => {
  // const rootContext = useSelector((state: State) => state.rootContext)
  const dispatch = useDispatch()

  return (
    <TouchableOpacity onPress={() => dispatch(toggleAbsoluteContext())}>
      <AddIcon size={30} />
    </TouchableOpacity>
  )
}

export default QuickAddButton
