import { store } from '../store.js'

import { toggleProseViewSVG } from '../svgs'

export default {
  id: 'toggleProseView',
  name: 'Toggle Prose View',
  description: 'Display the current context as indented paragraphs.',
  gesture: 'rudr',
  keyboard: { key: 'p', shift: true, meta: true },
  svg: toggleProseViewSVG,
  exec: () => {
    const state = store.getState()
    if (state.cursor) {
      store.dispatch({ type: 'toggleProseView' })
    }
  }
}
