import React from 'react'
import { connect } from 'react-redux'
import { simplifyPath } from '../selectors'

// components
import Link from './Link'
import Superscript from './Superscript'
import { ContextBreadcrumbs, ContextBreadcrumbProps } from './ContextBreadcrumbs'
import { headValue, parentOf } from '../util'
import { Path, State } from '../@types'
import { View } from 'moti'
import { commonStyles } from '../style/commonStyles'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: Omit<ContextBreadcrumbProps, 'simplePath'> & { path: Path }) => ({
  simplePath: simplifyPath(state, props.path),
})

/**
 * Varaint of ContextBreadcrumbs for recently edited with collapsing overflow.
 */
const RecentlyEditedBreadcrumbs = connect(mapStateToProps)(
  (props: ContextBreadcrumbProps & ReturnType<typeof mapStateToProps>) => {
    const parentSimplePath = parentOf(props.simplePath)
    const simplePath = props.simplePath

    return (
      <>
        <View style={[commonStyles.halfOpacity, commonStyles.marginBottomS]}>
          <ContextBreadcrumbs {...props} simplePath={simplePath} />
        </View>
        <Link simplePath={parentSimplePath} label={headValue(simplePath)} />
        <Superscript simplePath={simplePath} />
      </>
    )
  },
)

export default RecentlyEditedBreadcrumbs
