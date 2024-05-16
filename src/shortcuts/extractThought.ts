import Shortcut from '../@types/Shortcut'
import { extractThoughtActionCreator as extract } from '../actions/extractThought'

const extractThought: Shortcut = {
  id: 'extractThought',
  label: 'Extract',
  description: 'Extract selected part of a thought as its child',
  keyboard: { key: 'e', control: true, meta: true },
  canExecute: getState => !!getState().cursor,
  exec: (dispatch, getState) => {
    dispatch(extract())
  },
}

export default extractThought
