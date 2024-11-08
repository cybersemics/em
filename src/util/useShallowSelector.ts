import { shallowEqual, useSelector } from 'react-redux'
import State from '../@types/State'

/** React-redux useSelector with shallowEqual comparison. */
const useShallowSelector = <T>(selector: (state: State) => T) => useSelector(selector, shallowEqual)

export default useShallowSelector
