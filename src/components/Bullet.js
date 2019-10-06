import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import store from '../store.js'

// util
import {
  isContextViewActive,
  unrank,
} from '../util.js'

// connect bullet to contextViews so it can re-render independent from <Child>
export const Bullet = connect(({ contextViews }, props) => ({
  showContexts: isContextViewActive(unrank(props.itemsResolved), { state: store.getState() })
}))(({ showContexts }) =>
  <span className={classNames({
    bullet: true,
    'show-contexts': showContexts
  })} />
)

