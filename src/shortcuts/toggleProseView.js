import { store } from '../store.js'

export default {
  id: 'toggleProseView',
  name: 'Toggle Prose View',
  description: 'Display the current context as indented paragraphs.',
  keyboard: { key: 'p', shift: true, meta: true },
  exec: () => {
    const state = store.getState()
    if (state.cursor) {
      store.dispatch({ type: 'toggleProseView' })
    }
  }
}
