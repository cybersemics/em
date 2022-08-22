/** Pure splice. */
const splice = <T>(arr: T[], start: number, deleteCount: number, ...itemsToInsert: T[]) =>
  ([] as T[]).concat(arr.slice(0, start), itemsToInsert, arr.slice(start + deleteCount))

export default splice
