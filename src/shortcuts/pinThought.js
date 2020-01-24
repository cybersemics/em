import { store } from '../store.js'

// components
import { pinIcon } from '../components/pinIcon'
import { updatePinnedThought } from '../util'

export default {
  id: 'pinThought',
  name: 'Pin Focussed Thought',
  description: 'Pinned thoughts remains expanded.',
  keyboard: { key: 'q', shift: true, meta: true },
  svg: pinIcon,
  exec: () => {
    const state = store.getState()
    if (state.cursor) {
      updatePinnedThought(state.cursor, null, { ...state.pinnedThought })
    }
  }
}
