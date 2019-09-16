import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// components
import { Breadcrumbs } from './Breadcrumbs.js'
import { CancelTutorial } from './CancelTutorial.js'
import { HomeLink } from './HomeLink.js'
import { Status } from './Status.js'

/** A navigation bar that contains a link to home, breadcrumbs, and status. */
export const NavBar = connect(({ cursor }) => ({ cursor }))(({ cursor, position }) =>
  <div className={classNames({
    nav: true,
    ['nav-' + position]: true
  })}>
    <div className={classNames({
      'nav-container': true,
      'nav-fill': cursor && cursor.length > 1
    })}>
      <HomeLink />
      <Breadcrumbs />
      <Status />
      <CancelTutorial />
    </div>
  </div>
)

