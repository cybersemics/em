import moveThought, { MoveThoughtPayload } from '../reducers/moveThought'
import _ from 'lodash'
import { rankThoughtsFirstMatch, rootedParentOf } from '../selectors'
import { appendToPath, head } from '../util'
import { State } from '../@types'

/**
 * Moves a given thought represented by unranked path to some other context also represented by unranked path.
 *
 * @param at: Unraked path to the thought that is being moved.
 * @param to: Unranked path representing which context the thoughts should be moved.
 */
const moveThoughtAtFirstMatch = _.curryRight(
  (state: State, payload: Omit<MoveThoughtPayload, 'oldPath' | 'newPath'> & { from: string[]; to: string[] }) => {
    const oldPath = rankThoughtsFirstMatch(state, payload.from)

    if (!oldPath) throw new Error(`Ranked thoughts not found for context: ${payload.from}`)

    if (head(payload.to) !== head(payload.from))
      throw new Error('The head of the old path and new path does not match.')

    const toPath = rankThoughtsFirstMatch(state, rootedParentOf(state, payload.to))

    if (!toPath) throw new Error(`Ranked thoughts not found for context: ${payload.to}`)

    const newPath = appendToPath(toPath, head(oldPath))

    return moveThought(state, {
      ...payload,
      oldPath,
      newPath,
    })
  },
)

export default moveThoughtAtFirstMatch
