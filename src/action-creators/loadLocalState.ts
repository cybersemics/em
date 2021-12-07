import * as db from '../data-providers/dexie'
import { EM_TOKEN, INITIAL_SETTINGS, INITIAL_SETTING_KEY } from '../constants'
import { importText, updateThoughts } from '../action-creators'
import { never, storage } from '../util'
import { Thunk } from '../@types'
import { getThoughtById } from '../selectors'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  // load helpers and settings from local database
  const { lastUpdated, recentlyEdited } = await (db.getHelpers() as Promise<db.Helper>)

  dispatch({
    type: 'loadLocalState',
    contextViews: {},
    cursor: null,
    lastUpdated,
    recentlyEdited: recentlyEdited || {},
  })

  const isSettingPopulated = storage.getItem(INITIAL_SETTING_KEY)

  // initialize settings if they don't exist
  if (!isSettingPopulated) {
    const emThought = getThoughtById(getState(), EM_TOKEN)
    const updatedEMParent = {
      ...emThought,
      pending: false,
    }

    dispatch([
      // set em thought pending status to false if not found in the local state
      updateThoughts({
        contextIndexUpdates: {
          [EM_TOKEN]: updatedEMParent,
        },
        thoughtIndexUpdates: {},
        local: false,
        remote: false,
      }),
      // set lastUpdated to never so that any settings from remote are used over the initial settings
      importText({
        path: [EM_TOKEN],
        text: INITIAL_SETTINGS,
        lastUpdated: never(),
        preventSetCursor: true,
      }),
    ])
    storage.setItem(INITIAL_SETTING_KEY, 'Loaded')
  }
}

export default loadLocalState
