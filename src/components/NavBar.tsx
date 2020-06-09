/**
 * @packageDocumentation
 * @module components.NavBar
 */

import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'
import { isDocumentEditable, publishMode } from '../util'
import { getSetting, isTutorial } from '../selectors'
import { Breadcrumbs } from './Breadcrumbs'
import HomeLink from './HomeLink'
import { State } from '../util/initialState'
import { Path } from '../types'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { cursor } = state
  return {
    cursor,
    tutorialStep: +(getSetting(state, 'Tutorial Step') || 1)
  }
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ cursor, position, tutorialStep }: { cursor: Path | null, position: string, tutorialStep: number }) => // eslint-disable-line @typescript-eslint/no-unused-vars
  <div className={classNames({
    nav: true,
    ['nav-' + position]: true
  })}>
    <div className={classNames({
      'nav-container': true,
      'nav-fill': cursor && cursor.length > 1
    })}>
      {!isTutorial(store.getState()) ? <React.Fragment>
        {isDocumentEditable() || (cursor && cursor.length > 2) ? <HomeLink /> : null}
        <Breadcrumbs path={cursor ? cursor.slice(publishMode() ? 1 : 0, cursor.length - 1) : []} classNamesObject={{ 'nav-breadcrumbs': true }} />
      </React.Fragment> : null}
    </div>
  </div>

export default connect(mapStateToProps)(NavBar)
