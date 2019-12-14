import { store } from '../store.js'

// util
import {
  contextOf,
  newThought,
} from '../util.js'

// NOTE: The keyboard shortcut for New Uncle handled in New Thought command until it is confirmed that shortcuts are evaluated in the correct order
export default {
  id: 'newUncle',
  name: 'New Thought After Parent',
  description: `Add a new thought to the context that immediately follows the current thought's context. It's like creating a new thought and then de-indenting it.`,
  gesture: 'rdl',
  exec: () => {
    const { cursor } = store.getState()
    if (cursor && cursor.length > 1) {
      newThought({
        at: contextOf(cursor)
      })
    }
  }
}
