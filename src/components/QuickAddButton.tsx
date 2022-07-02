import classNames from 'classnames'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import State from '../@types/State'
import toggleAbsoluteContext from '../action-creators/toggleAbsoluteContext'
import isAbsolute from '../util/isAbsolute'
import AddIcon from './AddIcon'

/**
 * Quick Add Button.
 */
const QuickAddButton: React.FC = () => {
  const rootContext = useSelector((state: State) => state.rootContext)
  const dispatch = useDispatch()

  return (
    <div
      className={classNames({
        'quick-add-button': true,
        rotate: isAbsolute(rootContext),
      })}
      onClick={() => dispatch(toggleAbsoluteContext())}
    >
      <AddIcon size={20} />
    </div>
  )
}

export default QuickAddButton
