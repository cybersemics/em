import { isRoot } from '../util'
import { isContextViewActive } from '../selectors'

/** Encodes thoughts array into a URL. */
const hashContextUrl = (state, thoughts) => {

  if (!thoughts || isRoot(thoughts)) return '/'

  const userId = window.location.pathname.split('/')[1] || '~'
  const queryString = window.location.search
  const thoughtsEncoded = thoughts.map((thought, i) =>
    window.encodeURIComponent(thought).replace(/~/g, '%257e') + (isContextViewActive(state, thoughts.slice(0, i + 1)) ? '~' : '')
  ).join('/')

  return `/${userId}/${thoughtsEncoded}${queryString}`
}

export default hashContextUrl
