import collapseContext from '../reducers/collapseContext'
import Thunk from '../@types/Thunk'

/** Action-creator for collapseContext. */
const collapseContextActionCreator =
  (payload: Parameters<typeof collapseContext>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'collapseContext', ...payload })

export default collapseContextActionCreator
