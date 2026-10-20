import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import { EMPTY_THOUGHT_PLACEHOLDER } from '../constants'
import useEditorSelector from '../hooks/useEditorSelector'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
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
  const simplePath = useEditorSelector(state => simplifyPath(state, path), shallowEqual)
  const parentPath = useSelector(state => rootedParentOf(state, path), shallowEqual)

  return (
    <div>
      {!hideContext && (
        // Use static 14px marginTop to replicate the previous 1em spacing (font size was fixed at 14px).
        <div className={css({ marginTop: '14px', lineHeight: 1.5 })}>
          <ContextBreadcrumbs
            variant='small'
            hideArchive={hideArchive}
            path={parentPath}
            placeholder={EMPTY_THOUGHT_PLACEHOLDER}
            staticText={staticBreadcrumbs}
            charLimit={charLimit || 32}
            thoughtsLimit={thoughtsLimit || 10}
            linkClassName={css({ fontWeight: 'inherit' })}
          />
        </div>
      )}
      <Link
        className={css({ fontWeight: 'inherit', color: 'fg' })}
        simplePath={simplePath}
        placeholder={EMPTY_THOUGHT_PLACEHOLDER}
        style={styleLink}
      />
      <Superscript simplePath={simplePath} />
    </div>
  )
}

export default ThoughtLink
