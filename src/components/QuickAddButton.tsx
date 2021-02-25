import React from 'react'
import AddIcon from './AddIcon'
import { useDispatch, useSelector } from 'react-redux'
import { State } from '../util/initialState'
import classNames from 'classnames'
import { toggleAbsoluteContext } from '../action-creators'
import { isAbsolute } from '../util'

/**
 * Quick Add Button.
 */
const QuickAddButton: React.FC = () => {
  const rootContext = useSelector((state: State) => state.rootContext)
  const dispatch = useDispatch()

  return (
    <div className={classNames({
      'quick-add-button': true,
      rotate: isAbsolute(rootContext)
    })} onClick={() => dispatch(toggleAbsoluteContext())}>
      <AddIcon size={20}/>
    </div>
  )
}

export default QuickAddButton
