import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { isTouch } from '../browser'
import hashPath from '../util/hashPath'
import reducerFlow from '../util/reducerFlow'
import setCursor from './setCursor'

/** Adds a cursor to the multicursor set. */
const addMulticursor = (state: State, { path }: { path: Path }): State => {
  const isEmpty = !Object.keys(state.multicursors).length

  if (isEmpty) {
    return reducerFlow([
      // for touch, unset the cursor before adding multicursor
      isTouch ? setCursor({ path: null }) : null,
      state => ({
        ...state,
        cursorBeforeMulticursor: state.cursor,
        multicursors: {
          [hashPath(path)]: path,
          // on desktop, add the cursor to the multicursor set
          ...(state.cursor && !isTouch ? { [hashPath(state.cursor)]: state.cursor } : {}),
        },
      }),
    ])(state)
  }

  return {
    ...state,
    multicursors: {
      ...state.multicursors,
      [hashPath(path)]: path,
    },
  }
}

/** Action-creator for addMulticursor. */
export const addMulticursorActionCreator =
  (payload: Parameters<typeof addMulticursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'addMulticursor', ...payload })

export default addMulticursor
