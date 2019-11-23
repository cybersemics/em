import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

// util
import {
  decodeCharacterEntities,
  encodeItemsUrl,
  sigKey,
  unrank,
  strip,
} from '../util.js'

// renders a link with the appropriate label to the given context
export const Link = connect()(({ itemsRanked, label, dispatch }) => {
  const value = label || strip(sigKey(itemsRanked))
  // TODO: Fix tabIndex for accessibility
  return <a tabIndex='-1' href={encodeItemsUrl(unrank(itemsRanked), { contextViews: store.getState().contextViews })} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'setCursor', itemsRanked })
    // updateUrlHistory(rankItemsFirstMatch(e.shiftKey ? [signifier(items)] : items, store.getState().data))
  }}>{decodeCharacterEntities(value)}</a>
})
