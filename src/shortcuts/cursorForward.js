// util
import {
  cursorForward,
} from '../util.js'
import { cursorForwardSVG } from '../svgs'

export default {
  id: 'cursorForward',
  name: 'Forward',
  gesture: 'l',
  svg: cursorForwardSVG,
  // must wrap in anonymous function since exit is defined at run time
  exec: () => cursorForward()
}
