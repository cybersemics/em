import React from 'react'
import { useDispatch } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import search from '../action-creators/search'
import searchContexts from '../action-creators/searchContexts'
import setCursor from '../action-creators/setCursor'
import toggleSidebar from '../action-creators/toggleSidebar'
import { EM_TOKEN } from '../constants'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import { store } from '../store'
import decodeCharacterEntities from '../util/decodeCharacterEntities'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import strip from '../util/strip'

interface LinkProps {
  charLimit?: number
  label?: string
  simplePath: SimplePath
  style?: React.CSSProperties
}

/** Renders a link with the appropriate label to the given context. */
const Link = ({ simplePath, label, charLimit = 32, style }: LinkProps) => {
  const emContext = simplePath.length === 1 && head(simplePath) === EM_TOKEN
  const thought = getThoughtById(store.getState(), head(simplePath))
  const value = label || strip(thought.value)
  const dispatch = useDispatch()

  // TODO: Fix tabIndex for accessibility
  return (
    <a
      tabIndex={-1}
      className='link'
      onClick={e => {
        // eslint-disable-line react/no-danger-with-children
        e.preventDefault()
        selection.clear()
        dispatch(search({ value: null }))
        dispatch(searchContexts({ value: null }))
        dispatch(setCursor({ path: simplePath }))
        dispatch(toggleSidebar({ value: false }))
        scrollCursorIntoView()
      }}
      style={style}
      dangerouslySetInnerHTML={emContext ? { __html: '<b>em</b>' } : undefined}
    >
      {!emContext ? ellipsize(decodeCharacterEntities(value), charLimit!) : null}
    </a>
  )
}

export default Link
