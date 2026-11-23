import reactMinistore from './react-ministore'

/**
 * Where the undiscovered command sits in the Gesture Menu, in viewport px: the left edge and vertical center of its
 * title. Command Discovery starts its light there, where the user is already looking, before gliding to the center.
 * The menu's ghost row writes it as it lays out; null while the menu shows no undiscovered command. A ministore
 * because it is layout, not app state.
 */
const commandDiscoveryStore = reactMinistore<{ origin: { x: number; y: number } | null }>({ origin: null })

export default commandDiscoveryStore
