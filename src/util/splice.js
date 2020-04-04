/* Pure splice */
export const splice = (arr, start, deleteCount, ...thoughts) =>
  [].concat(
    arr.slice(0, start),
    thoughts,
    arr.slice(start + deleteCount)
  )

// assert.deepEqual(splice([1,2,3], 1, 1), [1,3])
// assert.deepEqual(splice([1,2,3], 1, 1, 4), [1,4,3])
