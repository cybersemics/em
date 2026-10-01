import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector'
import State from '../@types/State'
import useEditorStore from './useEditorStore'

/** Selects from captured TreeCRDT and UI state without storing the document in Redux. */
const useEditorSelector = <T>(selector: (state: State) => T, equalityFn: (a: T, b: T) => boolean = Object.is): T => {
  const store = useEditorStore()
  return useSyncExternalStoreWithSelector(store.subscribe, store.getState, store.getState, selector, equalityFn)
}

export default useEditorSelector
