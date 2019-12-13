// util
import {
  home,
} from '../util.js'

export default {
  id: 'home',
  name: 'Home',
  description: 'Navigate to Home.',
  keyboard: { key: 'h', shift: true, meta: true },
  exec: () => home
}
