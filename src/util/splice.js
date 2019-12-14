export const splice = (arr, start, deleteCount, ...items) =>
  [].concat(
    arr.slice(0, start),
    items,
    arr.slice(start + deleteCount)
  )

// assert.deepEqual(splice([1,2,3], 1, 1), [1,3])
// assert.deepEqual(splice([1,2,3], 1, 1, 4), [1,4,3])
