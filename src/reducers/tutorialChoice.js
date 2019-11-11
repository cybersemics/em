// reducers
import { settings } from './settings.js'

export const tutorialChoice = (state, { value }) =>
  settings(state, {
    key: 'tutorialChoice',
    value
  })
