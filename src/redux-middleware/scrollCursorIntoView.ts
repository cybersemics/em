import { ThunkMiddleware } from 'redux-thunk'
import Path from '../@types/Path'
import State from '../@types/State'
import scrollCursorIntoView from '../device/scrollCursorIntoView'

// store the last cursor
let cursorLast: Path | null = null

/** Runs a throttled session keepalive on every action. */
const scrollCursorIntoViewMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    // if the cursor has changed, scroll it into view
    const cursor = getState().cursor
    if (cursor !== cursorLast) {
      // give new cursor time to render
      scrollCursorIntoView(10)
    }
    cursorLast = cursor
  }
}

export default scrollCursorIntoViewMiddleware
