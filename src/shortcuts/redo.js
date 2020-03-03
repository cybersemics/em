import { RedoIcon } from '../components/redoIcon'
import { store } from '../store'
import { REDO } from '../reducers/time'

export default {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: () => {
    store.dispatch({ type: REDO })
  }
}
