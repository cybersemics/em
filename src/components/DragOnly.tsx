import { FC, PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import testFlags from '../e2e/testFlags'

/** A container fragment that only renders its children when dragInProgress is true. Useful for short circuiting child components with more expensive selectors. */
const DragOnly: FC<PropsWithChildren> = ({ children }) => {
  const dragInProgress = useSelector(state => state.dragInProgress)
  return <>{testFlags.simulateDrag || testFlags.simulateDrop || dragInProgress ? children : null}</>
}

export default DragOnly
