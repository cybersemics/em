import { AnyAction } from 'redux'
import { Thunk } from './Thunk'

// allow explicit import
export interface Dispatch {
  <T = void>(thunks: Thunk<T>[]): T[]
  <T = void>(thunk: Thunk<T>): T
  (actions: (AnyAction | Thunk)[]): void
  (action: AnyAction | Thunk): void
}
