import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'

// selectors
import { getSetting, isTutorial } from '../selectors'

// components
import { Breadcrumbs } from './Breadcrumbs'
import HomeLink from './HomeLink'

const mapStateToProps = state => {
  const { cursor } = state
  return {
    cursor,
    tutorialStep: +getSetting(state, 'Tutorial Step')
  }
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ cursor, position, tutorialStep }) =>
  <div className={classNames({
    nav: true,
    ['nav-' + position]: true
  })}>
    <div className={classNames({
      'nav-container': true,
      'nav-fill': cursor && cursor.length > 1
    })}>
      {!isTutorial(store.getState()) ? <React.Fragment>
        <HomeLink />
        <Breadcrumbs path={cursor ? cursor.slice(0, cursor.length - 1) : []} className={{ 'nav-breadcrumbs': true }} />
      </React.Fragment> : null}
    </div>
  </div>

export default connect(mapStateToProps)(NavBar)
