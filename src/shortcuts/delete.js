import { store } from '../store.js'

// util
import {
  deleteThought,
} from '../util.js'
import { deleteSVG } from '../svgs'
const exec = e => {
  const { cursor } = store.getState()
  if (cursor) {
    deleteThought()
  }
  else {
    e.allowDefault()
  }
}

export default {
  id: 'delete',
  name: 'Delete',
  description: 'Delete the current thought.',
  gesture: 'ldl',
  svg: deleteSVG,
  keyboard: { key: 'Backspace', shift: true, meta: true },
  exec
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const deleteAliases = {
  id: 'deleteAliases',
  hideFromInstructions: true,
  gesture: [
    'ldlr', 'ldldr', 'ldldlr', 'ldldldr', 'lrdl', 'lrdrl', 'lrdldr', 'lrdldlr', 'ldru', 'ldrlru', 'ldldlru', 'ldldrlru', 'ldllru', 'ldldrld', 'ldldldld', 'ldld', 'ldldld', 'ldlru', 'ldldru', 'ldldldru', 'lrdru', 'lrdlru', 'lrdldru', 'lrdldlru'
  ],
  exec
}
