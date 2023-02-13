import classNames from 'classnames'
import React from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Path from '../@types/Path'
import State from '../@types/State'
import showModal from '../action-creators/showModal'
import isTutorial from '../selectors/isTutorial'
import themeColors from '../selectors/themeColors'
import isDocumentEditable from '../util/isDocumentEditable'
import publishMode from '../util/publishMode'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import HomeLink from './HomeLink'
import InvitesButton from './InvitesButton'

// define at top-level for stable object reference
const navBreadcrumbsClass = {
  'nav-breadcrumbs': true,
}

/** Renders ContextBreadcrumbs for the cursor. */
const CursorBreadcrumbs = () => {
  const breadcrumbSimplePath = useSelector(
    (state: State) => (state.cursor ? state.cursor.slice(publishMode() ? 1 : 0, state.cursor.length) : []) as Path,
    shallowEqual,
  )

  return <ContextBreadcrumbs path={breadcrumbSimplePath} classNamesObject={navBreadcrumbsClass} />
}

/** A link that opens The Manual. */
const ManualButton: React.FC = () => {
  const dispatch = useDispatch()

  return (
    <div
      onClick={() => dispatch(showModal({ id: 'manual' }))}
      title='The Manual'
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
  const authenticated = useSelector((state: State) => state.authenticated)
  const showBreadcrumbs = useSelector((state: State) => state.showBreadcrumbs)

  const showHomeLink = useSelector(
    (state: State) => isDocumentEditable() || (!!state.cursor && state.cursor.length > 2),
  )
  const backgroundColor = useSelector((state: State) =>
    state.cursor && state.cursor.length > 0 ? colors.bg : undefined,
  )

  return (
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
              <CSSTransition in={showBreadcrumbs} timeout={200} classNames='fade' unmountOnExit>
                <div style={{ flexGrow: 1 }}>
                  <CursorBreadcrumbs />
                </div>
              </CSSTransition>

              <div className='nav-right-button-group'>
                <>
                  <ManualButton />
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
  )
}

export default NavBar
