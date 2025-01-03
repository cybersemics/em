import SwipeableDrawer, { SwipeableDrawerProps } from '@mui/material/SwipeableDrawer'
import _ from 'lodash'
import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { isIOS, isTouch } from '../browser'
import durations from '../util/durations'
import fastClick from '../util/fastClick'
import FadeTransition from './FadeTransition'
import Favorites from './Favorites'
import RecentlyDeleted from './RecentlyDeleted'
import RecentlyEdited from './RecentlyEdited'

// extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<
  SwipeableDrawerProps & { classes: any; ref: any }
>

type SidebarSection = 'favorites' | 'recentEdited' | 'deletedEdited'

/** A link to a sidebar section. */
const SidebarLink = ({
  active,
  section,
  setSection,
  text,
}: {
  active?: boolean
  section: SidebarSection
  setSection: (section: SidebarSection) => void
  text: string
}) => {
  return (
    <a
      {...fastClick(() => setSection(section))}
      data-testid={`sidebar-${section}`}
      className={css({
        color: active ? 'fg' : 'gray50',
        display: 'inline-block',
        fontSize: '1.2em',
        fontWeight: 600,
        margin: '0.5em 1em 0 0',
        textDecoration: 'none',
      })}
    >
      {text}
    </a>
  )
}

/** The sidebar component. */
const Sidebar = () => {
  const [isSwiping, setIsSwiping] = useState(false)
  const containerRef = useRef<HTMLInputElement>(null)
  const sidebarMenuRef = useRef<HTMLInputElement>(null)
  const showSidebar = useSelector(state => state.showSidebar)
  const fontSize = useSelector(state => state.fontSize)
  const dispatch = useDispatch()
  const [section, setSection] = useState<SidebarSection>('favorites')

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
      data-testid='sidebar'
      classes={{
        /* Increase precedence over .css-1u2w381-MuiModal-root-MuiDrawer-root z-index. */
        root: css({ userSelect: 'none', zIndex: 'sidebar !important' }),
        /* material drawer container css z-index override */
        paper: css({
          width: '400px',
          _mobile: { width: '90%' },
        }),
        paperAnchorLeft: css({ top: 'safeAreaTop !important' }),
        marginTop: '48px',
      }}
      disableSwipeToOpen={!isTouch}
      ref={containerRef}
      transitionDuration={durations.get('fast')}
      // On iOS Safari, restoring focus works when tapping the backdrop to close the sidebar, but not when tapping the hamburger
      // menu to close the sidebar. Hopefully the hamburger menu can be fixed and focus can be restored properly in all cases.
      // Until then, letting the backdrop (correctly) restore focus results in inconsistent behavior.
      ModalProps={{ disableRestoreFocus: isTouch }}
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
            const drawer = containerRef.current?.querySelector('.MuiDrawer-paper') as HTMLElement | null
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
        className={css({ height: '100%' })}
      >
        <div
          aria-label='sidebar'
          className={css({
            background: 'sidebarBg',
            overflowY: 'scroll',
            overscrollBehavior: 'contain',
            boxSizing: 'border-box',
            width: '100%',
            height: '100%',
            color: 'fg',
            scrollbarWidth: 'thin',
            lineHeight: 1.8,
            '&::-webkit-scrollbar': {
              width: '0px', // Remove scrollbar space
              background: 'transparent', // Optional: just make scrollbar invisible
              display: 'none',
            },
            userSelect: 'none',
            // must be position:relative to ensure drop hovers are positioned correctly when sidebar is scrolled
            position: 'relative',
            padding: '0 1em',
          })}
          data-scroll-at-edge
        >
          <FadeTransition duration='fast' in={showSidebar} nodeRef={sidebarMenuRef}>
            <div
              ref={sidebarMenuRef}
              style={{
                // match HamburgerMenu width + padding
                marginLeft: fontSize * 1.3 + 30,
                ...(isIOS && {
                  marginTop: '48px',
                }),
              }}
            >
              <SidebarLink
                active={section === 'favorites'}
                section='favorites'
                setSection={setSection}
                text='Favorites'
              />
              <SidebarLink
                active={section === 'recentEdited'}
                section='recentEdited'
                setSection={setSection}
                text='Recently Edited'
              />
              <SidebarLink
                active={section === 'deletedEdited'}
                section='deletedEdited'
                setSection={setSection}
                text='Recently Deleted'
              />
            </div>
          </FadeTransition>

          {section === 'favorites' ? (
            <Favorites disableDragAndDrop={isSwiping} />
          ) : section === 'recentEdited' ? (
            <RecentlyEdited />
          ) : section === 'deletedEdited' ? (
            <RecentlyDeleted />
          ) : (
            'Not yet implemented'
          )}
        </div>
      </div>
    </SwipeableDrawerWithClasses>
  )
}

export default Sidebar
