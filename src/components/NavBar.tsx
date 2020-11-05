import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'
import { isDocumentEditable, publishMode } from '../util'
import { isTutorial } from '../selectors'
import Breadcrumbs from './Breadcrumbs'
import HomeLink from './HomeLink'
import { State } from '../util/initialState'
import { Path } from '../types'
import { CSSTransition } from 'react-transition-group'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { cursor, showBreadcrumbs } = state
  return {
    cursor,
    showBreadcrumbs
  }
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ cursor, position, showBreadcrumbs }: { cursor: Path | null, position: string, showBreadcrumbs: boolean }) => // eslint-disable-line @typescript-eslint/no-unused-vars
  <div className={classNames({
    nav: true,
    ['nav-' + position]: true,
    'nav-fill': cursor && cursor.length > 1
  })}>
    <div className={classNames({
      'nav-inset': true,
    })}>
      <div className='nav-container'>
        {!isTutorial(store.getState()) ? <React.Fragment>
          {isDocumentEditable() || (cursor && cursor.length > 2) ? <HomeLink /> : null}
          <CSSTransition in={showBreadcrumbs} timeout={200} classNames='fade' unmountOnExit>
            <Breadcrumbs path={cursor ? cursor.slice(publishMode() ? 1 : 0, cursor.length - 1) : []} classNamesObject={{ 'nav-breadcrumbs': true }} />
          </CSSTransition>
        </React.Fragment> : null}
      </div>
    </div>
  </div>

export default connect(mapStateToProps)(NavBar)
