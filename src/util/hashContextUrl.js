import { isRoot } from './isRoot.js'

/** Encodes thoughts array into a URL. */
export const hashContextUrl = thoughts => '/' + (!thoughts || isRoot(thoughts)
  ? '' : thoughts.map(thought => window.encodeURIComponent(thought)).join('/'))
