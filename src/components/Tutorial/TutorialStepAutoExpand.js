import React, { Fragment } from 'react'
import { store } from '../../store'
import { isMobile } from '../../browser'

// util
import {
  ellipsize,
  headValue,
  pathToContext,
} from '../../util'

// selectors
import getThoughtsRanked from '../../selectors/getThoughtsRanked'

const TutorialStepAutoExpand = ({ cursor, rootSubthoughts = [] } = {}) => {

  const rootSubthoughtNotCursor = () => cursor
    ? rootSubthoughts.find(child => pathToContext(cursor).indexOf(child.value) === -1)
    : getThoughtsRanked(store.getState(), [rootSubthoughts[0]]).length > 0 ? rootSubthoughts[1] : rootSubthoughts[0]

  const state = store.getState()

  return (<Fragment>
    <p>Thoughts <i>within</i> thoughts are automatically hidden when you {isMobile ? 'tap' : 'click'} away.
      {cursor
        ? <Fragment> Try {rootSubthoughts.length > 1 && rootSubthoughtNotCursor()
          ? (<Fragment>{isMobile ? 'tapping' : 'clicking'} on {rootSubthoughtNotCursor()
            ? `"${ellipsize(rootSubthoughtNotCursor().value)}"`
            : 'it'
          }</Fragment>)
          : rootSubthoughts.length <= 1 && !rootSubthoughtNotCursor() ?
            <Fragment>creating a new thought{rootSubthoughts.length === 1 ? (<Fragment> after "{ellipsize(rootSubthoughts[0].value)}"</Fragment>) : null}</Fragment>
            : `${isMobile ? 'tapping' : 'clicking'} in the blank area`} to hide the subthought{cursor && cursor.length > 1
          ? ` "${ellipsize(headValue(cursor))}"`
          : cursor
            ? ` "${getThoughtsRanked(state, cursor)[0] && ellipsize(getThoughtsRanked(state, cursor)[0].value)}"`
            : null
        }.</Fragment>
        : ''
      }
    </p>
  </Fragment>)
}

export default TutorialStepAutoExpand
