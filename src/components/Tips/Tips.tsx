import { FC, Fragment } from 'react'
import { useSelector } from 'react-redux'
import TipId from '../../@types/TipId'
import getTip from '../../selectors/getTip'
import NewSubthoughtTip from './NewSubthoughtTip'
import NewThoughtTip from './NewThoughtTip'

/** A container for rendering all of the tips. */
const Tips: FC = () => {
  const tip = useSelector(getTip)
  return (
    <Fragment>
      <NewThoughtTip display={tip === TipId.NewThought} />
      <NewSubthoughtTip display={tip === TipId.NewSubthought} />
    </Fragment>
  )
}

export default Tips
