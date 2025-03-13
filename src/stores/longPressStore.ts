import reactMinistore from './react-ministore'

// this store is used in useLongPress hook, which is used in dragAndDropThought component
// it is used to prevent multiple components from responding to long press simultaneously.
const ministore = reactMinistore({
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
