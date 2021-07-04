import _ from 'lodash'

import { State } from '../util/initialState'

/** Shows or hides a modal. */
const showModal = (state: State, { id }: { id: string }) => {
  return {
    ...state,
    showModal: id,
    showModalIcon: null,
  }
}

export default _.curryRight(showModal)
