import { isRoot } from '../util'

// selectors
import { isContextViewActive } from '../selectors'

/** Encodes thoughts array into a URL. */
export default (state, thoughts) => {
  return '/' + (!thoughts || isRoot(thoughts)
    ? ''
    : thoughts.map((thought, i) =>
      window.encodeURIComponent(thought).replace(/~/g, '%257e') + (isContextViewActive(state, thoughts.slice(0, i + 1)) ? '~' : '')
    ).join('/'))
  // include query string
  + window.location.search
}
