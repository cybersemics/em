import Thunk from '../@types/Thunk'

/** Loads the local state from the IndexedDB database. Do not invoke until clientId is ready. */
const loadLocalState = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  dispatch({
    type: 'loadLocalState',
    contextViews: {},
    cursor: null,
  })
}

export default loadLocalState
