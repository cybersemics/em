import bumpThoughtDown from '../reducers/bumpThoughtDown'
import Thunk from '../@types/Thunk'

/** Action-creator for bumpThoughtDown. */
const bumpThoughtDownActionCreator =
  (payload?: Parameters<typeof bumpThoughtDown>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'bumpThoughtDown', ...payload })

export default bumpThoughtDownActionCreator
