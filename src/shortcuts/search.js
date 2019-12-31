import React from 'react'
import { store } from '../store.js'

// util
import {
  restoreCursorBeforeSearch,
} from '../util.js'

const searchSVG = <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
    <g>
        <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" fill="white"/>
    </g>
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
