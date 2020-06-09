/**
 * @packageDocumentation
 * @module components.Divider
 */

import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import classNames from 'classnames'
import _ from 'lodash'
import { DIVIDER_MIN_WIDTH, DIVIDER_PLUS_PX } from '../constants'
import { hashContext, headRank } from '../util'
import { Path } from '../types'

/** A custom horizontal rule. */
const Divider = ({ thoughtsRanked }: { thoughtsRanked: Path }) => {

  const dividerSetWidth = React.createRef<HTMLInputElement>()
  const dispatch = useDispatch()

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'setCursor', thoughtsRanked })
  }

  /** Get the max width of nearby for divider list child elements, add 30 px and set this width for divider. */
  const setStyle = () => {
    if (dividerSetWidth.current) {
      const parentUl = dividerSetWidth.current.closest('ul')
      const children = parentUl ? parentUl.childNodes : []
      const maxWidth = _.chain(children).map((child: HTMLElement) => {
        if (child.classList.contains('child-divider')) return DIVIDER_PLUS_PX
        const subs = child.getElementsByClassName('subthought') as HTMLCollectionOf<HTMLElement>
        return subs.length
          ? subs[0].offsetWidth + DIVIDER_PLUS_PX
          : DIVIDER_PLUS_PX
      }).max().value()
      // @ts-ignore
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
