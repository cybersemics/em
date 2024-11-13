import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import State from '../../@types/State'

/** Pass the selector to useSelector and retain its previous value for comparison. */
function useSelectorWithPreviousValue<T>(selector: (state: State) => T) {
  const value = useSelector<T>(selector)
  const ref = useRef(value)
  const previousValue = ref.current

  useEffect(() => {
    ref.current = value
  }, [value])

  return {
    value,
    previousValue,
  }
}

export default useSelectorWithPreviousValue
