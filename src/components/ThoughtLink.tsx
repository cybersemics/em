import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import parentOf from '../util/parentOf'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Link from './Link'
import Superscript from './Superscript'

interface ThoughtLinkProps {
  charLimit?: number
  hideContext?: boolean
  staticBreadcrumbs?: boolean
  simplePath: SimplePath
  styleLink?: React.CSSProperties
  thoughtsLimit?: number
}

/** Link to thought with ContextBreadcrumbs. */
const ThoughtLink = ({
  charLimit,
  hideContext,
  simplePath,
  styleLink,
  thoughtsLimit,
  staticBreadcrumbs,
}: ThoughtLinkProps) => {
  // create a stable object reference to avoid re-rendering ContextBreadcrumbs when simplePath hasn't changed
  const parentSimplePath = useMemo(() => parentOf(simplePath), [simplePath])
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <div>
      {!hideContext && (
        <ContextBreadcrumbs
          staticText={staticBreadcrumbs}
          simplePath={parentSimplePath}
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
