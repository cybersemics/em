import { useLayoutEffect } from 'react'

/** A hook that sets an attribute on the document.body element. */
const useBodyAttribute = (name: string, value: string) => {
  useLayoutEffect(() => {
    document.body.setAttribute(name, value)
  }, [name, value])
}

export default useBodyAttribute
