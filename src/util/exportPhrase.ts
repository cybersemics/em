import { ellipsize, head, isRoot } from '../util'
import { Context, State } from '../@types'

interface Options {
  // override the name of the root thought being exported
  value?: string
}

/** Counts the number of descendents of a path and returns a user-friendly phrase describing how many thoughts will be exported. */
export const exportPhrase = (state: State, context: Context, exportContent: string | null, { value }: Options = {}) => {
  const label = ellipsize(value || head(context))
  const numDescendants = exportContent ? exportContent.split('\n').length - 1 : 0

  return isRoot(context)
    ? ` all ${numDescendants} thoughts`
    : `"${label}"${numDescendants > 0 ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}`
}
