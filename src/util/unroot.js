import { isRoot } from './isRoot.js'

export const unroot = items =>
  items.length > 0 && isRoot(items.slice(0, 1))
    ? items.slice(1)
    : items
