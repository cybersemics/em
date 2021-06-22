import React from 'react'
import { connect } from 'react-redux'
// import { store } from '../store'
// import { isDocumentEditable, publishMode } from '../util'
// import { isTutorial } from '../selectors'
import HomeLink from './HomeLink'
import { State } from '../util/initialState'
import { Path } from '../types'
// import ContextBreadcrumbs from './ContextBreadcrumbs'
import QuickAddButton from './QuickAddButton'
import FeedbackButton from './FeedbackButton'
import { View, Text } from 'react-native'
// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { cursor, showBreadcrumbs } = state
  return {
    cursor,
    showBreadcrumbs
  }
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ cursor, position, showBreadcrumbs }: { cursor?: Path | null, position?: string, showBreadcrumbs?: boolean }) => {

  return <View style={{ paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}>
    <HomeLink />

    <Text style={{ color: 'white', flex: 1, flexWrap: 'wrap' }}>{'bread > crumbs > will go > here > thoughts > ua'}</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <FeedbackButton />
      <QuickAddButton />
    </View>
  </View>
}

export default connect(mapStateToProps)(NavBar)
