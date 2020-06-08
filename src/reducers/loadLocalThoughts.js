import render from './render'

/** Merges thoughts directly into the state. */
export default (state, newState = {}) =>
  render({
    ...state,
    isLoading: false,
    cursor: newState.cursor,
    cursorBeforeEdit: newState.cursorBeforeEdit,
    contextViews: {
      ...state.contextViews,
      ...newState.contextViews
    },
    expanded: {
      ...state.expanded,
      ...newState.expanded
    },
    thoughts: {
      ...state.thoughts,
      contextIndex: {
        ...state.thoughts.contextIndex,
        ...newState.thoughts.contextIndex,
      },
      thoughtIndex: {
        ...state.thoughts.thoughtIndex,
        ...newState.thoughts.thoughtIndex,
      },
    }
  })
