import { store } from '../store.js'

// util
import {
  restoreCursorBeforeSearch,
} from '../util.js'

// components
import { SearchIcon } from '../components/SearchIcon.js'

export default {
  id: 'search',
  name: 'Search',
  description: 'Open the Search input. Use the same shortcut to close.',
  svg: SearchIcon,
  keyboard: { key: 'f', shift: true, meta: true },
  exec: () => {
    const state = store.getState()
    store.dispatch({ type: 'search', value: state.search == null ? window.getSelection().toString() : null })

    // if enabling search, save current cursor
    if (state.search == null) {
      store.dispatch({ type: 'cursorBeforeSearch', value: state.cursor })
    }
    // otherwise restore cursor
    else {
      restoreCursorBeforeSearch()
    }
  }
}
