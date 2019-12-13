import { store } from '../store.js'

export default {
  id: 'bindContext',
  name: 'Bind Context',
  description: 'Bind two different contexts of a thought so that they always have the same children.',
  gesture: 'rud',
  keyboard: { key: 'b', shift: true, meta: true },
  exec: () => {
    store.dispatch({ type: 'toggleBindContext' })
  }
}
