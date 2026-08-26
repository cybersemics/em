import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import head from '../util/head'
import { isContextStep, stepId } from '../util/pathStep'
import getThoughtById from './getThoughtById'

/**
 * Returns the id of the thought that is displayed and edited at the head of a Path.
 *
 * In the context view this is the **parent context** — `b` for the row `a/m~/b` — i.e. the parent of the Lexeme
 * context the step lands on. Everywhere else it is the same as headId.
 *
 * Use this for anything the user perceives as "this thought": its value, editing it, formatting it, and activating a
 * nested context view on it. Use headId/simplifyPath for anything structural: children, delete, move, sort, drop.
 */
const parentContextId = (state: State, path: Path): ThoughtId => {
  const step = head(path)
  const id = stepId(step)
  return isContextStep(step) ? (getThoughtById(state, id)?.parentId ?? id) : id
}

/**
 * Returns the id of the thought displayed at each step of a Path.
 *
 * The dual of pathToContext, which returns their values. A context step contributes the context rather than the Lexeme
 * Lexeme context it lands on, so a/m~/b yields the ids of a, m, and b.
 */
export const parentContextIds = (state: State, path: Path): ThoughtId[] =>
  path.map((step, i) =>
    isContextStep(step) ? (getThoughtById(state, stepId(step))?.parentId ?? stepId(step)) : stepId(step),
  )

export default parentContextId
