/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react'
import classNames from 'classnames'
import _ from 'lodash'

import {
  DIVIDER_PLUS_PX,
  DIVIDER_MIN_WIDTH
} from '../constants'
import {
  hashContext,
  headRank
} from '../util.js'
import { store } from '../store'

export const Divider = ({ thoughtsRanked, dispatch }) => {

  const dividerSetWidth = React.createRef()

  // get max width of nearby for divider list child elements, add 30 px and set this width for divider
  const setStyle = () => {
    if (dividerSetWidth.current) {
      const parentUl = dividerSetWidth.current.closest('ul')
      const children = parentUl.childNodes
      const maxWidth = _.chain(children).map(child => {
        if (child.classList.contains('child-divider')) return DIVIDER_PLUS_PX
        const subs = child.getElementsByClassName('subthought')
        if (subs.length) return (subs[0].offsetWidth + DIVIDER_PLUS_PX)
        else return DIVIDER_PLUS_PX
      }).max().value()
      dividerSetWidth.current.style.width = `${maxWidth > DIVIDER_MIN_WIDTH ? maxWidth : DIVIDER_MIN_WIDTH}px`
    }
  }

  useEffect(setStyle)

  return (<div ref={dividerSetWidth} style={{ width: '85px', maxWidth: '100%' }} className='divider-container'>
    <div className={classNames({
      divider: true,
      // requires editable-hash className to be selected by the cursor navigation via editableNode
      ['editable-' + hashContext(thoughtsRanked, headRank(thoughtsRanked))]: true,
    })} onClick={() => store.dispatch({ type: 'setCursor', thoughtsRanked })}/>
  </div>)
}
