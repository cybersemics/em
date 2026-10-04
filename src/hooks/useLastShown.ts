import { useState } from 'react'

/** Returns the value from the last render in which show was true, so that a picker fading out after it closes keeps showing what it showed while open, even when the value is only computed while it is open. */
const useLastShown = <T>(value: T, show: boolean): T => {
  const [lastShown, setLastShown] = useState(value)
  if (show && value !== lastShown) {
    setLastShown(value)
  }
  return show ? value : lastShown
}

export default useLastShown
