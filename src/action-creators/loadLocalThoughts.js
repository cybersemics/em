import { getContextIndex, getHelpers, getThoughtIndex } from '../db'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { isRoot, logWithTime } from '../util'
import { decodeThoughtsUrl, expandThoughts, getAllChildren } from '../selectors'
import { scrollCursorIntoView } from '../action-creators'

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

  dispatch(scrollCursorIntoView())

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

  if (getAllChildren({ thoughts }, [EM_TOKEN, 'Settings']).length === 0) {
    await dispatch({
      type: 'importText',
      path: [{ value: EM_TOKEN, rank: 0 }],
      text: INITIAL_SETTINGS
    })
  }
}

export default loadLocalThoughts
