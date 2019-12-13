import { store } from '../store.js'

export default {
  id: 'toggleContextView',
  name: 'Toggle Context View',
  description: 'Open the context view of the current thought in order to see all of the different contexts in which that thought can be found. Use the same shortcut to close the context view.',
  gesture: 'ru',
  keyboard: { key: 's', shift: true, meta: true },
  exec: () => store.dispatch({ type: 'toggleContextView' })
}
