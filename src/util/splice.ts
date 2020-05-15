//@ts-nocheck

/** Pure splice. */
export const splice = (arr, start, deleteCount, ...thoughts) =>
  [].concat(
    arr.slice(0, start),
    thoughts,
    arr.slice(start + deleteCount)
  )
