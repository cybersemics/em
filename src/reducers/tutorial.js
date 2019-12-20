// reducers
import { settings } from './settings.js'

export const tutorial = (state, { value }) =>
  settings(state, {
    key: 'tutorial',
    value
  })
