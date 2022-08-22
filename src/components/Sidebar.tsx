import SwipeableDrawer, { SwipeableDrawerProps } from '@bit/mui-org.material-ui.swipeable-drawer'
import _ from 'lodash'
import React, { useEffect } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import pullPendingLexemes from '../action-creators/pullPendingLexemes'
import toggleSidebarActionCreator from '../action-creators/toggleSidebar'
import { isTouch } from '../browser'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import hashThought from '../util/hashThought'
import head from '../util/head'
import { findTreeDescendants } from '../util/recentlyEditedTree'
import RecentlyEditedBreadcrumbs from './RecentlyEditedBreadcrumbs'

// extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<
  SwipeableDrawerProps & { classes: any }
>

/** Favorites list. */
const Favorites = () => {
  const paths = useSelector((state: State) => {
    return (getLexeme(state, '=favorite')?.contexts || [])
      .map(id => {
        const thought = getThoughtById(state, id)
        if (!thought) return null
        const path = thoughtToPath(state, thought.parentId)
        return path
      })
      .filter(x => x) as SimplePath[]
  }, _.isEqual)

  return (
    <div className='recently-edited-sidebar'>
      <div className='header'>Favorites</div>
      <div style={{ padding: '0 2em' }}>
        {paths.length > 0
          ? paths.map(path => (
              <RecentlyEditedBreadcrumbs key={head(path)} path={path} charLimit={32} thoughtsLimit={10} />
            ))
          : 'No favorites'}
      </div>
    </div>
  )
}

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
    <div className='recently-edited-sidebar'>
      <div className='header'>Favorites</div>
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

  useEffect(() => {
    if (!showSidebar) return
    dispatch(
      pullPendingLexemes(
        {
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: {},
          pendingLexemes: {
            [hashThought('=favorite')]: true,
          },
        },
        { skipConflictResolution: true },
      ),
    )
  })

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
      <Favorites />
    </SwipeableDrawerWithClasses>
  )
}

export default Sidebar
