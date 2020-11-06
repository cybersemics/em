import { getContextIndex, getHelpers, getThoughtIndex } from '../db'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
} from '../constants'

// util
import {
  isRoot,
  logWithTime,
  scrollCursorIntoView,
} from '../util'

// selectors
import {
  decodeThoughtsUrl,
  expandThoughts,
  getAllChildren,
} from '../selectors'

// action creators
import {
  importText,
} from '../action-creators'

/** Loads thoughts from the IndexedDB database. */
const loadLocalThoughts = () => async (dispatch, getState) => {

  const { cursor } = await getHelpers()

  logWithTime('loadLocalThoughts: getHelpers')

  const contextIndex = await getContextIndex()
  logWithTime('loadLocalThoughts: contextIndex loaded from IndexedDB')

  const thoughtIndex = await getThoughtIndex()
  logWithTime('loadLocalThoughts: thoughtIndex loaded from IndexedDB')

  const thoughts = { contextIndex, thoughtIndex }

  const restoreCursor = window.location.pathname.length <= 1 && cursor
  const { path, contextViews } = decodeThoughtsUrl({ thoughts }, restoreCursor ? cursor : window.location.pathname)
  const cursorNew = isRoot(path) ? null : path
  const expanded = expandThoughts(
    { thoughts, contextViews },
    cursorNew || []
  )

  setTimeout(scrollCursorIntoView)

  // instantiate initial Settings if it does not exist
  dispatch({
    type: 'loadLocalThoughts',
    contextViews,
    cursor: cursorNew,
    expanded,
    thoughts,
  })

  logWithTime('loadLocalThoughts: action dispatched')

  if (getAllChildren({ thoughts }, [EM_TOKEN, 'Settings']).length === 0) {
    await dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS))
  }
}

export default loadLocalThoughts
