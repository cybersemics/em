import render from './render'

/** Merges loaded state. */
export default (state, { newState }) =>
  render({
    ...state,
    isLoading: false,
    cursor: newState.cursor,
    cursorBeforeEdit: newState.cursorBeforeEdit,
    schemaVersion: newState.schemaVersion,
    thoughts: {
      contextIndex: {
        ...state.thoughts.contextIndex,
        ...newState.thoughts.contextIndex,
      },
      thoughtIndex: {
        ...state.thoughts.thoughtIndex,
        ...newState.thoughts.thoughtIndex,
      },
    },
    contextViews: {
      ...state.contextViews,
      ...newState.contextViews
    },
    expanded: {
      ...state.expanded,
      ...newState.expanded
    },
    recentlyEdited: {
      ...state.recentlyEdited,
      ...newState.recentlyEdited
    },
  })
