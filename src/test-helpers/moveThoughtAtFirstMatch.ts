import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import moveThought, { MoveThoughtPayload, moveThoughtActionCreator } from '../actions/moveThought'
import contextToPath from '../selectors/contextToPath'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import head from '../util/head'
import contextToPathOrThrow from './contextToPathOrThrow'

type Payload = Omit<MoveThoughtPayload, 'oldPath' | 'newPath' | 'afterId'> & {
  from: string[]
  to: string[]
  after: string[] | null
}

/**
 * Get ranked old and new paths for the unranked paths.
 */
const getMovePaths = (state: State, from: string[], to: string[]): [Path, Path] => {
  const oldPath = contextToPath(state, from)

  if (!oldPath) throw new Error(`Ranked thoughts not found for context: ${from}`)

  if (head(to) !== head(from)) throw new Error('The head of the old path and new path does not match.')

  const toPath = contextToPath(state, rootedParentOf(state, to))

  if (!toPath) throw new Error(`Ranked thoughts not found for context: ${to}`)

  const newPath = appendToPath(toPath, head(oldPath))

  return [oldPath, newPath]
}
/**
 * Moves a given thought represented by unranked path to some other context also represented by unranked path.
 *
 * @param from: Unranked path to the thought that is being moved.
 * @param to: Unranked path representing which context the thoughts should be moved.
 * @param after: Unranked path to the destination predecessor, or null to move first.
 */
const moveThoughtAtFirstMatch = command((state: State, payload: Payload, document?: ThoughtspaceTransaction) => {
  const { from, to, after, ...options } = payload
  const [oldPath, newPath] = getMovePaths(state, from, to)
  return moveThought({
    ...options,
    oldPath,
    newPath,
    afterId: after === null ? null : head(contextToPathOrThrow(state, after, 'moveThoughtAtFirstMatch')),
  })(state, document)
})

/**
 * Action creator that moves a given thought represented by unranked path to some other context also represented by unranked path.
 */
export const moveThoughtAtFirstMatchActionCreator =
  (payload: Payload): Thunk =>
  (dispatch, getState) => {
    const { from, to, after, ...options } = payload
    const state = getState()
    const [oldPath, newPath] = getMovePaths(state, from, to)
    dispatch(
      moveThoughtActionCreator({
        ...options,
        oldPath,
        newPath,
        afterId: after === null ? null : head(contextToPathOrThrow(state, after, 'moveThoughtAtFirstMatch')),
      }),
    )
  }

export default moveThoughtAtFirstMatch
