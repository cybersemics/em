import React from 'react'
import AddIcon from './AddIcon'
// import { useDispatch, useSelector } from 'react-redux'
// import { State } from '../util/initialState'
// import classNames from 'classnames'
// import { toggleAbsoluteContext } from '../action-creators'
// import { isAbsolute } from '../util'
import { TouchableOpacity } from 'react-native'

/**
 * Quick Add Button.
 */
const QuickAddButton: React.FC = () => {
  // const rootContext = useSelector((state: State) => state.rootContext)
  // const dispatch = useDispatch()

  return (
    <TouchableOpacity>
      <AddIcon size={30} />
    </TouchableOpacity>
  )
}

export default QuickAddButton
