// util
import {
  exit,
} from '../util.js'
import { cursorBackSVG } from '../svgs'

export default {
  id: 'cursorBack',
  name: 'Back',
  gesture: 'r',
  svg: cursorBackSVG,
  keyboard: 'Escape',
  // must wrap in anonymous function since exit is defined at run time
  exec: () => exit()
}
