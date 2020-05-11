import React from 'react'
import SwipeableDrawer from '@bit/mui-org.material-ui.swipeable-drawer'
import { useDispatch, useSelector } from 'react-redux'
import { isMobile } from '../browser'
import _ from 'lodash'
import { Breadcrumbs } from './Breadcrumbs'
import { findTreeDescendants } from '../util/recentlyEditedTree'

const ThoughtsTab = ({ thoughtsRanked }) => {
  return (
    <div className="thoughts-tab">
      {/* Here charLimit and thoughtsLimit is provided based on mobile and desktop */}
      <Breadcrumbs path={thoughtsRanked} charLimit={32} thoughtsLimit={10} />
    </div>
  )
}

const RecentEdited = () => {
  const recentlyEdited = _.reverse(_.sortBy(findTreeDescendants(useSelector(state => (state.recentlyEdited)), []), 'lastUpdated')) // eslint-disable-line fp/no-mutating-methods

  return (
    <div className="recently-edited-sidebar">
      <div className="header">Recently Edited Thoughts</div>
      <div style={{ padding: '0 2em' }}>
        {
          recentlyEdited.map((recentlyEditedThought, i) => <ThoughtsTab thoughtsRanked={recentlyEditedThought.path} key={i} />)
        }
      </div>
    </div>
  )
}

const Sidebar = () => {

  const showSidebar = useSelector(state => (state.showSidebar))
  const dispatch = useDispatch()

  const onToggleSidebar = value => {
    dispatch({ type: 'toggleSidebar', value })
  }

  return (
    /**
     * Actually Sidebar is inside the AppComponent. But the way the Material UI renders the drawer is by creating
     * a modal just inside the <body /> regardless where we put the Sidebar component in the component tree.
     * So .mobile classname added to the main wrapper of app component wont work for drawer.
     * Therefore instead of using recommended partern of .mobile .drawer-container
     * we are providing different classname to drawer based on isMobile property.
     */
    <SwipeableDrawer classes={{ paper: isMobile ? 'drawer-container-mobile' : 'drawer-container-desktop' }} swipeAreaWidth={8} anchor="left" onOpen={() => {
      onToggleSidebar(true)
    }} onClose={() => {
      onToggleSidebar(false)
    }} open={showSidebar} >
      <RecentEdited />
    </SwipeableDrawer>
  )
}

export default Sidebar
