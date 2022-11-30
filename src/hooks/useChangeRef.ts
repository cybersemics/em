import { useRef } from 'react'

const UNSET = Symbol('UNSET')

/** Returns true if a value changes from the last render in a component. */
const useChangeRef = <T>(value: T) => {
  // initialize with a symbol to allow change detection of undefined and null
  const ref = useRef<T | typeof UNSET>(UNSET)
  const changed = ref.current !== UNSET && ref.current !== value
  ref.current = value
  return changed
}

export default useChangeRef
