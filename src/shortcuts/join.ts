import { Shortcut } from '../types'
import { join } from '../action-creators'

const joinThoughts: Shortcut = {
  id: 'join',
  name: 'Join Thoughts',
  description: 'join all siblings and merge their children',
  keyboard: { key: 'i', alt: true, shift: true },
  exec: (dispatch, getState) => {
    dispatch(join())
  }
}

export default joinThoughts
