import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store'
import { publishMode } from '../util'
import { simplifyPath } from '../selectors'
import HomeLink from './HomeLink'
import { Path, State } from '../@types'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import QuickAddButton from './QuickAddButton'
import FeedbackButton from './FeedbackButton'
import { View, StyleSheet } from 'react-native'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { cursor, showBreadcrumbs } = state
  return {
    cursor,
    showBreadcrumbs,
  }
}

interface IComponentProps {
  cursor?: Path | null
  position?: string
  showBreadcrumbs?: boolean
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ cursor, position, showBreadcrumbs }: IComponentProps) => {
  const breadcrumbPath = (cursor ? cursor.slice(publishMode() ? 1 : 0, cursor.length - 1) : []) as Path

  const breadcrumbSimplePath = simplifyPath(store.getState(), breadcrumbPath)

  return (
    <View style={styles.container}>
      <HomeLink />

      <ContextBreadcrumbs simplePath={breadcrumbSimplePath} />
      <View style={styles.buttonsContainer}>
        <FeedbackButton />
        <QuickAddButton />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' },
  breadcrumbs: { color: 'white', flex: 1, flexWrap: 'wrap' },
  buttonsContainer: { flexDirection: 'row', alignItems: 'center' },
})

export default connect(mapStateToProps)(NavBar)
