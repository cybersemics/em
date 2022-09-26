import { useEffect, useRef } from 'react'

/** Log changed props. Useful for debugging unnecessary renders. Does not show when hooks change. */
const useWhyDidYouUpdate = (name: string, props: any) => {
  // Get a mutable ref object where we can store props ...
  // ... for comparison next time this hook runs.
  const previousProps = useRef<any>()

  useEffect(() => {
    if (previousProps.current) {
      // Get all keys from previous and current props
      const allKeys = Object.keys({ ...previousProps.current, ...props })
      // Use this object to keep track of changed props
      const changesObj = {} as any
      // Iterate through keys
      allKeys.forEach(key => {
        // If previous is different from current
        if (previousProps.current[key] !== props[key as any]) {
          // Add to changesObj
          changesObj[key] = {
            from: previousProps.current[key],
            to: props[key],
          }
        }
      })

      // If changesObj not empty then output to console
      if (Object.keys(changesObj).length) {
        console.info('useWhyDidYouUpdate: ', name, changesObj)
      }
    }

    // Finally update previousProps with current props for next hook call
    previousProps.current = props
  })
}

export default useWhyDidYouUpdate
