import classNames from 'classnames'
import React, { useRef } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Path from '../@types/Path'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { isTouch } from '../browser'
import { BASE_FONT_SIZE } from '../constants'
import isTutorial from '../selectors/isTutorial'
import themeColors from '../selectors/themeColors'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import fastClick from '../util/fastClick'
import isDocumentEditable from '../util/isDocumentEditable'
import publishMode from '../util/publishMode'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import HomeLink from './HomeLink'
import InvitesButton from './InvitesButton'
import Scale from './Scale'

// define at top-level for stable object reference
const navBreadcrumbsClass = {
  'nav-breadcrumbs': true,
}

/** Renders ContextBreadcrumbs for the cursor. */
const CursorBreadcrumbs = () => {
  const breadcrumbSimplePath = useSelector(
    state => (state.cursor ? state.cursor.slice(publishMode() ? 1 : 0, state.cursor.length) : []) as Path,
    shallowEqual,
  )

  return <ContextBreadcrumbs path={breadcrumbSimplePath} classNamesObject={navBreadcrumbsClass} />
}

/** A link that opens the Help modal. */
const HelpButton: React.FC = () => {
  const dispatch = useDispatch()
  return (
    <div
      {...fastClick(() => dispatch(showModal({ id: 'help' })))}
      title='Help'
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        fontWeight: 'bold',
        // extend tap area
        // margin-right less than -10 causes content to scroll horizontally on swipe
        padding: '10px 10px 10px 20px',
        margin: -10,
        userSelect: 'none',
      }}
    >
      ?
    </div>
  )
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ position }: { position: string }) => {
  const isTutorialOn = useSelector(isTutorial)
  const colors = useSelector(themeColors)
  const authenticated = useSelector(state => state.authenticated)
  const editing = useSelector(state => state.editing)
  const distractionFreeTyping = distractionFreeTypingStore.useState()
  const fontSize = useSelector(state => state.fontSize)
  const scale = fontSize / BASE_FONT_SIZE

  const showHomeLink = useSelector(state => isDocumentEditable() || (!!state.cursor && state.cursor.length > 2))
  const backgroundColor = useSelector(state => (state.cursor && state.cursor.length > 0 ? colors.bg : undefined))

  const cursorBreadcrumbsWrapperRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className='z-index-navbar'
      style={
        !isTouch || !editing
          ? {
              position: 'sticky',
              // cannot use safe-area-inset because of mobile Safari z-index issues
              bottom: 0,
            }
          : undefined
      }
    >
      {/* {isTouch && <SidebarGutter />} */}
      <Scale amount={scale} origin='bottom left'>
        <div
          aria-label='nav'
          className={classNames({
            nav: true,
            ['nav-' + position]: true,
          })}
          style={{
            backgroundColor,
          }}
        >
          <div className='nav-inset'>
            <div className='nav-container' style={{ justifyContent: 'flex-end' }}>
              {!isTutorialOn && (
                <>
                  {/* The entire bottom nav is scaled by font size using the Scale component, so we can use a fixed size here. */}
                  {showHomeLink ? <HomeLink size={24} /> : null}
                  <CSSTransition
                    nodeRef={cursorBreadcrumbsWrapperRef}
                    in={!distractionFreeTyping}
                    timeout={200}
                    classNames='fade'
                    unmountOnExit
                  >
                    <div ref={cursorBreadcrumbsWrapperRef} style={{ flexGrow: 1 }}>
                      <CursorBreadcrumbs />
                    </div>
                  </CSSTransition>

                  <div className='nav-right-button-group'>
                    <>
                      <HelpButton />
                      {authenticated && <InvitesButton />}
                      {/* <FeedbackButton /> */}
                      {/* <QuickAddButton /> */}
                    </>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Scale>
    </div>
  )
}

export default NavBar
