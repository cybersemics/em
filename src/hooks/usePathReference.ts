import { useSelector } from 'react-redux'
import ThoughtId from '../@types/ThoughtId'
import resolvePathReference from '../util/resolvePathReference'

/** Returns path reference information for a thought if it has a =note/=path attribute. */
const usePathReference = (thoughtId: ThoughtId) => {
  return useSelector(state => resolvePathReference(state, thoughtId))
}

export default usePathReference
