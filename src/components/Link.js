import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

// util
import {
  decodeCharacterEntities,
  ellipsize,
  hashContextUrl,
  headValue,
  pathToContext,
  strip,
} from '../util.js'

// renders a link with the appropriate label to the given context
export const Link = connect()(({ thoughtsRanked, label, dispatch, isThoughtsTab }) => {
  const value = label || strip(headValue(thoughtsRanked))
  // TODO: Fix tabIndex for accessibility
  return <a tabIndex='-1' href={hashContextUrl(pathToContext(thoughtsRanked), { contextViews: store.getState().contextViews })} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'search', value: null })
    dispatch({ type: 'setCursor', thoughtsRanked })
    /** we need to toggle sidebar off whenever any breadcrumbs link inside sidebar is clicked */
    if (isThoughtsTab) dispatch({ type: 'toggleSidebar', value: false })
    // updateUrlHistory(rankThoughtsFirstMatch(e.shiftKey ? [head(thoughts)] : thoughts, store.getState().thoughtIndex))
  }}>{ellipsize(decodeCharacterEntities(value), 20)}</a>
})
