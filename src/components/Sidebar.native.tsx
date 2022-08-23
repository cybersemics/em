/* eslint-disable @typescript-eslint/no-unused-vars */
import _ from 'lodash'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useSelector, useStore } from 'react-redux'
import State from '../@types/State'
import simplifyPath from '../selectors/simplifyPath'
import { findTreeDescendants } from '../util/recentlyEditedTree'
import RecentlyEditedBreadcrumbs from './RecentlyEditedBreadcrumbs'
import { Text } from './Text.native'

/** Displays recently edited thoughts with a header. */
const RecentEdited = () => {
  const recentlyEditedTree = useSelector((state: State) => state.recentlyEdited)
  const showHiddenThoughts = useSelector((state: State) => state.showHiddenThoughts)

  const store = useStore()

  // eslint-disable-next-line fp/no-mutating-methods
  const recentlyEdited = _.reverse(
    _.sortBy(
      findTreeDescendants(store.getState(), recentlyEditedTree, { startingPath: [], showHiddenThoughts }),
      'lastUpdated',
    ),
  )

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Recently Edited Thoughts</Text>

      <View style={styles.padding}>
        {recentlyEdited.map((recentlyEditedThought, i) => {
          const simplePath = simplifyPath(store.getState(), recentlyEditedThought.path)
          return <RecentlyEditedBreadcrumbs key={i} simplePath={simplePath} charLimit={32} thoughtsLimit={10} />
        })}
      </View>
    </View>
  )
}

/** The Recently Edited sidebar component. */
const Sidebar = () => {
  return <RecentEdited />
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#292a2b', height: '100%', padding: 15 },
  headerText: { color: '#666', fontWeight: '300', fontSize: 12 },
  padding: { padding: 5 },
  text: { color: '#fff' },
})

export default Sidebar
