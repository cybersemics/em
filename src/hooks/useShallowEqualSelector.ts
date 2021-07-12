import { shallowEqual, useSelector } from 'react-redux'
import { State } from '../util/initialState'

/** This should be only used for objects or arrays.  */
export const useShallowEqualSelector = <T>(selector: (state: State) => T) => {
  return useSelector<State, T>(selector, shallowEqual)
}
