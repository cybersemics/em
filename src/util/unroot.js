import { isRoot } from './isRoot.js'

export const unroot = thoughts =>
  thoughts.length > 0 && isRoot(thoughts.slice(0, 1))
    ? thoughts.slice(1)
    : thoughts
