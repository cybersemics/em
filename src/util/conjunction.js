/** Renders a list of items as a sentence. */
export const conjunction = items =>
  items.slice(0, items.length - 1).join(', ') + (items.length !== 2 ? ',' : '') + ' and ' + items[items.length - 1]
