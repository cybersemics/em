import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import classNames from 'classnames'
import _ from 'lodash'

import {
  DIVIDER_MIN_WIDTH,
  DIVIDER_PLUS_PX,
} from '../constants'
import {
  hashContext,
  headRank,
} from '../util'

const Divider = ({ thoughtsRanked }) => {

  const dividerSetWidth = React.createRef()
  const dispatch = useDispatch()
  const setCursorToDivider = () => dispatch({ type: 'setCursor', thoughtsRanked })

  // get max width of nearby for divider list child elements, add 30 px and set this width for divider
  const setStyle = () => {
    if (dividerSetWidth.current) {
      const parentUl = dividerSetWidth.current.closest('ul')
      const children = parentUl.childNodes
      const maxWidth = _.chain(children).map(child => {
        if (child.classList.contains('child-divider')) return DIVIDER_PLUS_PX
        const subs = child.getElementsByClassName('subthought')
        if (subs.length) return subs[0].offsetWidth + DIVIDER_PLUS_PX
        else return DIVIDER_PLUS_PX
      }).max().value()
      dividerSetWidth.current.style.width = `${maxWidth > DIVIDER_MIN_WIDTH ? maxWidth : DIVIDER_MIN_WIDTH}px`
    }
  }

  useEffect(setStyle)

  return <div ref={dividerSetWidth} style={{
    margin: '-2px -4px -5px',
    maxWidth: '100%',
    padding: '10px 4px 16px',
    position: 'relative',
    width: 85,
    zIndex: 1,
  }} className='divider-container' onClick={setCursorToDivider}>
    <div className={classNames({
      divider: true,
      // requires editable-hash className to be selected by the cursor navigation via editableNode
      ['editable-' + hashContext(thoughtsRanked, headRank(thoughtsRanked))]: true,
    })} />
  </div>
}

export default Divider
