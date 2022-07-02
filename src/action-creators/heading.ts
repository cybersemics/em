import Thunk from '../@types/Thunk'
import heading from '../reducers/heading'

/** Action-creator for heading. */
const headingActionCreator =
  (payload: Parameters<typeof heading>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'heading', ...payload })

export default headingActionCreator
