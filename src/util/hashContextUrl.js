import { isRoot } from './isRoot.js'
import { isContextViewActive } from './isContextViewActive.js'

/** Encodes an items array into a URL. */
export const hashContextUrl = (items, { contextViews } = {}) =>
  '/' + (!items || isRoot(items)
    ? ''
    : items.map((item, i) =>
        window.encodeURIComponent(item) + (isContextViewActive(items.slice(0, i + 1), { state: { contextViews } }) ? '~' : '')
      ).join('/'))
