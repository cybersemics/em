import Thunk from '../@types/Thunk'

/** Update the initial thoughts with the clientId once it is ready. */
const initThoughts =
  (clientId: string): Thunk =>
  (dispatch, getState) => {
    dispatch({
      type: 'initThoughts',
      clientId,
    })
  }

export default initThoughts
