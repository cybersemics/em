import { store } from '../store.js'

export default {
  id: 'toggleCodeView',
  name: 'Toggle Code View',
  description: 'Open a code view that allows input of queries from which a context\'s children will be generated dynamically. Use the same shortcut to close the code view.',
  keyboard: { key: 'k', shift: true, meta: true },
  exec: () => {
    const state = store.getState()
    if (state.cursor) {
      store.dispatch({ type: 'toggleCodeView' })
    }
  }
}
