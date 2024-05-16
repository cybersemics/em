import classNames from 'classnames'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleAbsoluteContextActionCreator as toggleAbsoluteContext } from '../actions/toggleAbsoluteContext'
import fastClick from '../util/fastClick'
import isAbsolute from '../util/isAbsolute'
import AddIcon from './AddIcon'

/**
 * Quick Add Button.
 */
const QuickAddButton: React.FC = () => {
  const rootContext = useSelector(state => state.rootContext)
  const dispatch = useDispatch()

  return (
    <div
      className={classNames({
        'quick-add-button': true,
        rotate: isAbsolute(rootContext),
      })}
      {...fastClick(() => dispatch(toggleAbsoluteContext()))}
      title='Quick Add'
    >
      <AddIcon size={20} />
    </div>
  )
}

export default QuickAddButton
