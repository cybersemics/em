import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector'
import State from '../@types/State'
import useEditorStore from './useEditorStore'

/**
 * Caches an owned selection from current TreeCRDT and UI state. State identity marks publication, not history.
 * Select values, arrays, or thought records; do not return the live reader or State itself.
 */
const useEditorSelector = <T>(selector: (state: State) => T, equalityFn: (a: T, b: T) => boolean = Object.is): T => {
  const store = useEditorStore()
  return useSyncExternalStoreWithSelector(store.subscribe, store.getState, store.getState, selector, equalityFn)
}

export default useEditorSelector
