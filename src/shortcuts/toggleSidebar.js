import { store } from '../store.js'

export default {
  id: 'toggleSidebar',
  name: 'Toggle Recently Edited',
  keyboard: { alt: true, key: 'e' },
  hideFromInstructions: true,
  exec: () => store.dispatch({ type: 'toggleSidebar', value: !store.getState().showSidebar })
}
