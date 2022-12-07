import React, { FC } from 'react'
import { useSelector } from 'react-redux'
import State from '../@types/State'
import globals from '../globals'

/** A container fragment that only renders its children when dragInProgress is true. Useful for short circuiting child components with more expensive selectors. */
const DragOnly: FC = ({ children }) => {
  const dragInProgress = useSelector((state: State) => state.dragInProgress)
  return <>{globals.simulateDrag || globals.simulateDrop || dragInProgress ? children : null}</>
}

export default DragOnly
