import { store } from '../store.js'

// constants
import {
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SCALE_INCREMENT
} from '../constants.js'

export const scaleFontUp = error => {
  const scaleSize = store.getState().settings.scaleSize
  if (scaleSize < MAX_FONT_SIZE) {
    store.dispatch({
      type: 'settings',
      key: 'scaleSize',
      value: Math.round((scaleSize + FONT_SCALE_INCREMENT) * 10) / 10
    })
  }
}

export const scaleFontDown = error => {
  const scaleSize = store.getState().settings.scaleSize
  if (scaleSize > (MIN_FONT_SIZE + FONT_SCALE_INCREMENT)) {
    store.dispatch({
      type: 'settings',
      key: 'scaleSize',
      value: Math.round((scaleSize - FONT_SCALE_INCREMENT) * 10) / 10
    })
  }
}
