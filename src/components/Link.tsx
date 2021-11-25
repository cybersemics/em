import React from 'react'
import { useDispatch } from 'react-redux'
import { EM_TOKEN } from '../constants'
import { search, searchContexts, setCursor, toggleSidebar } from '../action-creators'
import { decodeCharacterEntities, ellipsize, equalArrays, headValue, pathToContext, strip } from '../util'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import * as selection from '../device/selection'
import { SimplePath } from '../@types'
import TextLink from './TextLink'
import tw from 'twin.macro'

interface LinkProps {
  charLimit?: number
  label?: string
  simplePath: SimplePath
}

/** Renders a link with the appropriate label to the given context. */
const Link = ({ simplePath, label, charLimit = 32, ...delegated }: LinkProps) => {
  const emContext = equalArrays(pathToContext(simplePath), [EM_TOKEN])
  const value = label || strip(headValue(simplePath))
  const dispatch = useDispatch()

  // TODO: Fix tabIndex for accessibility
  return (
    <ContextLink
      tabIndex={-1}
      colorVariant='gray'
      className='link'
      // TODO: Fix this type workaround after fixing TextLink type issue.
      onClick={(e: any) => {
        // eslint-disable-line react/no-danger-with-children
        e.preventDefault()
        selection.clear()
        dispatch(search({ value: null }))
        dispatch(searchContexts({ value: null }))
        dispatch(setCursor({ path: simplePath }))
        dispatch(toggleSidebar({ value: false }))
        scrollCursorIntoView()
      }}
      dangerouslySetInnerHTML={emContext ? { __html: '<b>em</b>' } : undefined}
      {...delegated}
    >
      {!emContext ? ellipsize(decodeCharacterEntities(value), charLimit!) : null}
    </ContextLink>
  )
}

const ContextLink = tw(TextLink)`
  transition-colors
  hover:(text-white)
`

export default Link
