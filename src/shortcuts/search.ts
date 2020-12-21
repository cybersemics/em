import { cursorBeforeSearch, search, restoreCursorBeforeSearch } from '../action-creators'
import SearchIcon from '../components/SearchIcon'
import { Shortcut } from '../types'

const searchShortcut: Shortcut = {
  id: 'search',
  name: 'Search',
  description: 'Open the Search input. Use the same shortcut to close.',
  svg: SearchIcon,
  keyboard: { key: 'f', meta: true, alt: true },
  exec: (dispatch, getState) => {
    const state = getState()
    const selection = window.getSelection()
    dispatch(search({ value: !state.search && selection ? selection.toString() : null }))

    // if enabling search, save current cursor
    if (state.search == null) {
      dispatch(cursorBeforeSearch({ value: state.cursor }))
    }
    // otherwise restore cursor
    else {
      dispatch(restoreCursorBeforeSearch())
    }
  }
}

export default searchShortcut
