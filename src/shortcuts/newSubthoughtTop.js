// util
import {
  newThought,
} from '../util.js'

import { newSubThoughtTopSVG } from '../svgs'

export default {
  id: 'newSubthoughtTop',
  name: 'New Subthought (top)',
  description: 'Create a new subthought in the current thought. Add it to the top of any existing subthoughts.',
  gesture: 'rdu',
  // do not define keyboard, since the actual behavior is handled by newThought
  keyboardLabel: { key: 'Enter', shift: true, meta: true },
  svg: newSubThoughtTopSVG,
  exec: () => {
    newThought({ insertNewSubthought: true, insertBefore: true })
  }
}
