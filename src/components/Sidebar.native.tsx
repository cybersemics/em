/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
import React from 'react'
import { useSelector } from 'react-redux'
import _ from 'lodash'
import { findTreeDescendants } from '../util/recentlyEditedTree'
import { State } from '../util/initialState'
// import RecentlyEditedBreadcrumbs from './RecentlyEditedBreadcrumbs'
import { View, Text } from 'react-native'

/** Displays recently edited thoughts with a header. */
const RecentEdited = () => {
  const recentlyEditedTree = useSelector((state: State) => state.recentlyEdited)
  const showHiddenThoughts = useSelector((state: State) => state.showHiddenThoughts)
  // eslint-disable-next-line fp/no-mutating-methods
  const recentlyEdited = _.reverse(
    _.sortBy(findTreeDescendants(recentlyEditedTree, { startingPath: [], showHiddenThoughts }), 'lastUpdated'),
  )

  return (
    <View style={{ backgroundColor: '#292a2b', height: '100%', padding: 15 }}>
      <Text style={{ color: '#666', fontWeight: '300', fontSize: 20 }}>Recently Edited Thoughts</Text>

      <View style={{ padding: 15 }}>
        <Text style={{ color: '#fff' }}>RecentlyEditedBreadcrumbs will go here</Text>
        {/* {recentlyEdited.map((recentlyEditedThought, i) => (
          <RecentlyEditedBreadcrumbs key={i} path={recentlyEditedThought.path} charLimit={32} thoughtsLimit={10} />
        )) } */}
      </View>
    </View>
  )
}

/** The Recently Edited sidebar component. */
const Sidebar = () => {
  return <RecentEdited />
}

export default Sidebar
