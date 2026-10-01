// Override react-redux types to use our UI-only state.
// See: paths comment in tsconfig.json
import {
  TypedUseSelectorHook,
  useDispatch as useDefaultDispatch,
  useSelector as useDefaultSelector,
  useStore as useDefaultStore,
} from 'react-redux-default'
import Dispatch from './Dispatch'
import Store from './Store'
import UiState from './UiState'

export * from 'react-redux-default'

export const useDispatch: () => Dispatch = useDefaultDispatch
export const useSelector: TypedUseSelectorHook<UiState> = useDefaultSelector
export const useStore: () => Store<UiState> = useDefaultStore
