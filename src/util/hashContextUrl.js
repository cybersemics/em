import { isRoot } from './isRoot'
import { isContextViewActive } from './isContextViewActive'

/** Encodes thoughts array into a URL. */
export const hashContextUrl = (thoughts, { contextViews } = {}) =>
  '/' + (!thoughts || isRoot(thoughts)
    ? ''
    : thoughts.map((thought, i) =>
      window.encodeURIComponent(thought).replace(/~/g, '%257e') + (isContextViewActive(thoughts.slice(0, i + 1), { state: { contextViews } }) ? '~' : '')
    ).join('/'))
