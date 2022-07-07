import SwipeableDrawer, { SwipeableDrawerProps } from '@bit/mui-org.material-ui.swipeable-drawer'
import _ from 'lodash'
import React from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import State from '../@types/State'
import toggleSidebarActionCreator from '../action-creators/toggleSidebar'
import { isTouch } from '../browser'
import { findTreeDescendants } from '../util/recentlyEditedTree'
import RecentlyEditedBreadcrumbs from './RecentlyEditedBreadcrumbs'

// extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<
  SwipeableDrawerProps & { classes: any }
>

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
    <div className='recently-edited-sidebar'>
      <div className='header'>Recently Edited Thoughts</div>
      <div style={{ padding: '0 2em' }}>
        {recentlyEdited.map((recentlyEditedThought, i) => (
          <RecentlyEditedBreadcrumbs key={i} path={recentlyEditedThought.path} charLimit={32} thoughtsLimit={10} />
        ))}
      </div>
    </div>
  )
}

/** The Recently Edited sidebar component. */
const Sidebar = () => {
  const showSidebar = useSelector((state: State) => state.showSidebar)
  const dispatch = useDispatch()

  /** Toggle the sidebar. */
  const toggleSidebar = (value: boolean) => dispatch(toggleSidebarActionCreator({ value }))

  return (
    /**
     * Actually Sidebar is inside the AppComponent. But the way the Material UI renders the drawer is by creating
     * a modal just inside the <body /> regardless where we put the Sidebar component in the component tree.
     * So .mobile classname added to the main wrapper of app component wont work for drawer.
     * Therefore instead of using recommended partern of .mobile .drawer-container
     * we are providing different classname to drawer based on isTouch property.
     */
    <SwipeableDrawerWithClasses
      classes={{ paper: isTouch ? 'drawer-container-mobile' : 'drawer-container-desktop' }}
      swipeAreaWidth={8}
      anchor='left'
      onOpen={() => {
        toggleSidebar(true)
      }}
      onClose={() => {
        toggleSidebar(false)
      }}
      open={showSidebar}
    >
      <RecentEdited />
    </SwipeableDrawerWithClasses>
  )
}

export default Sidebar
