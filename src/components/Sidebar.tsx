import SwipeableDrawer, { SwipeableDrawerProps } from '@bit/mui-org.material-ui.swipeable-drawer'
import _ from 'lodash'
import React, { useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import State from '../@types/State'
import dragHold from '../action-creators/dragHold'
import dragInProgress from '../action-creators/dragInProgress'
import toggleSidebarActionCreator from '../action-creators/toggleSidebar'
import { isTouch } from '../browser'
import simplifyPath from '../selectors/simplifyPath'
import { findTreeDescendants } from '../util/recentlyEditedTree'
import Favorites from './Favorites'
import ThoughtLink from './ThoughtLink'

// extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<
  SwipeableDrawerProps & { classes: any; ref: any }
>

/** Displays recently edited thoughts with a header. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div className='sidebar'>
      <div className='header'>Recently Edited Thoughts</div>
      <div style={{ padding: '0 2em' }}>
        {recentlyEdited.map((recentlyEditedThought, i) => {
          const simplePath = simplifyPath(store.getState(), recentlyEditedThought.path)
          return <ThoughtLink key={i} simplePath={simplePath} />
        })}
      </div>
    </div>
  )
}

/** The Recently Edited sidebar component. */
const Sidebar = () => {
  const [isSwiping, setIsSwiping] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const showSidebar = useSelector((state: State) => state.showSidebar)
  const dispatch = useDispatch()

  /** Toggle the sidebar. */
  const toggleSidebar = (value: boolean) => {
    dispatch([toggleSidebarActionCreator({ value })])
  }

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
      ref={ref}
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
      {/* <RecentEdited /> */}
      <div
        // We need to disable favorites drag-and-drop when the Sidebar is being slid close.
        // Unfortunately, MUI SwipeableDrawer does provide an API for its animation or swipe state, or final open/close.
        // Therefore we check translateX from the .MuiDrawer-paper element and disable drag-and-drop
        // See: https://bit.cloud/mui-org/material-ui/swipeable-drawer
        //      https://mui.com/material-ui/api/swipeable-drawer/
        onTouchMove={_.throttle(
          () => {
            if (isSwiping) return
            const drawer = ref.current?.querySelector('.MuiDrawer-paper') as HTMLElement | null
            if (!drawer) return
            const translateX = parseInt(drawer.style.transform.slice(10))
            // set isSwiping if translateX is not parseable (NaN) or explicitly set to 0
            if (translateX) {
              setIsSwiping(true)
              dispatch([dragHold({ value: false }), dragInProgress({ value: false })])
            }
          },
          10,
          // no need to check on the first touchmove trigger since translateX is probably not yet set
          { leading: false },
        )}
        onTouchEnd={() => {
          setIsSwiping(false)
        }}
        style={{
          height: '100%',
        }}
      >
        <Favorites disableDragAndDrop={isSwiping} />
      </div>
    </SwipeableDrawerWithClasses>
  )
}

export default Sidebar
