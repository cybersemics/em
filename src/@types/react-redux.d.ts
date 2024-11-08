// Override react-redux types to use our custom State.
// See: paths comment in tsconfig.json
import {
  TypedUseSelectorHook,
  useDispatch as useDefaultDispatch,
  useSelector as useDefaultSelector,
} from 'react-redux-default'
import Dispatch from './Dispatch'
import State from './State'

export * from 'react-redux-default'

export const useDispatch: () => Dispatch = useDefaultDispatch
export const useSelector: TypedUseSelectorHook<State> = useDefaultSelector
