import { isRoot } from './isRoot.js'
import { isContextViewActive } from './isContextViewActive.js'

/** Encodes thoughts array into a URL. */
export const hashContextUrl = (thoughts, { contextViews } = {}) =>
  '/' + (!thoughts || isRoot(thoughts)
    ? ''
    : thoughts.map((thought, i) =>
      window.encodeURIComponent(thought) + (isContextViewActive(thoughts.slice(0, i + 1), { state: { contextViews } }) ? '~' : '')
    ).join('/'))
