import { View } from 'moti'
import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { commonStyles } from '../style/commonStyles'
import head from '../util/head'
import parentOf from '../util/parentOf'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Link from './Link'
import Superscript from './Superscript'

interface ThoughtLinkProps {
  charLimit?: number
  path: Path
  styleLink?: React.CSSProperties
  thoughtsLimit?: number
}

/**
 * Varaint of ContextBreadcrumbs for recently edited with collapsing overflow.
 */
const ThoughtLink = ({ charLimit, path, styleLink, thoughtsLimit }: ThoughtLinkProps) => {
  const simplePath = useSelector((state: State) => simplifyPath(state, path), shallowEqual)
  const parentSimplePath = parentOf(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <>
      <View style={[commonStyles.halfOpacity, commonStyles.marginBottomS]}>
        <ContextBreadcrumbs path={path} charLimit={charLimit || 32} thoughtsLimit={thoughtsLimit || 10} />
      </View>
      <Link simplePath={parentSimplePath} label={value} />
      <Superscript simplePath={simplePath} />
    </>
  )
}

export default ThoughtLink
