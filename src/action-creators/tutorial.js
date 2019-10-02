import { store } from '../store.js'

export const tutorialNext = (tutorialStep) => {
  store.dispatch({ type: 'tutorialStep', value: Math.floor(tutorialStep) + 1 })
}

export const tutorialPrev = (tutorialStep) => {
  store.dispatch({ type: 'tutorialStep', value: Math.floor(tutorialStep) - 1 })
}