// util
import {
  newThought,
} from '../util.js'

export default {
  id: 'newThoughtAbove',
  name: 'New Thought Above',
  description: 'Create a new thought immediately above the current thought.',
  gesture: 'rul',
  // do not define keyboard, since the actual behavior is handled by newThought
  keyboardLabel: { key: 'Enter', shift: true },
  exec: () => {
    newThought({ insertBefore: true })
  }
}
