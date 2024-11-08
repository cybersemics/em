import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'

/**
 * Note: We add an overload for `SimplePath` here to avoid TypeScript inferring `string | ThoughtId`
 * as part of the brand resolution.
 */

function head(list: SimplePath): ThoughtId
function head<T>(list: T[]): T
/** Gets the last ThoughtId or value in a Path or Context. */
function head<T>(list: T[]): T {
  return list[list.length - 1]
}

export default head
