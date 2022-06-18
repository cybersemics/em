/* eslint-disable @typescript-eslint/no-unused-vars */

import React from 'react'
import { useSelector, useStore } from 'react-redux'
import _ from 'lodash'
import { findTreeDescendants } from '../util/recentlyEditedTree'
import RecentlyEditedBreadcrumbs from './RecentlyEditedBreadcrumbs'
import { View, StyleSheet } from 'react-native'
import { Text } from './Text.native'
import State from '../@types/State'

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
          return (
            <RecentlyEditedBreadcrumbs key={i} path={recentlyEditedThought.path} charLimit={32} thoughtsLimit={10} />
          )
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
