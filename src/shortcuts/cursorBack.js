// util
import {
  exit,
} from '../util.js'

export default {
  id: 'cursorBack',
  name: 'Back',
  gesture: 'r',
  keyboard: 'Escape',
  // must wrap in anonymous function since exit is defined at run time
  exec: () => exit()
}
