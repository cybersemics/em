import _ from 'lodash'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN } from '../constants'
import hashThought from '../util/hashThought'
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
  let unchanged = false
  const result = commandThoughtspace.transact(transaction => {
    const current = transaction.project()
    const target = state.thoughts
    if (current !== target) {
      // Walk canonical child lists so restored parents and sibling anchors precede their dependents.
      const targetThoughts = [HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN].flatMap(id => target.getThought(id) ?? [])
      const movePlacements: Record<ThoughtId, ThoughtId | null> = {}
      for (const thought of targetThoughts) {
        const children = target.getChildren(thought.id)
        children.forEach((id, index) => {
          targetThoughts.push(target.getThought(id)!)
          movePlacements[id] = children[index - 1] ?? null
        })
      }
      const thoughtIndexUpdates = {
        ...Object.fromEntries(
          [...current.values()]
            .filter(thought => !roots.has(thought.id) && !target.getThought(thought.id))
            .map(thought => [thought.id, null]),
        ),
        ...Object.fromEntries(
          targetThoughts
            .filter(
              thought =>
                !_.isEqual(thought, current.getThought(thought.id)) ||
                (!roots.has(thought.id) && target.getPosition(thought.id) !== current.getPosition(thought.id)),
            )
            .map(thought => [thought.id, thought]),
        ),
      }
      transaction.update({ thoughtIndexUpdates, movePlacements })
    }
    const thoughts = transaction.project()
    const input = thoughts === state.thoughts ? state : { ...state, thoughts }
    const next = command(input, transaction)
    const projected = transaction.project()
    unchanged = next === input && projected === thoughts
    return projected === next.thoughts ? next : { ...next, thoughts: projected }
  })
  if (unchanged) return state
  // Test fixtures may branch later; capture their owned values only after real command execution has completed.
  const view = result.value.thoughts
  const rows = new Map(
    Array.from(view.values(), thought => [
      thought.id,
      { thought, children: view.getChildren(thought.id), position: view.getPosition(thought.id) },
    ]),
  )
  const lexemes = Object.fromEntries(
    Object.entries(
      _.groupBy(
        [...rows.values()].filter(row => !roots.has(row.thought.id)),
        row => hashThought(row.thought.value),
      ),
    ).map(([key, members]) => [key, Object.freeze(members.map(row => row.thought.id).sort())]),
  )
  return {
    ...result.value,
    thoughts: {
      revision: view.revision,
      layoutRevision: view.layoutRevision,
      getThought: id => rows.get(id)?.thought,
      getChildren: id => rows.get(id)?.children ?? [],
      getPosition: id => rows.get(id)?.position,
      values: function* () {
        for (const row of rows.values()) yield row.thought
      },
      getLexeme: value => lexemes[hashThought(value)],
    },
  }
}

export default runDocumentCommand
