import { ALERT } from './types'

export const alertAction = () => dispatch => {
  return dispatch({
    type: ALERT,
    payload: null
  })
}
