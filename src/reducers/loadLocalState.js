export const loadLocalState = (state, { newState }) => {
    return {
        isLoading: false,
        cursor: newState.cursor,
        data: newState.data,
        cursorBeforeEdit: newState.cursorBeforeEdit,
        settings: Object.assign({}, state.settings, newState.settings),
        contextBindings: newState.contextBindings,
        contextChildren: newState.contextChildren,
        contextViews: newState.contextViews,
        expanded: newState.expanded,
    }
}
