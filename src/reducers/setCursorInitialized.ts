import { Path, State } from '../@types'

/**
 * Set cursor initialized status and the cursor path after initial pull.
 */
const setCursorInitialized = (
  state: State,
  { cursor, cursorInitialized }: { cursor?: Path | null; cursorInitialized: boolean },
) => {
  return {
    ...state,
    cursor,
    cursorInitialized,
  }
}

export default setCursorInitialized
