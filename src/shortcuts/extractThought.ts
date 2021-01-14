import { Shortcut } from '../types'
import { extractThought as extract } from '../action-creators'

const extractThought: Shortcut = {
  id: 'extract',
  name: 'Extract',
  description: 'Extract selected part of a thought as its child',
  keyboard: { key: 'e', control: true, meta: true },
  exec: (dispatch, getState) => {
    dispatch(extract())
  }
}

export default extractThought
