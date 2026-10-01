import _ from 'lodash'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN } from '../constants'
import commandThoughtspace from './commandThoughtspace'

const roots = new Set<string>([ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN])

/**
 * Runs a command once against the isolated fixture engine initialized by initStore.
 * A test may branch from an earlier immutable snapshot or construct a separate fixture. Restore that explicit
 * input through real document operations before the act, then give the command the engine's canonical projection.
 * Fixture changes never publish into the live editor's unrelated UI state. Both providers use the same production
 * document engine and transaction implementation.
 */
const runDocumentCommand = (
  command: (state: State, transaction: ThoughtspaceTransaction) => State,
  state: State,
): State => {
  const result = commandThoughtspace.transact(transaction => {
    const current = transaction.project()
    const target = state.thoughts
    if (current !== target) {
      const thoughtIndexUpdates = {
        ...Object.fromEntries(
          [...current.values()]
            .filter(thought => !roots.has(thought.id) && !target.getThought(thought.id))
            .map(thought => [thought.id, null]),
        ),
        ...Object.fromEntries(
          [...target.values()]
            .filter(
              thought =>
                !_.isEqual(thought, current.getThought(thought.id)) ||
                target.getPosition(thought.id) !== current.getPosition(thought.id),
            )
            .map(thought => [thought.id, thought]),
        ),
      }
      const movePlacements = Object.fromEntries(
        Object.values(
          _.groupBy(
            [...target.values()].filter(thought => !roots.has(thought.id)),
            'parentId',
          ),
        )
          .flatMap(siblings =>
            [...siblings]
              .sort((a, b) => (target.getPosition(a.id) ?? 0) - (target.getPosition(b.id) ?? 0))
              .map((thought, index, ordered) => [thought.id, index ? ordered[index - 1].id : null]),
          )
          .filter(([id]) => id! in thoughtIndexUpdates),
      ) as Record<ThoughtId, ThoughtId | null>
      transaction.update({ thoughtIndexUpdates, movePlacements })
    }
    const thoughts = transaction.project()
    const input = thoughts === state.thoughts ? state : { ...state, thoughts }
    const next = command(input, transaction)
    const projected = transaction.project()
    return projected === next.thoughts ? next : { ...next, thoughts: projected }
  })
  return result.value
}

export default runDocumentCommand
