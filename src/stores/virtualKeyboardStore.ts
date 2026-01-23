import VirtualKeyboardState from '../@types/VirtualKeyboardState'
import reactMinistore from './react-ministore'

/** Underlying store for virtual keyboard state. */
const store = reactMinistore<VirtualKeyboardState>({
  open: false,
  height: 0,
})

/** A store that tracks the state of the virtual keyboard. Its value is updated by platform-specific Handlers. */
const virtualKeyboardStore = {
  ...store,
  update: (updates: Partial<VirtualKeyboardState>) => {
    store.update(updates)
  },
}

export default virtualKeyboardStore
