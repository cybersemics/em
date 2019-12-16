// util
import {
  newThought,
} from '../util.js'

export default {
  id: 'newSubthought',
  name: 'New Subhought',
  description: 'Create a new subthought in the current thought. Add it to the bottom of any existing subthoughts.',
  gesture: 'rdr',
  // do not define keyboard, since the actual behavior is handled by newThought
  keyboardLabel: { value: 'Enter', meta: true },
  exec: () => newThought({ insertNewChild: true })
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newSubthoughtAliases = {
  id: 'newSubthoughtAliases',
  hideFromInstructions: true,
  gesture: [
    'rdlr', 'rdldr', 'rdldlr', 'rdldldr', 'rldr', 'rldlr', 'rldldr', 'rldldlr', 'rdru', 'rdrdru', 'rdrdrru', 'rdrdrdru', 'rlru', 'rdrlru', 'rdrdlru', 'rdrdrlru', 'rdllru', 'rdrd', 'rdrdrd', 'rdrdrrd', 'rdrdrdrd', 'rdlrd', 'rdldrd', 'rdldlrd', 'rdlru', 'rdldru', 'rdldlru', 'rdldldru', 'rldru', 'rldlru', 'rldldru', 'rldldlru'
  ],
  exec: () => newThought({ insertNewChild: true })
}
