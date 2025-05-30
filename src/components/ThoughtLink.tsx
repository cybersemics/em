import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Link from './Link'
import Superscript from './Superscript'

/** Renders a link to a thought and its ancestors as ContextBreadcrumbs. */
const ThoughtLink = ({
  charLimit,
  hideArchive,
  hideContext,
  path,
  styleLink,
  thoughtsLimit,
  staticBreadcrumbs,
}: {
  charLimit?: number
  /** Hide just the =archive thought, but show the rest of the path. */
  hideArchive?: boolean
  hideContext?: boolean
  staticBreadcrumbs?: boolean
  path: Path
  styleLink?: React.CSSProperties
  thoughtsLimit?: number
}) => {
  const simplePath = useSelector(state => simplifyPath(state, path), shallowEqual)
  const parentPath = useSelector(state => rootedParentOf(state, path), shallowEqual)
  const value = useSelector(state => {
    const thought = getThoughtById(state, head(simplePath))
    return thought?.value
  })

  return (
    <div>
      {!hideContext && (
        <ContextBreadcrumbs
          hideArchive={hideArchive}
          path={parentPath}
          staticText={staticBreadcrumbs}
          charLimit={charLimit || 32}
          thoughtsLimit={thoughtsLimit || 10}
          cssRaw={css.raw({ marginTop: '1em', marginLeft: '0', lineHeight: 1.5 })}
          linkCssRaw={css.raw({ fontWeight: 'inherit' })}
        />
      )}
      <Link
        cssRaw={css.raw({ fontWeight: 'inherit', color: 'fg' })}
        simplePath={simplePath}
        label={value}
        style={styleLink}
      />
      <Superscript simplePath={simplePath} />
    </div>
  )
}

export default ThoughtLink
