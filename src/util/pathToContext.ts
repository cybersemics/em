//@ts-nocheck

/** Converts paths [{ value, rank }, ...] to contexts [key, ...]. */
// if already converted, return a shallow copy
// if falsey, return as-is
export const pathToContext = thoughts => {
  return thoughts
    ? thoughts.length > 0 && typeof thoughts[0] === 'object' && 'value' in thoughts[0]
      ? thoughts.map(child => child.value)
      : thoughts.slice()
    // return falsey value as-is
    : thoughts
}
