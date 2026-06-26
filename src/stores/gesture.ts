import Command from '../@types/Command'
import cancelShortcut from '../commands/cancel'
import openHelpCommand from '../commands/help'
import reactMinistore from './react-ministore'

/** Animation states for the gesture menu. */
type GestureMenuAnimationState = 'hidden' | 'entering' | 'visible' | 'exiting'

// a ministore that tracks the current gesture sequence and possible commands
const gestureStore = reactMinistore({
  /** The current gesture in progress. */
  gesture: '',
  /** Animation lifecycle state for the gesture menu. */
  gestureMenuAnimationState: 'hidden' as GestureMenuAnimationState,
  /** The possible commands that can be executed from the current gesture as a starting sequence. Always includes cancel and help. */
  possibleCommands: [cancelShortcut, openHelpCommand] as Command[],
  /**
   * Height of the content blur behind the gesture menu, as a rem string (e.g. '0rem').
   * Stored as a rem string because GestureMenu derives it arithmetically from the command
   * count using rem constants; AppComponent consumes it directly as a CSS height.
   */
  gestureMenuBlurHeight: '0rem',
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

/** Sets the content-blur height (rem string) behind the gesture menu. No-op if unchanged. */
export const setGestureMenuBlurHeight = (height: string) => {
  if (gestureStore.getState().gestureMenuBlurHeight === height) return
  gestureStore.update({ gestureMenuBlurHeight: height })
}

/** Updates the gesture during tracking. */
export const updateGesture = (gesture: string) => {
  gestureStore.update({ gesture })
}

/** Clears the gesture only if the menu is not animating. If the menu is visible or animating, the gesture is preserved until the exit animation completes. */
export const clearGesture = () => {
  if (gestureStore.getState().gestureMenuAnimationState === 'hidden') {
    gestureStore.update({ gesture: '' })
  }
}

export default gestureStore
