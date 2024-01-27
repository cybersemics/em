import { AnyAction } from 'redux'
import { ReducerThunk } from '../redux-middleware/reducerThunk'
import Thunk from './Thunk'

type Action = AnyAction | Thunk | ReducerThunk | null

// allow explicit import
interface Dispatch {
  <T = void>(thunks: Thunk<T>[]): T[]
  <T = void>(thunk: Thunk<T>): T
  (actions: Action[]): void
  (action: Action): void
}

export default Dispatch
