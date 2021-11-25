import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import { store } from '../store'
import { isDocumentEditable, publishMode } from '../util'
import { isTutorial, simplifyPath } from '../selectors'
import HomeLink from './HomeLink'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import QuickAddButton from './QuickAddButton'
import FeedbackButton from './FeedbackButton'
import { Path, State } from '../@types'
import InvitesButton from './InvitesButton'
import tw from 'twin.macro'

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
    <NavWrapper>
      {!isTutorialOn && (
        <>
          <BreadcrumbsWrapper>
            {isDocumentEditable() || (cursor && cursor.length > 2) ? (
              <HomeLinkWrapper>
                <HomeLink />
              </HomeLinkWrapper>
            ) : null}
            <CSSTransition in={showBreadcrumbs} timeout={200} classNames='fade' unmountOnExit>
              <ContextBreadcrumbs simplePath={breadcrumbSimplePath} />
            </CSSTransition>
          </BreadcrumbsWrapper>
          <ButtonGroupWrapper>
            {authenticated && <InvitesButton />}
            <FeedbackButton />
            <QuickAddButton />
          </ButtonGroupWrapper>
        </>
      )}
    </NavWrapper>
  )
}

const NavWrapper = tw.nav`
    sticky
    z-index[1]
    py-6
    px-6
    bottom-0
    flex
    justify-between
    items-center
`

const BreadcrumbsWrapper = tw.div`
  flex
  gap-2
  items-center
`

const ButtonGroupWrapper = tw.div`
  flex
  gap-4
  items-center
`

// Hack to basealign the home link with the context breadcrumb. May be there's a better way to do it ?
const HomeLinkWrapper = tw.div`
  margin-bottom[5px]
`

export default connect(mapStateToProps)(NavBar)
