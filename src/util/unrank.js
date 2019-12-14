/** Converts [{ key, rank }, ...] to just [key, ...]. */
// if already converted, return a shallow copy
// if falsey, return as-is
export const unrank = items => {
  return items
    ? items.length > 0 && typeof items[0] === 'object' && 'key' in items[0]
      ? items.map(child => child.key)
      : items.slice()
    // return falsey value as-is
    : items
}
