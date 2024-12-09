import { UnknownAction } from 'redux'
import Thunk from './Thunk'

// allow explicit import
interface Dispatch {
  <T = void>(thunks: Thunk<T>[]): T[]
  <T = void>(thunk: Thunk<T>): T
  (actions: (UnknownAction | Thunk | null)[]): void
  (action: UnknownAction | Thunk | null): void
}

export default Dispatch
