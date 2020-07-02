import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'
// constants
import {
  isDocumentEditable,
  publishMode,
} from '../util'

// selectors
import {
  getSetting,
  isTutorial,
} from '../selectors'

// components
import { Breadcrumbs } from './Breadcrumbs'
import HomeLink from './HomeLink'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = state => {
  const { cursor } = state
  return {
    cursor,
    tutorialStep: +getSetting(state, 'Tutorial Step')
  }
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ cursor, pathForced, position, tutorialStep }) => {
  const _cursor = cursor || pathForced
  const path = _cursor ? _cursor.slice(publishMode() ? 1 : 0, _cursor.length - 1) : []
  return <div className={classNames({
    nav: true,
    ['nav-' + position]: true
  })}>
    <div className={classNames({
      'nav-container': true,
      'nav-fill': cursor && cursor.length > 1
    })}>
      {!isTutorial(store.getState()) ? <React.Fragment>
        {isDocumentEditable() || (_cursor && _cursor.length > 2) ? <HomeLink /> : null}
        <Breadcrumbs path={path} className={{ 'nav-breadcrumbs': true }} />
      </React.Fragment> : null}
    </div>
  </div>

}

export default connect(mapStateToProps)(NavBar)
