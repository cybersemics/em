import Command from '../@types/Command'
import { cursorBeforeSearchActionCreator as cursorBeforeSearch } from '../actions/cursorBeforeSearch'
import { restoreCursorBeforeSearch } from '../actions/restoreCursorBeforeSearch'
import { searchActionCreator as search } from '../actions/search'
import SearchIcon from '../components/SearchIcon'
import * as selection from '../device/selection'

const searchCommand = {
  id: 'search',
  label: 'Search' as const,
  description: 'Open the Search input. Use the same command to close.',
  svg: SearchIcon,
  multicursor: false,
  keyboard: { key: 'f', meta: true, alt: true },
  exec: (dispatch, getState) => {
    const state = getState()

    // The Search input is rendered whenever state.search is non-null, so an empty search is open, not closed.
    // Testing the value for truthiness instead would read an empty search as closed and re-open it (#4177).
    const isSearchOpen = state.search != null

    // seed the search with the selected text, if any
    dispatch(search({ value: isSearchOpen ? null : selection.isActive() ? selection.text() : '' }))

    // if enabling search, save current cursor
    if (!isSearchOpen) {
      dispatch(cursorBeforeSearch({ value: state.cursor }))
    }
    // otherwise restore cursor
    else {
      dispatch(restoreCursorBeforeSearch())
    }
  },
} satisfies Command

export default searchCommand
