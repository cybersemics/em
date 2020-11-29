import { Thunk } from '../types'

/** Reveals the toolbar overlay. */
export const overlayReveal = (id: string): Thunk => (dispatch, getState) => {
  if (getState().toolbarOverlay !== id) {
    dispatch({ type: 'setToolbarOverlay', id })
  }
}

/** Enables or disables scrolling for the toolbar overlay. */
export const scrollPrioritize = (val: boolean): Thunk => (dispatch, getState) => {
  if (getState().scrollPrioritized !== val) {
    dispatch({ type: 'prioritizeScroll', val })
  }
}

/** Hides the toolbar overlay. */
export const overlayHide = (): Thunk => (dispatch, getState) => {
  if (getState().toolbarOverlay) {
    dispatch({ type: 'setToolbarOverlay', id: null })
  }
}
