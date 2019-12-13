import { store } from '../store.js'

// util
import {
  deleteItem,
} from '../util.js'

const exec = e => {
  const { cursor } = store.getState()
  if (cursor) {
    deleteItem()
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
