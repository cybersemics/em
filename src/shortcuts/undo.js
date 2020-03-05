import { UndoIcon } from '../components/undoIcon'
import { store } from '../store'
import { UNDO } from '../reducers/time'

export default {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  exec: () => {
    store.dispatch({ type: UNDO })
  }
}
