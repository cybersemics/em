import { Thunk } from '../types'

/** Sets fontSize in state and localStorage.. */
const fontSize = (value: number): Thunk => (dispatch, getState) => {
  dispatch({ type: 'fontSize', value })
  setTimeout(() => {
    localStorage.fontSize = value
  })
}

export default fontSize
