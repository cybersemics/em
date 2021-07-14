import { Context, State } from '../@types'
import { isContextViewActive } from '../selectors'
import { isRoot } from '../util'

/** Encodes context array into a URL. */
const hashContextUrl = (state: State, context: Context) => {
  if (!context || isRoot(context)) return '/'

  const userId = window.location.pathname.split('/')[1] || '~'
  const queryString = window.location.search
  const thoughtsEncoded = context
    .map(
      (thoughtContext, i) =>
        window.encodeURIComponent(thoughtContext).replace(/~/g, '%257e') +
        (isContextViewActive(state, context.slice(0, i + 1)) ? '~' : ''),
    )
    .join('/')

  return `/${userId}/${thoughtsEncoded}${queryString}`
}

export default hashContextUrl
