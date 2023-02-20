import Thunk from '../@types/Thunk'
import { getLastUpdated } from '../data-providers/yjs/thoughtspace'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  const lastUpdated = await getLastUpdated()
  dispatch({
    type: 'loadLocalState',
    contextViews: {},
    cursor: null,
    lastUpdated,
  })
}

export default loadLocalState
