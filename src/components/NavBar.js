import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// constants
import {
  getSetting,
  isTutorial,
} from '../util.js'

// components
import { Breadcrumbs } from './Breadcrumbs.js'
import { HomeLink } from './HomeLink.js'

/** A navigation bar that contains a link to home and breadcrumbs. */
export const NavBar = connect(({ cursor }) => ({ cursor, tutorialStep: +getSetting('Tutorial Step')[0] }))(({ cursor, position, tutorialStep }) =>
  <div className={classNames({
    nav: true,
    ['nav-' + position]: true
  })}>
    <div className={classNames({
      'nav-container': true,
      'nav-fill': cursor && cursor.length > 1
    })}>
      {!isTutorial() ? <React.Fragment>
        <HomeLink />
        <Breadcrumbs path={cursor ? cursor.slice(0, cursor.length - 1) : []} className={{ 'nav-breadcrumbs': true }} />
      </React.Fragment> : null}
    </div>
  </div>
)
