import Command from '../@types/Command'
import GesturePath from '../@types/GesturePath'
import cancelShortcut from '../commands/cancel'
import openHelpCommand from '../commands/help'
import reactMinistore from './react-ministore'

/** Animation states for the gesture menu. */
type GestureMenuAnimationState = 'hidden' | 'entering' | 'visible' | 'exiting'

// a ministore that tracks the current gesture sequence and possible commands
const gestureStore = reactMinistore({
  /** The current gesture in progress. */
  gesture: '' as GesturePath,
  /** Animation lifecycle state for the gesture menu. */
  gestureMenuAnimationState: 'hidden' as GestureMenuAnimationState,
  /** The possible commands that can be executed from the current gesture as a starting sequence. Always includes cancel and help. */
  possibleCommands: [cancelShortcut, openHelpCommand] as Command[],
})

/** Called when Redux showGestureMenu becomes true. Starts the enter animation. */
export const startGestureMenuEnter = () => {
  gestureStore.update({ gestureMenuAnimationState: 'entering' })
}

/** Called when Redux showGestureMenu becomes false. Starts the exit animation while preserving the gesture. */
export const startGestureMenuExit = () => {
  gestureStore.update({ gestureMenuAnimationState: 'exiting' })
}

/** Called when the enter animation completes. */
export const onGestureMenuEntered = () => {
  gestureStore.update({ gestureMenuAnimationState: 'visible' })
}

/** Called when the exit animation completes. Clears the gesture and resets animation state. */
export const onGestureMenuExited = () => {
  gestureStore.update({
    gestureMenuAnimationState: 'hidden',
    gesture: '',
  })
}

/** Updates the gesture during tracking. */
export const updateGesture = (gesture: GesturePath) => {
  gestureStore.update({ gesture })
}

/** Clears the gesture only if the menu is not animating. If the menu is visible or animating, the gesture is preserved until the exit animation completes. */
export const clearGesture = () => {
  if (gestureStore.getState().gestureMenuAnimationState === 'hidden') {
    gestureStore.update({ gesture: '' })
  }
}

export default gestureStore
