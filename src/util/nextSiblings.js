export const nextSiblings = el =>
  el.nextSibling
    ? [el.nextSibling].concat(nextSiblings(el.nextSibling))
    : []
