import { isRoot } from '../util'
import { isContextViewActive } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Encodes context array into a URL. */
const hashContextUrl = (state: State, context: Context) => {

  if (!context || isRoot(context)) return '/'

  const userId = window.location.pathname.split('/')[1] || '~'
  const queryString = window.location.search
  const thoughtsEncoded = context.map((thought, i) =>
    window.encodeURIComponent(thought).replace(/~/g, '%257e') + (isContextViewActive(state, context.slice(0, i + 1)) ? '~' : '')
  ).join('/')

  return `/${userId}/${thoughtsEncoded}${queryString}`
}

export default hashContextUrl
