import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

// util
import {
  decodeCharacterEntities,
  hashContextUrl,
  headValue,
  pathToContext,
  strip,
} from '../util.js'

// renders a link with the appropriate label to the given context
export const Link = connect()(({ thoughtsRanked, label, dispatch }) => {
  const value = label || strip(headValue(thoughtsRanked))
  // TODO: Fix tabIndex for accessibility
  return <a tabIndex='-1' href={hashContextUrl(pathToContext(thoughtsRanked), { contextViews: store.getState().contextViews })} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'search', value: null })
    dispatch({ type: 'setCursor', thoughtsRanked })
    // updateUrlHistory(rankThoughtsFirstMatch(e.shiftKey ? [head(thoughts)] : thoughts, store.getState().thoughtIndex))
  }}>{decodeCharacterEntities(value)}</a>
})
