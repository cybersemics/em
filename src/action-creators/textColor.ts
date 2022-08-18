import Thunk from '../@types/Thunk'
import textColor from '../reducers/textColor'

/** Action-creator for textColor. */
const textColorActionCreator =
  (payload: Parameters<typeof textColor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'textColor', ...payload })

export default textColorActionCreator
