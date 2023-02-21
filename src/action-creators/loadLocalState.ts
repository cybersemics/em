import Thunk from '../@types/Thunk'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  dispatch({
    type: 'loadLocalState',
    contextViews: {},
    cursor: null,
  })
}

export default loadLocalState
