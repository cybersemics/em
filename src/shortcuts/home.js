// util
import {
  home,
} from '../util.js'

import { homeSVG } from '../svgs'

export default {
  id: 'home',
  name: 'Home',
  description: 'Navigate to Home.',
  keyboard: { key: 'h', shift: true, meta: true },
  svg: homeSVG,
  exec: () => home
}
