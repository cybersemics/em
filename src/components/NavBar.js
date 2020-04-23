import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'

// constants
import {
  getSetting,
  isDocumentEditable,
  isTutorial,
  publishMode,
} from '../util'

// components
import { Breadcrumbs } from './Breadcrumbs'
import HomeLink from './HomeLink'

const mapStateToProps = ({ cursor }) => ({
  cursor,
  tutorialStep: +getSetting('Tutorial Step')
})

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
      {!isTutorial() ? <React.Fragment>
        {isDocumentEditable() || (cursor && cursor.length > 2) ? <HomeLink /> : null}
        <Breadcrumbs path={cursor ? cursor.slice(publishMode() ? 1 : 0, cursor.length - 1) : []} className={{ 'nav-breadcrumbs': true }} />
      </React.Fragment> : null}
    </div>
  </div>

export default connect(mapStateToProps)(NavBar)
