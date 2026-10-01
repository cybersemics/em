import { shallowEqual } from 'react-redux'
import State from '../@types/State'
import useEditorSelector from '../hooks/useEditorSelector'

/** Selects from the captured editor read context with shallow equality comparison. */
const useShallowSelector = <T>(selector: (state: State) => T) => useEditorSelector(selector, shallowEqual)

export default useShallowSelector
