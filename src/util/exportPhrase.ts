import ellipsize from '../util/ellipsize'
import head from '../util/head'
import isRoot from '../util/isRoot'
import Context from '../@types/Context'
import State from '../@types/State'

interface Options {
  // override the name of the root thought being exported
  value?: string
}

/** Generates a user-friendly phrase describing how many thoughts will be exported. */
const exportPhrase = (state: State, context: Context, numDescendants: number | null, { value }: Options = {}) => {
  const label = ellipsize(value || head(context))

  return isRoot(context)
    ? ` all ${numDescendants} thoughts`
    : `"${label}"${numDescendants ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}`
}

export default exportPhrase
