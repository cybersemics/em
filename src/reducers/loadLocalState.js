export const loadLocalState = (state, { newState }) => ({
  isLoading: false,
  cursor: newState.cursor,
  cursorBeforeEdit: newState.cursorBeforeEdit,
  data: {
    ...state.data,
    ...newState.data
  },
  settings: {
    ...state.settings,
    ...newState.settings
  },
  contextBindings: {
    ...state.contextBindings,
    ...newState.contextBindings
  },
  contextChildren: {
    ...state.contextChildren,
    ...newState.contextChildren,
  },
  contextViews: {
    ...state.contextViews,
    ...newState.contextViews
  },
  expanded: {
    ...state.expanded,
    ...newState.expanded
  }
})
