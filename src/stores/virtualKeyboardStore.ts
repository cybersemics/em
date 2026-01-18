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
  /** Updates the store with validation to prevent flickering or disappearing values. */
  update: (updates: Partial<VirtualKeyboardState>) => {
    const validatedUpdates: Partial<VirtualKeyboardState> = { ...updates }
    // Prevent NaN or null heights from being stored
    if (updates.height !== undefined && (updates.height === null || isNaN(updates.height))) {
      console.warn('[VirtualKeyboardStore] Invalid height attempted:', updates.height)
      delete validatedUpdates.height
    }
    store.update(validatedUpdates)
  },
}

export default virtualKeyboardStore
