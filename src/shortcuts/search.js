import React from 'react'
import { store } from '../store.js'

// util
import {
  restoreCursorBeforeSearch,
} from '../util.js'

const searchSVG = ({ fill = 'black' }) => <svg xmlns='http://www.w3.org/2000/svg' x='0px' y='0px' width='16' height='16' viewBox='0 0 50 50'>
  <path fill={fill} d='M 21 3 C 11.601563 3 4 10.601563 4 20 C 4 29.398438 11.601563 37 21 37 C 24.355469 37 27.460938 36.015625 30.09375 34.34375 L 42.375 46.625 L 46.625 42.375 L 34.5 30.28125 C 36.679688 27.421875 38 23.878906 38 20 C 38 10.601563 30.398438 3 21 3 Z M 21 7 C 28.199219 7 34 12.800781 34 20 C 34 27.199219 28.199219 33 21 33 C 13.800781 33 8 27.199219 8 20 C 8 12.800781 13.800781 7 21 7 Z'></path>
  }
</svg>

export default {
  id: 'search',
  name: 'Search',
  description: 'Open the Search input. Use the same shortcut to close.',
  gesture: 'rl',
  svg: searchSVG,
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
