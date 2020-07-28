import { getContextIndex, getHelpers, getThoughtIndex } from '../data-providers/dexie'

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
  getThoughts,
} from '../selectors'

// action creators
import {
  importText,
} from '../action-creators'

/** Loads thoughts from the IndexedDB database. */
const loadLocalThoughts = () => async (dispatch, getState) => {

  const { cursor } = await getHelpers()

  const contextIndex = await getContextIndex()
  const thoughtIndex = await getThoughtIndex()
  const thoughts = { contextIndex, thoughtIndex }

  const restoreCursor = window.location.pathname.length <= 1 && cursor
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl({ thoughts }, restoreCursor ? cursor : window.location.pathname)
  const cursorNew = isRoot(thoughtsRanked) ? null : thoughtsRanked
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
    cursorBeforeEdit: cursorNew,
    expanded,
    thoughts,
  })

  if (getThoughts({ thoughts }, [EM_TOKEN, 'Settings']).length === 0) {
    await dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS))
  }
}

export default loadLocalThoughts
