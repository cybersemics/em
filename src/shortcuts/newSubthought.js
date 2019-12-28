// util
import {
  newThought,
} from '../util.js'

import { newSubThoughtSVG } from '../svgs'

export default {
  id: 'newSubthought',
  name: 'New Subhought',
  description: 'Create a new subthought in the current thought. Add it to the bottom of any existing subthoughts.',
  gesture: 'rdr',
  // do not define keyboard, since the actual behavior is handled by newThought
  keyboardLabel: { key: 'Enter', meta: true },
  svg: newSubThoughtSVG,
  exec: () => newThought({ insertNewSubthought: true })
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newSubthoughtAliases = {
  id: 'newSubthoughtAliases',
  hideFromInstructions: true,
  gesture: [
    'rdlr', 'rdldr', 'rdldlr', 'rdldldr', 'rldr', 'rldlr', 'rldldr', 'rldldlr', 'rdru', 'rdrdru', 'rdrdrru', 'rdrdrdru', 'rlru', 'rdrlru', 'rdrdlru', 'rdrdrlru', 'rdllru', 'rdrd', 'rdrdrd', 'rdrdrrd', 'rdrdrdrd', 'rdlrd', 'rdldrd', 'rdldlrd', 'rdlru', 'rdldru', 'rdldlru', 'rdldldru', 'rldru', 'rldlru', 'rldldru', 'rldldlru'
  ],
  exec: () => newThought({ insertNewSubthought: true })
}
