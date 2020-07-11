import { restoreCursorBeforeSearch } from '../util'
import SearchIcon from '../components/SearchIcon'

const searchShortcut = {
  id: 'search',
  name: 'Search',
  description: 'Open the Search input. Use the same shortcut to close.',
  svg: SearchIcon,
  keyboard: { key: 'f', alt: true },
  exec: (dispatch, getState) => {
    const state = getState()
    dispatch({ type: 'search', value: state.search == null ? window.getSelection().toString() : null })

    // if enabling search, save current cursor
    if (state.search == null) {
      dispatch({ type: 'cursorBeforeSearch', value: state.cursor })
    }
    // otherwise restore cursor
    else {
      restoreCursorBeforeSearch(state)
    }
  }
}

export default searchShortcut
