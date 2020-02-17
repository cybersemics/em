import { store } from '../store.js'

import {
  getSetting,
} from '../util.js'

// constants
import {
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SCALE_INCREMENT
} from '../constants.js'

export const scaleFontUp = () => {
  const fontSize = +getSetting('Font Size')[0]
  if (fontSize < MAX_FONT_SIZE) {
    store.dispatch({
      type: 'settings',
      key: 'Font Size',
      value: Math.round((fontSize + FONT_SCALE_INCREMENT) * 10) / 10
    })
  }
}

export const scaleFontDown = () => {
  const fontSize = +getSetting('Font Size')[0]
  if (fontSize > (MIN_FONT_SIZE + FONT_SCALE_INCREMENT)) {
    store.dispatch({
      type: 'settings',
      key: 'Font Size',
      value: Math.round((fontSize - FONT_SCALE_INCREMENT) * 10) / 10
    })
  }
}
