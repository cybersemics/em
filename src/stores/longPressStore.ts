import reactMinistore from './react-ministore'

// Create a ministore with just the lock state
const ministore = reactMinistore<{ isLocked: boolean }>({
  isLocked: false,
})

// Define the extended store type
type LongPressStore = typeof ministore & {
  lock: () => void
  unlock: () => void
}

// Create and export the enhanced store with its methods
const longPressStore = ministore as LongPressStore

// Add the methods
longPressStore.lock = () => ministore.update({ isLocked: true })
longPressStore.unlock = () => ministore.update({ isLocked: false })

export default longPressStore
