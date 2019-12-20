import { store } from '../store.js'

// util
/** Returns true if the tutorial is active. */
export const isTutorial = () => store.getState().settings.tutorial
