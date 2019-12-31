export const loadLocalState = (state, { newState }) => ({
  isLoading: false,
  cursor: newState.cursor,
  cursorBeforeEdit: newState.cursorBeforeEdit,
  thoughtIndex: {
    ...state.thoughtIndex,
    ...newState.thoughtIndex
  },
  settings: {
    ...state.settings,
    ...newState.settings
  },
  contextBindings: {
    ...state.contextBindings,
    ...newState.contextBindings
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
  proseViews: {
    ...state.proseViews,
    ...newState.proseViews
  },
  recentlyEdited: [
    ...state.recentlyEdited,
    ...newState.recentlyEdited
  ]
})
