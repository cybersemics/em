import render from './render'

export default (state, { newState }) => ({
  ...render(state),
  isLoading: false,
  cursor: newState.cursor,
  cursorBeforeEdit: newState.cursorBeforeEdit,
  schemaVersion: newState.schemaVersion,
  thoughtIndex: {
    ...state.thoughtIndex,
    ...newState.thoughtIndex
  },
  contextIndex: {
    ...state.contextIndex,
    ...newState.contextIndex,
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
  }
})
