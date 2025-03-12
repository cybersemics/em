import reactMinistore from './react-ministore'

type LongPressState = {
  isLocked: boolean
  isLongPressing: boolean
}

// Create a ministore with initial state
const longPressStore = reactMinistore<LongPressState>({
  isLocked: false,
  isLongPressing: false,
})

// Action helpers for the store
const actions = {
  lock: () => {
    longPressStore.update({ isLocked: true })
  },

  unlock: () => {
    longPressStore.update({ isLocked: false })
  },

  setLongPressing: (value: boolean) => {
    longPressStore.update({ isLongPressing: value })
  },

  notifyDragStarted: () => {
    // When a drag starts, we need to reset the lock and mark that we're no longer long pressing
    longPressStore.update({ isLocked: false, isLongPressing: false })
  },

  reset: () => {
    longPressStore.update({ isLocked: false, isLongPressing: false })
  },
}

// Attach actions to the store for easy access
const enhancedStore = {
  ...longPressStore,
  actions,
}

export default enhancedStore
