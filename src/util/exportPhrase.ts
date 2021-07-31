import { ellipsize, head, isRoot } from '../util'
import { Context, State } from '../@types'

interface Options {
  // override the name of the root thought being exported
  value?: string
}

/** Generates a user-friendly phrase describing how many thoughts will be exported. */
export const exportPhrase = (
  state: State,
  context: Context,
  numDescendants: number | null,
  { value }: Options = {},
) => {
  const label = ellipsize(value || head(context))

  return isRoot(context)
    ? ` all ${numDescendants} thoughts`
    : `"${label}"${numDescendants ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}`
}
