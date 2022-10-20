import classNames from 'classnames'
import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Path from '../@types/Path'
import State from '../@types/State'
import { isTouch } from '../browser'
import isTutorial from '../selectors/isTutorial'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { store } from '../store'
import isDocumentEditable from '../util/isDocumentEditable'
import publishMode from '../util/publishMode'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import FeedbackButton from './FeedbackButton'
import GestureHintExtendedButton from './GestureHintExtendedButton'
import HomeLink from './HomeLink'
import InvitesButton from './InvitesButton'
import QuickAddButton from './QuickAddButton'

// avoid changing object reference
const navBreadcrumbsClass = {
  'nav-breadcrumbs': true,
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ position }: { position: string }) => {
  const isTutorialOn = useSelector(isTutorial)
  const colors = useSelector(themeColors)
  const authenticated = useSelector((state: State) => state.authenticated)
  const showBreadcrumbs = useSelector((state: State) => state.showBreadcrumbs)

  // avoid re-rendering from simplePath's new object reference
  const breadcrumbSimplePath = useSelector((state: State) => {
    const breadcrumbPath = (state.cursor ? state.cursor.slice(publishMode() ? 1 : 0, state.cursor.length) : []) as Path
    return simplifyPath(store.getState(), breadcrumbPath)
  }, shallowEqual)
  const showHomeLink = useSelector(
    (state: State) => isDocumentEditable() || (!!state.cursor && state.cursor.length > 2),
  )
  const backgroundColor = useSelector((state: State) =>
    state.cursor && state.cursor.length > 0 ? colors.bg : undefined,
  )

  return (
    <div
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
              <CSSTransition in={showBreadcrumbs} timeout={200} classNames='fade' unmountOnExit>
                <div style={{ flexGrow: 1 }}>
                  <ContextBreadcrumbs simplePath={breadcrumbSimplePath} classNamesObject={navBreadcrumbsClass} />
                </div>
              </CSSTransition>

              <div className='nav-right-button-group'>
                <>
                  {isTouch && <GestureHintExtendedButton />}
                  {authenticated && <InvitesButton />}
                  <FeedbackButton />
                  <QuickAddButton />
                </>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default NavBar
