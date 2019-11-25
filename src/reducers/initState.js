export const initState = (state, { newState }) => {
    return {
        cursor: newState.cursor,
        data: newState.data,
        cursorBeforeEdit: newState.cursorBeforeEdit,
        helpers: newState.helpers,
        settings: newState.settings,
        contextBindings: newState.contextBindings,
        contextChildren: newState.contextChildren,
        contextViews: newState.contextViews,
        expanded: newState.expanded,
        showHelper: newState.showHelper,
    }
}
