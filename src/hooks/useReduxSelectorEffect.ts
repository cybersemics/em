import store from '../stores/app'
import makeSelectorEffect from './makeSelectorEffect'

/** A useEffect hook that invokes a callback when a slice of the Redux store's state changes. Unlike useSelector, triggers the callback without re-rendering the component. Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render. */
const useReduxSelectorEffect = makeSelectorEffect(store)

export default useReduxSelectorEffect
