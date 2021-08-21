import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import classNames from 'classnames'
import { store } from '../store'
import { isDocumentEditable, publishMode } from '../util'
import { isTutorial, simplifyPath } from '../selectors'
import HomeLink from './HomeLink'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import QuickAddButton from './QuickAddButton'
import FeedbackButton from './FeedbackButton'
import { Path, State } from '../@types'
import InvitesButton from './InvitesButton'

// avoid changing object reference
const navBreadcrumbsClass = {
  'nav-breadcrumbs': true,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { cursor, showBreadcrumbs, authenticated } = state
  return {
    cursor,
    showBreadcrumbs,
    authenticated,
  }
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({
  cursor,
  position,
  showBreadcrumbs,
  authenticated,
}: {
  cursor: Path | null
  position: string
  showBreadcrumbs: boolean
  authenticated: boolean
}) => {
  const isTutorialOn = isTutorial(store.getState())

  // avoid re-rendering from simplePath's new object reference
  const breadcrumbPath = (cursor ? cursor.slice(publishMode() ? 1 : 0, cursor.length - 1) : []) as Path
  const breadcrumbSimplePath = simplifyPath(store.getState(), breadcrumbPath)

  return (
    <div
      className={classNames({
        nav: true,
        ['nav-' + position]: true,
        'nav-fill': cursor && cursor.length > 1,
      })}
    >
      <div className='nav-inset'>
        <div className='nav-container' style={{ justifyContent: 'flex-end' }}>
          {!isTutorialOn && (
            <>
              {isDocumentEditable() || (cursor && cursor.length > 2) ? <HomeLink /> : null}
              <CSSTransition in={showBreadcrumbs} timeout={200} classNames='fade' unmountOnExit>
                <div style={{ flexGrow: 1 }}>
                  <ContextBreadcrumbs simplePath={breadcrumbSimplePath} classNamesObject={navBreadcrumbsClass} />
                </div>
              </CSSTransition>

              <div className='nav-right-button-group'>
                {authenticated && <InvitesButton />}
                <FeedbackButton />
                <QuickAddButton />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default connect(mapStateToProps)(NavBar)
