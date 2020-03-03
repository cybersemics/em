import { store } from '../store.js'

export const overlayReveal = id => {
  if (store.getState().present.toolbarOverlay !== id) {
    store.dispatch({ type: 'setToolbarOverlay', id })
  }
}

export const scrollPrioritize = val => {
  if (store.getState().present.scrollPrioritized !== val) {
    store.dispatch({ type: 'prioritizeScroll', val })
  }
}

export const overlayHide = () => {
  if (store.getState().present.toolbarOverlay) {
    store.dispatch({ type: 'setToolbarOverlay', id: null })
  }
}
