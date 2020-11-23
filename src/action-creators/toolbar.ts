import { ActionCreator } from '../types'

/** Reveals the toolbar overlay. */
export const overlayReveal = (id: string): ActionCreator => (dispatch, getState) => {
  if (getState().toolbarOverlay !== id) {
    dispatch({ type: 'setToolbarOverlay', id })
  }
}

/** Enables or disables scrolling for the toolbar overlay. */
export const scrollPrioritize = (val: boolean): ActionCreator => (dispatch, getState) => {
  if (getState().scrollPrioritized !== val) {
    dispatch({ type: 'prioritizeScroll', val })
  }
}

/** Hides the toolbar overlay. */
export const overlayHide = (): ActionCreator => (dispatch, getState) => {
  if (getState().toolbarOverlay) {
    dispatch({ type: 'setToolbarOverlay', id: null })
  }
}
