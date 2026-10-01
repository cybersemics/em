import store from '../stores/app'
import makeSelectorEffect from './makeSelectorEffect'

/** Runs a callback when a selected editor value changes, without re-rendering the component. */
export const useSelectorEffect = makeSelectorEffect(store)

export default useSelectorEffect
