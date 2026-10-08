import Index from '../@types/IndexType'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtReaderState from '../@types/ThoughtReaderState'

/** Serializable editor diagnostics, never a second live document or an input to engine undo. */
type DiagnosticState = Omit<State, 'thoughts'> & {
  thoughts: {
    thoughtIndex: Index<Thought>
    childPositions: Index<Index<number>>
  }
}

/** Captures selected diagnostic records, or the whole document for reports and reset fallbacks. */
const capture = (
  state: State,
  scope?: {
    thoughtIds: ReadonlySet<ThoughtId>
    parentIds: ReadonlySet<ThoughtId>
  },
): DiagnosticState => {
  const thoughtIndex = Object.fromEntries(
    (scope
      ? Array.from(scope.thoughtIds).flatMap(id => {
          const thought = state.thoughts.getThought(id)
          return thought ? [thought] : []
        })
      : Array.from(state.thoughts.values())
    ).map(thought => [thought.id, thought]),
  )
  return {
    ...state,
    thoughts: {
      thoughtIndex,
      childPositions: Object.fromEntries(
        (scope ? [...scope.parentIds] : (Object.keys(thoughtIndex) as ThoughtId[]))
          .filter(id => !!state.thoughts.getThought(id))
          .map(id => [
            id,
            Object.fromEntries(
              state.thoughts.getChildren(id).map(child => [child, state.thoughts.getPosition(child) ?? 0]),
            ),
          ]),
      ),
    },
  }
}

/** Adapts patched diagnostics for read-only selectors without replaying them into the canonical engine. */
const restore = (state: DiagnosticState): ThoughtReaderState => {
  const { thoughtIndex, childPositions } = state.thoughts
  const children = new Map<ThoughtId, readonly ThoughtId[]>()

  return {
    ...state,
    thoughts: {
      getThought: id => thoughtIndex[id],
      /** Preserves position ties and incoming siblings when reading keyed diagnostic patches. */
      getChildren: id => {
        if (!children.has(id)) {
          children.set(
            id,
            Object.freeze(
              (Object.keys(childPositions[id] ?? {}) as ThoughtId[])
                // An old position patch must not reattach a child that incoming changes reparented.
                .filter(child => thoughtIndex[child]?.parentId === id)
                .sort((a, b) => childPositions[id][a] - childPositions[id][b]),
            ),
          )
        }
        return children.get(id)!
      },
      /** Reads patched positions, including gaps and ties that a freshly indexed array would lose. */
      getPosition: id => childPositions[thoughtIndex[id]?.parentId]?.[id],
    },
  }
}

const thoughtspaceHistory = { capture, restore }

export default thoughtspaceHistory
