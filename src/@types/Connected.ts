import { Dispatch } from './Dispatch'

/** When a component is connected, the dispatch prop is added. */
export type Connected<T> = T & {
  dispatch: Dispatch
}
