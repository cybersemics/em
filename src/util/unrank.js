/** Converts [{ key, rank }, ...] to just [key, ...]. */
// if already converted, return a shallow copy
// if falsey, return as-is
export const unrank = thoughts => {
  return thoughts
    ? thoughts.length > 0 && typeof thoughts[0] === 'object' && 'key' in thoughts[0]
      ? thoughts.map(child => child.key)
      : thoughts.slice()
    // return falsey value as-is
    : thoughts
}
