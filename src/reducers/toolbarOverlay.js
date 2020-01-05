export const showOverlay = (state, { id, name, description }) => ({
    toolbarOverlay: {
        showOverlay: true,
        shortcutId: id,
        shortcutName: name,
        shortcutDescription: description
    }
})
export const updateOverlay = (state, { id, name, description }) => {
    const { toolbarOverlay: { showOverlay } } = state
    return ({
        toolbarOverlay: {
            showOverlay,
            shortcutId: id,
            shortcutName: name,
            shortcutDescription: description
        }
    })
}
export const hideOverlay = () => ({
    toolbarOverlay: {
        showOverlay: false,
        shortcutId: null,
        shortcutName: null,
        shortcutDescription: null
    }
})
