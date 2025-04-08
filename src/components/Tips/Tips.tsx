import { FC } from 'react'
import NewSubthoughtTip from './NewSubthoughtTip'
import NewThoughtTip from './NewThoughtTip'

/** A container for rendering all of the tips. */
const Tips: FC = () => {
  return (
    <>
      <NewThoughtTip />
      <NewSubthoughtTip />
    </>
  )
}

export default Tips
