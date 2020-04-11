import { isRoot, isContextViewActive } from '../util'

/** Encodes thoughts array into a URL. */
export default ({ contextViews }, thoughts) =>
  '/' + (!thoughts || isRoot(thoughts)
    ? ''
    : thoughts.map((thought, i) =>
      window.encodeURIComponent(thought).replace(/~/g, '%257e') + (isContextViewActive(thoughts.slice(0, i + 1), { state: { contextViews } }) ? '~' : '')
    ).join('/'))
