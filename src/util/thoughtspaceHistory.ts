import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import createChildrenMap from './createChildrenMap'

/** Serializable editor diagnostics, never a second live document or an input to engine undo. */
type DiagnosticThought = Thought & { childrenMap: Index<ThoughtId>; rank: number }
type DiagnosticState = Omit<State, 'thoughts'> & {
  thoughts: { thoughtIndex: Index<DiagnosticThought>; lexemeIndex: Index<Lexeme> }
}

/** Captures selected diagnostic records, or the whole document for reports and reset fallbacks. */
const capture = (
  state: State,
  scope?: { thoughtIds: ReadonlySet<ThoughtId>; lexemeKeys: ReadonlySet<string> },
): DiagnosticState => ({
  ...state,
  thoughts: {
    thoughtIndex: Object.fromEntries(
      (scope
        ? Array.from(scope.thoughtIds).flatMap(id => {
            const thought = state.thoughts.getThought(id)
            return thought ? [thought] : []
          })
        : Array.from(state.thoughts.values())
      ).map(thought => {
        const childrenMap = createChildrenMap(state, state.thoughts.getChildren(thought.id))
        return [thought.id, { ...thought, rank: state.thoughts.getPosition(thought.id) ?? 0, childrenMap }]
      }),
    ),
    lexemeIndex: scope ? _.pick(state.thoughts.lexemeIndex, [...scope.lexemeKeys]) : state.thoughts.lexemeIndex,
  },
})

/** Adapts patched diagnostics for read-only selectors without replaying them into the canonical engine. */
const restore = (state: DiagnosticState): State => {
  const { thoughtIndex, lexemeIndex } = state.thoughts
  const thoughts = new Map<ThoughtId, Thought>()
  const children = new Map<ThoughtId, readonly ThoughtId[]>()
  /** Reuses diagnostic payloads independently of legacy rank and child-map fields. */
  const getThought = (id: ThoughtId): Thought | undefined => {
    const thought = thoughtIndex[id]
    if (!thought) return
    if (!thoughts.has(id)) {
      const { rank: _rank, childrenMap: _childrenMap, ...canonical } = thought
      thoughts.set(id, canonical)
    }
    return thoughts.get(id)
  }

  return {
    ...state,
    thoughts: {
      revision: 0,
      getThought,
      /** Preserves historical rank ties and incoming siblings when reading keyed diagnostic patches. */
      getChildren: id => {
        if (!children.has(id)) {
          children.set(
            id,
            Object.freeze(
              Object.values(thoughtIndex[id]?.childrenMap ?? {})
                .filter(child => !!thoughtIndex[child])
                .sort((a, b) => thoughtIndex[a].rank - thoughtIndex[b].rank),
            ),
          )
        }
        return children.get(id)!
      },
      /** Reads patched ranks, including gaps and ties that a freshly indexed array would lose. */
      getPosition: id => thoughtIndex[id]?.rank,
      /** Iterates the reconstructed diagnostic payloads. */
      values: function* () {
        for (const id of Object.keys(thoughtIndex)) yield getThought(id as ThoughtId)!
      },
      lexemeIndex,
    },
  }
}

const thoughtspaceHistory = { capture, restore }

export default thoughtspaceHistory
