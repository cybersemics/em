import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import ellipsize from '../util/ellipsize'
import isRoot from '../util/isRoot'

interface Options {
  // override the name of the root thought being exported
  value?: string
}

/** Generates a user-friendly phrase describing how many thoughts will be exported. */
const exportPhrase = (state: State, id: ThoughtId, numDescendants: number | null, { value }: Options = {}) => {
  // presumably getThoughtById will never fail, but guard for safety
  const label = ellipsize(value || getThoughtById(state, id)?.value || 'thought')

  return isRoot([id])
    ? ` all ${numDescendants} thoughts`
    : `"${label}"${numDescendants ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}`
}

export default exportPhrase
