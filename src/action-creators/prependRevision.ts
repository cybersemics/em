import prependRevision from '../reducers/prependRevision'
import Thunk from '../@types/Thunk'

/** Action-creator for prependRevision. */
const prependRevisionActionCreator =
  (payload: Parameters<typeof prependRevision>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'prependRevision', ...payload })

export default prependRevisionActionCreator
