import Thunk from '../@types/Thunk'
import addLatestShortcuts from '../reducers/addLatestShortcuts'

/** Action-creator for addLatestShortcuts. */
const addLatestShortcutsActionCreator =
  (payload: Parameters<typeof addLatestShortcuts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'addLatestShortcuts', ...payload })

export default addLatestShortcutsActionCreator
