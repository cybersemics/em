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

  // TODO: Fix IndexedDB during tests
  const test = process.env.NODE_ENV === 'test'

  const { cursor } = test ? {} : await getHelpers()

  logWithTime('loadLocalThoughts: getHelpers')

  const contextIndex = test ? {} : await getContextIndex()
  logWithTime('loadLocalThoughts: contextIndex loaded from IndexedDB')

  const thoughtIndex = test ? {} : await getThoughtIndex()
  logWithTime('loadLocalThoughts: thoughtIndex loaded from IndexedDB')

  const thoughts = { contextIndex, thoughtIndex }

  const restoreCursor = window.location.pathname.length <= 1 && cursor
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl({ thoughts }, restoreCursor ? cursor : window.location.pathname)
  const cursorNew = isRoot(thoughtsRanked) ? null : thoughtsRanked
  const expanded = expandThoughts(
    { thoughts, contextViews },
    cursorNew || []
  )

  // instantiate initial Settings if it does not exist
  dispatch({
    type: 'loadLocalThoughts',
    contextViews,
    cursor: cursorNew,
    cursorBeforeEdit: cursorNew,
    expanded,
    thoughts,
  })

  logWithTime('loadLocalThoughts: action dispatched')

  if (getThoughts({ thoughts }, [EM_TOKEN, 'Settings']).length === 0) {
    await dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS))
  }
}

export default loadLocalThoughts
