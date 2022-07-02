import Thunk from '../@types/Thunk'
import bumpThoughtDown from '../reducers/bumpThoughtDown'

/** Action-creator for bumpThoughtDown. */
const bumpThoughtDownActionCreator =
  (payload?: Parameters<typeof bumpThoughtDown>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'bumpThoughtDown', ...payload })

export default bumpThoughtDownActionCreator
