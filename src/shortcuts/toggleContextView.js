import { store } from '../store.js'

import { toggleContextViewSVG } from '../svgs'

export default {
  id: 'toggleContextView',
  name: 'Toggle Context View',
  description: 'Open the context view of the current thought in order to see all of the different contexts in which that thought can be found. Use the same shortcut to close the context view.',
  gesture: 'ru',
  keyboard: { key: 's', shift: true, meta: true },
  svg: toggleContextViewSVG,
  exec: () => store.dispatch({ type: 'toggleContextView' })
}
