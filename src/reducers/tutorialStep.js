// reducers
import { settings } from './settings.js'

export const tutorialStep = (state, { value }) =>
  settings(state, {
    key: 'tutorialStep',
    value
  })
