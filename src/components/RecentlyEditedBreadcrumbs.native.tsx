import React from 'react'
import { useSelector } from 'react-redux'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'

// components
import Link from './Link'
import Superscript from './Superscript'
import { ContextBreadcrumbs, ContextBreadcrumbProps } from './ContextBreadcrumbs'
import head from '../util/head'
import parentOf from '../util/parentOf'
import Path from '../@types/Path'
import State from '../@types/State'
import { View } from 'moti'
import { commonStyles } from '../style/commonStyles'

/**
 * Varaint of ContextBreadcrumbs for recently edited with collapsing overflow.
 */
const RecentlyEditedBreadcrumbs = (props: Omit<ContextBreadcrumbProps, 'simplePath'> & { path: Path }) => {
  const simplePath = useSelector((state: State) => simplifyPath(state, props.path))
  const parentSimplePath = parentOf(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <>
      <View style={[commonStyles.halfOpacity, commonStyles.marginBottomS]}>
        <ContextBreadcrumbs {...props} simplePath={simplePath} />
      </View>
      <Link simplePath={parentSimplePath} label={value} />
      <Superscript simplePath={simplePath} />
    </>
  )
}

export default RecentlyEditedBreadcrumbs
