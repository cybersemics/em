/** A minimal store type. */
interface Store<T> {
  getState: () => T
  subscribe: (cb: () => void) => () => void
}

export default Store
