// util
import {
  cursorForward,
} from '../util.js'

export default {
  id: 'cursorForward',
  name: 'Forward',
  gesture: 'l',
  // must wrap in anonymous function since exit is defined at run time
  exec: () => cursorForward()
}
