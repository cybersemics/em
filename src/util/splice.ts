/** Pure splice. */
export const splice = <T>(arr: T[], start: number, deleteCount: number, ...thoughts: T[]) =>
  // eslint-disable-next-line no-extra-parens
  ([] as T[]).concat(
    arr.slice(0, start),
    thoughts,
    arr.slice(start + deleteCount)
  )
