import React from 'react'
import SwipeableDrawer, { SwipeableDrawerProps } from '@bit/mui-org.material-ui.swipeable-drawer'
import { useDispatch, useSelector } from 'react-redux'
import { isTouch } from '../browser'
import _ from 'lodash'
import { findTreeDescendants } from '../util/recentlyEditedTree'
import { toggleSidebar } from '../action-creators'
import { State } from '../util/initialState'
import RecentlyEditedBreadcrumbs from './RecentlyEditedBreadcrumbs'

// extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<SwipeableDrawerProps & { classes: any }>

/** Displays recently edited thoughts with a header. */
const RecentEdited = () => {

  const recentlyEditedTree = useSelector((state: State) => state.recentlyEdited)
  const showHiddenThoughts = useSelector((state: State) => state.showHiddenThoughts)
  const recentlyEdited = _.reverse(_.sortBy(findTreeDescendants(recentlyEditedTree, { startingPath: [], showHiddenThoughts }), 'lastUpdated')) // eslint-disable-line fp/no-mutating-methods

  return (
    <div className='recently-edited-sidebar'>
      <div className='header'>Recently Edited Thoughts</div>
      <div style={{ padding: '0 2em' }}>
        {
          recentlyEdited.map((recentlyEditedThought, i) => <RecentlyEditedBreadcrumbs key={i} path={recentlyEditedThought.path} charLimit={32} thoughtsLimit={10} />)
        }
      </div>
    </div>
  )
}

/** The Recently Edited sidebar component. */
const Sidebar = () => {

  const showSidebar = useSelector((state: State) => state.showSidebar)
  const dispatch = useDispatch()

  /** Toggle the sidebar. */
  const onToggleSidebar = (value: boolean) => dispatch(toggleSidebar({ value }))

  return (
    /**
     * Actually Sidebar is inside the AppComponent. But the way the Material UI renders the drawer is by creating
     * a modal just inside the <body /> regardless where we put the Sidebar component in the component tree.
     * So .mobile classname added to the main wrapper of app component wont work for drawer.
     * Therefore instead of using recommended partern of .mobile .drawer-container
     * we are providing different classname to drawer based on isTouch property.
     */
    <SwipeableDrawerWithClasses classes={{ paper: isTouch ? 'drawer-container-mobile' : 'drawer-container-desktop' }} swipeAreaWidth={8} anchor='left' onOpen={() => {
      onToggleSidebar(true)
    }} onClose={() => {
      onToggleSidebar(false)
    }} open={showSidebar} >
      <RecentEdited />
    </SwipeableDrawerWithClasses>
  )
}

export default Sidebar
