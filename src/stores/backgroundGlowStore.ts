import reactMinistore from './react-ministore'
import storageModel from './storageModel'

/** A ministore for the debug background glow overlay: the selected image (or null for none) and its opacity. Initialized from and persisted to local storage. */
const backgroundGlowStore = reactMinistore(storageModel.get('backgroundGlow'))

// persist the selection so it survives a reload
backgroundGlowStore.subscribe(() => storageModel.set('backgroundGlow', backgroundGlowStore.getState()))

export default backgroundGlowStore
