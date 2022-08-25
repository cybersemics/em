import { View } from 'moti'
import React from 'react'
import { useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import { commonStyles } from '../style/commonStyles'
import head from '../util/head'
import parentOf from '../util/parentOf'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import Link from './Link'
import Superscript from './Superscript'

interface ThoughtLinkProps {
  charLimit?: number
  simplePath: SimplePath
  styleLink?: React.CSSProperties
  thoughtsLimit?: number
}

/**
 * Varaint of ContextBreadcrumbs for recently edited with collapsing overflow.
 */
const ThoughtLink = ({ charLimit, simplePath, styleLink, thoughtsLimit }: ThoughtLinkProps) => {
  const parentSimplePath = parentOf(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <>
      <View style={[commonStyles.halfOpacity, commonStyles.marginBottomS]}>
        <ContextBreadcrumbs simplePath={simplePath} charLimit={charLimit || 32} thoughtsLimit={thoughtsLimit || 10} />
      </View>
      <Link simplePath={parentSimplePath} label={value} />
      <Superscript simplePath={simplePath} />
    </>
  )
}

export default ThoughtLink
