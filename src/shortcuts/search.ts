import { Dispatch } from 'react'
import { restoreCursorBeforeSearch } from '../action-creators'
import SearchIcon from '../components/SearchIcon'
import { ActionCreator, Path, Shortcut } from '../types'

interface Search {
  type: 'search',
  value: string | null,
}

interface CursorBeforeSearch {
  type: 'cursorBeforeSearch',
  value: Path | null,
}

const searchShortcut: Shortcut = {
  id: 'search',
  name: 'Search',
  description: 'Open the Search input. Use the same shortcut to close.',
  svg: SearchIcon,
  keyboard: { key: 'f', alt: true },
  exec: (dispatch: Dispatch<Search | CursorBeforeSearch | ActionCreator>, getState) => {
    const state = getState()
    const selection = window.getSelection()
    dispatch({ type: 'search', value: !state.search && selection ? selection.toString() : null })

    // if enabling search, save current cursor
    if (state.search == null) {
      dispatch({ type: 'cursorBeforeSearch', value: state.cursor })
    }
    // otherwise restore cursor
    else {
      dispatch(restoreCursorBeforeSearch())
    }
  }
}

export default searchShortcut
