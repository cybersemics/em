import Dispatch from './Dispatch'

/** When a component is connected, the dispatch prop is added. */
type Connected<T> = T & {
  dispatch: Dispatch
}

export default Connected
