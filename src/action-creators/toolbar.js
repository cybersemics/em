/** Reveals the toolbar overlay. */
export const overlayReveal = id => (dispatch, getState) => {
  if (getState().toolbarOverlay !== id) {
    dispatch({ type: 'setToolbarOverlay', id })
  }
}

/** Enables or disables scrolling for the toolbar overlay. */
export const scrollPrioritize = val => (dispatch, getState) => {
  if (getState().scrollPrioritized !== val) {
    dispatch({ type: 'prioritizeScroll', val })
  }
}

/** Hides the toolbar overlay. */
export const overlayHide = () => (dispatch, getState) => {
  if (getState().toolbarOverlay) {
    dispatch({ type: 'setToolbarOverlay', id: null })
  }
}
