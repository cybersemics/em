// util
import {
  newThought,
} from '../util.js'

export default {
  id: 'newSubthoughtTop',
  name: 'New Subthought (top)',
  description: 'Create a new subthought in the current thought. Add it to the top of any existing subthoughts.',
  gesture: 'rdu',
  // do not define keyboard, since the actual behavior is handled by newThought
  keyboardLabel: { key: 'Enter', shift: true, meta: true },
  exec: () => {
    newThought({ insertNewChild: true, insertBefore: true })
  }
}
