import { AnyAction } from 'redux'
import Thunk from './Thunk'

// allow explicit import
interface Dispatch {
  <T = void>(thunks: Thunk<T>[]): T[]
  <T = void>(thunk: Thunk<T>): T
  (actions: (AnyAction | Thunk | null)[]): void
  (action: AnyAction | Thunk | null): void
}

export default Dispatch
