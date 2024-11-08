import Context from '../@types/Context'

/**
 * Takes two context A and B and checks if B is descendant of A (exclusive).
 *
 * @example
 *
 * A=['1','2','3']
 * B=['1','2','3','4']
 *
 * returns true
 *
 * A=['1','2','3']
 * B=['1','2','5','6']
 *
 * returns false
 */
const isDescendant = (contextA: Context, contextB: Context) => {
  // ancestor context cannot have length greater that its descendant context
  if (contextA.length >= contextB.length) return false

  // return true only when every value from first index to last index of contextA is equal to value of contextB at same index
  return contextA.every((value, i) => contextB[i] === value)
}

export default isDescendant
