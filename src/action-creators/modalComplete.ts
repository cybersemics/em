import { ActionCreator } from '../types'

/** Closes a modal permanently. */
const modalComplete = (id: string): ActionCreator => dispatch => {
  localStorage.setItem('modal-complete-' + id, 'true')
  dispatch({ type: 'modalComplete', id })
}

export default modalComplete
