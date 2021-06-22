import React from 'react'
import { connect } from 'react-redux'
// import { store } from '../store'
// import { isDocumentEditable, publishMode } from '../util'
// import { isTutorial } from '../selectors'
import HomeLink from './HomeLink'
import { State } from '../util/initialState'
import { Path } from '../types'
// import ContextBreadcrumbs from './ContextBreadcrumbs'
import QuickAddButton from './QuickAddButton'
import FeedbackButton from './FeedbackButton'
import { View, Text } from 'react-native'
// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { cursor, showBreadcrumbs } = state
  return {
    cursor,
    showBreadcrumbs
  }
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ cursor, position, showBreadcrumbs }: { cursor?: Path | null, position?: string, showBreadcrumbs?: boolean }) => {

  //  const isTutorialOn = isTutorial(store.getState())
  //  const breadcrumbPath = (cursor ? cursor.slice(publishMode() ? 1 : 0, cursor.length - 1) : []) as Path

  return <View style={{ paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}>
    <HomeLink />

    <Text style={{ color: 'white', flex: 1, flexWrap: 'wrap' }}>{'bread > crumbs > will go > here > thoughts > ua'}</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <FeedbackButton />
      <QuickAddButton />
    </View>
  </View>
  // return <div className={classNames({
  //   nav: true,
  //   ['nav-' + position]: true,
  //   'nav-fill': cursor && cursor.length > 1
  // })}>
  //   <div className='nav-inset'>
  //     <div className='nav-container' style={{ justifyContent: 'flex-end' }}>

  //       {!isTutorialOn && <>
  //         {isDocumentEditable() || (cursor && cursor.length > 2) ? <HomeLink /> : null}
  //         <CSSTransition in={showBreadcrumbs} timeout={200} classNames='fade' unmountOnExit>
  //           <div style={{ flexGrow: 1 }}>
  //             <ContextBreadcrumbs path={breadcrumbPath} classNamesObject={{ 'nav-breadcrumbs': true }} />
  //           </div>
  //         </CSSTransition>

  //         <div className='nav-right-button-group'>
  //           <FeedbackButton />
  //           <QuickAddButton />
  //         </div>
  //       </>}

  //     </div>
  //   </div>
  // </div>
}

export default connect(mapStateToProps)(NavBar)
