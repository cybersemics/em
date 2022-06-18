import Dispatch from './Dispatch'
import State from './State'

/** A basic Redux AnyAction creator thunk with no arguments. */
// do not use ThunkDispatch since it has the wrong return type
export type Thunk<R = void> = (dispatch: Dispatch, getState: () => State) => R

export default Thunk
