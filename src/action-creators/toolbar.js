export const overlayReveal = id => (dispatch, getState) => {
  if (getState().toolbarOverlay !== id) {
    dispatch({ type: 'setToolbarOverlay', id })
  }
}

export const scrollPrioritize = val => (dispatch, getState) => {
  if (getState().scrollPrioritized !== val) {
    dispatch({ type: 'prioritizeScroll', val })
  }
}

export const overlayHide = () => (dispatch, getState) => {
  if (getState().toolbarOverlay) {
    dispatch({ type: 'setToolbarOverlay', id: null })
  }
}
