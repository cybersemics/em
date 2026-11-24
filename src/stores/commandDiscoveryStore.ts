import reactMinistore from './react-ministore'

/**
 * Where the undiscovered command sits in the Gesture Menu, in viewport px: the left edge, vertical center, and width of
 * its title, and the center of its gesture. Command Discovery starts the command's fog and gesture there, where the user
 * is already looking, before they descend together to where the command's name will be.
 * The menu's ghost row writes it as it lays out; null while the menu shows no undiscovered command. A ministore
 * because it is layout, not app state.
 */
const commandDiscoveryStore = reactMinistore<{
  origin: { x: number; y: number; width: number; gesture: { x: number; y: number } | null } | null
}>({
  origin: null,
})

export default commandDiscoveryStore
