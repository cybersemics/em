import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store'
import { EM_TOKEN } from '../constants'
import { hashContextUrl } from '../selectors'
import { clearSelection, decodeCharacterEntities, ellipsize, equalArrays, headValue, pathToContext, scrollCursorIntoView, strip } from '../util'
import { Connected, SimplePath } from '../types'

interface LinkProps {
  charLimit?: number,
  label?: string,
  simplePath: SimplePath,
}

/** Renders a link with the appropriate label to the given context. */
const Link = ({ simplePath, label, charLimit = 32, dispatch }: Connected<LinkProps>) => {
  const emContext = equalArrays(pathToContext(simplePath), [EM_TOKEN])
  const value = label || strip(headValue(simplePath))

  // TODO: Fix tabIndex for accessibility
  return <a tabIndex={-1} href={hashContextUrl(store.getState(), pathToContext(simplePath))} className='link' onClick={e => { // eslint-disable-line react/no-danger-with-children
    e.preventDefault()
    clearSelection()
    dispatch({ type: 'search', value: null })
    dispatch({ type: 'setCursor', simplePath })
    dispatch({ type: 'toggleSidebar', value: false })
    setTimeout(scrollCursorIntoView)
  }} dangerouslySetInnerHTML={emContext ? { __html: '<b>em</b>' } : undefined}>{!emContext ? ellipsize(decodeCharacterEntities(value), charLimit!) : null}</a>
}

export default connect()(Link)
