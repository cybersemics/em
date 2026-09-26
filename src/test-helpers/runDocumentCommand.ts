import _ from 'lodash'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN } from '../constants'
import db from '../data-providers/thoughtspace'

const roots = new Set<string>([ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN])

/**
 * Runs a command once against the real memory engine initialized by initStore.
 * A test may branch from an earlier immutable snapshot or construct a separate fixture. Restore that explicit
 * input through real document operations before the act, then give the command the engine's canonical projection.
 * This is fixture arrangement, not a second JavaScript implementation of the document or command.
 */
const runDocumentCommand = (
  command: (state: State, transaction: ThoughtspaceTransaction) => State,
  state: State,
): State => {
  const result = db.transact(transaction => {
    const current = transaction.project()
    const target = state.thoughts.thoughtIndex
    if (current.thoughtIndex !== target) {
      const thoughtIndexUpdates = {
        ...Object.fromEntries(
          Object.keys(current.thoughtIndex)
            .filter(id => !roots.has(id) && !target[id])
            .map(id => [id, null]),
        ),
        ...Object.fromEntries(
          Object.entries(target).filter(([id, thought]) => !_.isEqual(thought, current.thoughtIndex[id])),
        ),
      }
      const movePlacements = Object.fromEntries(
        Object.values(
          _.groupBy(
            Object.values(target).filter(thought => !roots.has(thought.id)),
            'parentId',
          ),
        )
          .flatMap(siblings =>
            [...siblings]
              .sort((a, b) => a.rank - b.rank)
              .map((thought, index, ordered) => [thought.id, index ? ordered[index - 1].id : null]),
          )
          .filter(([id]) => id! in thoughtIndexUpdates),
      ) as Record<ThoughtId, ThoughtId | null>
      transaction.update({ thoughtIndexUpdates, movePlacements }, state.thoughts)
    }
    const thoughts = transaction.project(state.thoughts)
    const input = thoughts === state.thoughts ? state : { ...state, thoughts }
    const next = command(input, transaction)
    const projected = transaction.project(next.thoughts)
    return projected === next.thoughts ? next : { ...next, thoughts: projected }
  })
  return result.value
}

export default runDocumentCommand
