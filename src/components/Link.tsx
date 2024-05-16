import { unescape as decodeCharacterEntities } from 'lodash'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import { searchActionCreator as search } from '../actions/search'
import { searchContextsActionCreator as searchContexts } from '../actions/searchContexts'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { toggleSidebarActionCreator as toggleSidebar } from '../actions/toggleSidebar'
import { EM_TOKEN } from '../constants'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import ellipsize from '../util/ellipsize'
import fastClick from '../util/fastClick'
import head from '../util/head'
import strip from '../util/strip'

interface LinkProps {
  charLimit?: number
  className?: string
  label?: string
  simplePath: SimplePath
  style?: React.CSSProperties
}

/** Renders a link to a thought. */
const Link = React.memo(({ className, simplePath, label, charLimit = 32, style }: LinkProps) => {
  const isEM = simplePath.length === 1 && head(simplePath) === EM_TOKEN
  const value = useSelector(state => strip(label || getThoughtById(state, head(simplePath))?.value || ''))
  const dispatch = useDispatch()

  // TODO: Fix tabIndex for accessibility
  return (
    <a
      tabIndex={-1}
      className={`link ${className}`}
      {...fastClick(e => {
        // eslint-disable-line react/no-danger-with-children
        e.preventDefault()
        selection.clear()
        dispatch([
          search({ value: null }),
          searchContexts({ value: null }),
          setCursor({ path: simplePath }),
          toggleSidebar({ value: false }),
        ])
      })}
      style={{
        userSelect: 'none',
        color: 'inherit',
        textDecoration: 'none',
        ...style,
      }}
      dangerouslySetInnerHTML={isEM ? { __html: '<b>em</b>' } : undefined}
    >
      {!isEM ? ellipsize(decodeCharacterEntities(value), charLimit) : null}
    </a>
  )
})

Link.displayName = 'Link'

export default Link
