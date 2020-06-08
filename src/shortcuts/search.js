// util
import {
  restoreCursorBeforeSearch,
} from '../util'

// components
import SearchIcon from '../components/SearchIcon'

export default {
  id: 'search',
  name: 'Search',
  description: 'Open the Search input. Use the same shortcut to close.',
  svg: SearchIcon,
  keyboard: { key: 'f', shift: true, meta: true },
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
