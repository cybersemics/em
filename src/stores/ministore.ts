import Emitter from 'emitter20'
import { useEffect, useState } from 'react'

/** Creates a mini store that tracks state and can update consumers. */
const ministore = <T = any>(initialState: T) => {
  let state: T = initialState
  const emitter = new Emitter()

  /** Updates states. Only overwrites the given keys and preserves the rest. */
  const update = (updates: Partial<T>) => {
    if (Object.entries(updates).every(([key, value]) => (state as any)[key] === value)) return
    state = { ...state, ...updates }
    emitter.trigger('change', updates)
  }

  return {
    /** Gets the state. */
    getState: () => state,

    /** Subscribe to state change. */
    subscribe: (f: (updates: Partial<T>) => void) => emitter.on('change', f),

    /** Updates one or more values in state and trigger a change. */
    update,

    /** A hook that subscribes to a slice of the state. */
    useSelector: <U>(selector: (state: T) => U) => {
      const [localState, setLocalState] = useState(state)

      useEffect(() => {
        emitter.on('change', setLocalState)
        return () => {
          emitter.clear('change')
        }
      }, [])

      return selector(localState)
    },
  }
}

export default ministore
