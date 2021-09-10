import React from 'react'
import { useDispatch } from 'react-redux'
import { EM_TOKEN } from '../constants'
import { search, searchContexts, setCursor, toggleSidebar } from '../action-creators'
import {
  clearSelection,
  decodeCharacterEntities,
  ellipsize,
  equalArrays,
  headValue,
  pathToContext,
  strip,
} from '../util'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import { SimplePath } from '../@types'

interface LinkProps {
  charLimit?: number
  label?: string
  simplePath: SimplePath
}

/** Renders a link with the appropriate label to the given context. */
const Link = ({ simplePath, label, charLimit = 32 }: LinkProps) => {
  const emContext = equalArrays(pathToContext(simplePath), [EM_TOKEN])
  const value = label || strip(headValue(simplePath))
  const dispatch = useDispatch()

  // TODO: Fix tabIndex for accessibility
  return (
    <a
      tabIndex={-1}
      className='link'
      onClick={e => {
        // eslint-disable-line react/no-danger-with-children
        e.preventDefault()
        clearSelection()
        dispatch(search({ value: null }))
        dispatch(searchContexts({ value: null }))
        dispatch(setCursor({ path: simplePath }))
        dispatch(toggleSidebar({ value: false }))
        scrollCursorIntoView()
      }}
      dangerouslySetInnerHTML={emContext ? { __html: '<b>em</b>' } : undefined}
    >
      {!emContext ? ellipsize(decodeCharacterEntities(value), charLimit!) : null}
    </a>
  )
}

export default Link
