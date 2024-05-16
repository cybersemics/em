import Shortcut from '../@types/Shortcut'
import { restoreCursorBeforeSearch } from '../actions/restoreCursorBeforeSearch'
import SearchIcon from '../components/SearchIcon'
import * as selection from '../device/selection'
import { cursorBeforeSearchActionCreator as cursorBeforeSearch } from '../reducers/cursorBeforeSearch'
import { searchActionCreator as search } from '../reducers/search'

const searchShortcut: Shortcut = {
  id: 'search',
  label: 'Search',
  description: 'Open the Search input. Use the same shortcut to close.',
  svg: SearchIcon,
  keyboard: { key: 'f', meta: true, alt: true },
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch(search({ value: !state.search && selection.isActive() ? selection.text() : null }))

    // if enabling search, save current cursor
    if (state.search == null) {
      dispatch(cursorBeforeSearch({ value: state.cursor }))
    }
    // otherwise restore cursor
    else {
      dispatch(restoreCursorBeforeSearch())
    }
  },
}

export default searchShortcut
