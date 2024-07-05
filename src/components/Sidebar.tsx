import SwipeableDrawer, { SwipeableDrawerProps } from '@mui/material/SwipeableDrawer'
import _ from 'lodash'
import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { isTouch } from '../browser'
import themeColors from '../selectors/themeColors'
import fastClick from '../util/fastClick'
import Favorites from './Favorites'
import RecentlyEdited from './RecentlyEdited'

// extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<
  SwipeableDrawerProps & { classes: any; ref: any }
>

/** The sidebar component. */
const Sidebar = () => {
  const [isSwiping, setIsSwiping] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const showSidebar = useSelector(state => state.showSidebar)
  const colors = useSelector(themeColors)
  const dispatch = useDispatch()
  const [section, setSection] = useState<'favorites' | 'recent'>('favorites')

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
      disableSwipeToOpen={!isTouch}
      ref={ref}
      SwipeAreaProps={{
        style: {
          // Set width here since setting style with SwipeAreaProps will override the swipeAreaWidth prop.
          width: 8,
          // Override default zIndex of 1199 to so that the Sidebar is below the Toolbar and Footer.
          // Otherwise the user can accidentally activate the Sidebar edge swipe when trying to tap the Hamburger menu or Home icon.
          // Cannot set class name on SwipeArea without overriding the entire SwipeableDrawer classes prop.
          zIndex: 1,
        },
      }}
      anchor='left'
      onOpen={() => toggleSidebar(true)}
      onClose={() => toggleSidebar(false)}
      open={showSidebar}
    >
      {/* <RecentlyEdited /> */}
      <div
        // We need to disable favorites drag-and-drop when the Sidebar is being slid close.
        // Unfortunately, MUI SwipeableDrawer does not provide an API for its animation or swipe state, or final open/close.
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
        <div
          className='favorites sidebar'
          style={{
            userSelect: 'none',
            // must be position:relative to ensure drop hovers are positioned correctly when sidebar is scrolled
            position: 'relative',
            padding: '0 1em',
            minWidth: '60vw',
          }}
        >
          <div style={{ marginLeft: '0.5em' }}>
            <a
              {...fastClick(() => setSection('favorites'))}
              style={{
                color: section === 'favorites' ? colors.fg : colors.gray50,
                display: 'inline-block',
                fontSize: '1.2em',
                fontWeight: 600,
                margin: '1em 1em 0 0',
                textDecoration: 'none',
              }}
            >
              Favorites
            </a>
            <a
              {...fastClick(() => setSection('recent'))}
              style={{
                color: section === 'recent' ? colors.fg : colors.gray50,
                display: 'inline-block',
                fontSize: '1.2em',
                fontWeight: 600,
                margin: '1em 1em 0 0',
                textDecoration: 'none',
              }}
            >
              Recently Edited
            </a>
          </div>

          {section === 'favorites' ? <Favorites disableDragAndDrop={isSwiping} /> : <RecentlyEdited />}
        </div>
      </div>
    </SwipeableDrawerWithClasses>
  )
}

export default Sidebar
