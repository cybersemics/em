import moveThought, { MoveThoughtPayload } from '../reducers/moveThought'
import { moveThought as moveThoughtActionCreator } from '../action-creators'
import _ from 'lodash'
import { rankThoughtsFirstMatch, rootedParentOf } from '../selectors'
import { appendToPath, head } from '../util'
import { Path, State, Thunk } from '../@types'

type Payload = Omit<MoveThoughtPayload, 'oldPath' | 'newPath'> & { from: string[]; to: string[] }

/**
 * Get ranked old and new paths for the unranked paths.
 */
const getMovePaths = (state: State, from: string[], to: string[]): [Path, Path] => {
  const oldPath = rankThoughtsFirstMatch(state, from)

  if (!oldPath) throw new Error(`Ranked thoughts not found for context: ${from}`)

  if (head(to) !== head(from)) throw new Error('The head of the old path and new path does not match.')

  const toPath = rankThoughtsFirstMatch(state, rootedParentOf(state, to))

  if (!toPath) throw new Error(`Ranked thoughts not found for context: ${to}`)

  const newPath = appendToPath(toPath, head(oldPath))

  return [oldPath, newPath]
}
/**
 * Moves a given thought represented by unranked path to some other context also represented by unranked path.
 *
 * @param at: Unraked path to the thought that is being moved.
 * @param to: Unranked path representing which context the thoughts should be moved.
 */
const moveThoughtAtFirstMatch = _.curryRight((state: State, payload: Payload) => {
  const [oldPath, newPath] = getMovePaths(state, payload.from, payload.to)
  return moveThought(state, {
    ...payload,
    oldPath,
    newPath,
  })
})

/**
 * Action creator that moves a given thought represented by unranked path to some other context also represented by unranked path.
 */
export const moveThoughtAtFirstMatchActionCreator =
  (payload: Payload): Thunk =>
  (dispatch, getState) => {
    const [oldPath, newPath] = getMovePaths(getState(), payload.from, payload.to)
    dispatch(
      moveThoughtActionCreator({
        ...payload,
        oldPath,
        newPath,
      }),
    )
  }

export default moveThoughtAtFirstMatch
