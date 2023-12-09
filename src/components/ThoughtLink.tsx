import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Path from '../@types/Path'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Link from './Link'
import Superscript from './Superscript'

interface ThoughtLinkProps {
  charLimit?: number
  hideContext?: boolean
  staticBreadcrumbs?: boolean
  path: Path
  styleLink?: React.CSSProperties
  thoughtsLimit?: number
}

/** Link to thought with ContextBreadcrumbs. */
const ThoughtLink = ({
  charLimit,
  hideContext,
  path,
  styleLink,
  thoughtsLimit,
  staticBreadcrumbs,
}: ThoughtLinkProps) => {
  const simplePath = useSelector(state => simplifyPath(state, path), shallowEqual)
  const parentPath = useSelector(state => rootedParentOf(state, path), shallowEqual)
  const value = useSelector(state => getThoughtById(state, head(simplePath)).value)

  return (
    <div>
      {!hideContext && (
        <ContextBreadcrumbs
          path={parentPath}
          staticText={staticBreadcrumbs}
          charLimit={charLimit || 32}
          thoughtsLimit={thoughtsLimit || 10}
        />
      )}
      <Link simplePath={simplePath} label={value} style={styleLink} />
      <Superscript simplePath={simplePath} />
    </div>
  )
}

export default ThoughtLink
