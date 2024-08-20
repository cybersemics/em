import { FC, Fragment } from 'react'
import { useSelector } from 'react-redux'
import TipId from '../../@types/TipId'
import NewSubthoughtTip from './NewSubthoughtTip'
import NewThoughtTip from './NewThoughtTip'

/** A container for rendering all of the tips. */
const Tips: FC = () => {
  const tip = useSelector(state => state.tips[0])
  return (
    <Fragment>
      <NewThoughtTip display={tip === TipId.NewThought} />
      <NewSubthoughtTip display={tip === TipId.NewSubthought} />
    </Fragment>
  )
}

export default Tips
