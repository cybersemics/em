import { store } from '../store.js'
import {
  TUTORIAL_STEP_NONE,
} from '../constants.js'

// util
/** Returns true if the tutorial is active. */
export const isTutorial = () =>
  store.getState().settings.tutorialStep !== TUTORIAL_STEP_NONE
