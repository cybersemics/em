import Thunk from '../@types/Thunk'
import importText from '../action-creators/importText'
import updateThoughts from '../action-creators/updateThoughts'
import { EM_TOKEN, INITIAL_SETTINGS, INITIAL_SETTING_KEY } from '../constants'
import { getLastUpdated } from '../data-providers/yjs'
import getThoughtById from '../selectors/getThoughtById'
import never from '../util/never'
import storage from '../util/storage'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  const lastUpdated = await getLastUpdated()

  dispatch({
    type: 'loadLocalState',
    contextViews: {},
    cursor: null,
    lastUpdated,
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
        thoughtIndexUpdates: {
          [EM_TOKEN]: updatedEMParent,
        },
        lexemeIndexUpdates: {},
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
