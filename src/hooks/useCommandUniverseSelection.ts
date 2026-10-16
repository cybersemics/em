import { useCallback, useEffect, useState } from 'react'
import * as selection from '../device/selection'

/** Preserves the editor selection while palette search owns focus, handing it back before a command runs. */
const useCommandUniverseSelection = ({ enabled = true }: { enabled?: boolean } = {}) => {
  // Capture before inserting the palette DOM or focusing search. DOM nodes remain presentation state, outside Redux.
  const [savedSelection] = useState(() => (enabled ? selection.save() : null))
  const restoreSelection = useCallback(() => selection.restore(savedSelection), [savedSelection])

  useEffect(
    () => () => {
      // Preserve focus established by a command, including a newly opened note. This is the legacy dismissal policy.
      if (!selection.isThought()) restoreSelection()
    },
    [restoreSelection],
  )

  return restoreSelection
}

export default useCommandUniverseSelection
