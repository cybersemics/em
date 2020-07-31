import React, { useCallback, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import classNames from 'classnames'
import _ from 'lodash'
import { DIVIDER_MIN_WIDTH, DIVIDER_PLUS_PX } from '../constants'
import { hashContext, headRank } from '../util'
import { Path } from '../types'

/** A custom horizontal rule. */
const Divider = ({ thoughtsRanked, isActive, parentKey }: { thoughtsRanked: Path, isActive?: boolean, parentKey: string }) => {

  const dividerSetWidth = React.useRef() as React.MutableRefObject<HTMLInputElement>
  const dispatch = useDispatch()

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'setCursor', thoughtsRanked })
  }

  /** Get the max width of nearby for divider list child elements, add 30 px and set this width for divider. */
  const setStyle = () => {
    if (dividerSetWidth.current) {
      const siblingNodes = document.getElementsByClassName(`parent-${parentKey}`)

      const maxWidth = _.chain(Array.from(siblingNodes).map((child: Element) => {
        if (child.classList.contains('child-divider')) return DIVIDER_PLUS_PX
        const subs = child.getElementsByClassName('subthought') as HTMLCollectionOf<HTMLElement>
        return subs.length
          ? subs[0].offsetWidth
          : DIVIDER_PLUS_PX
      })).max().value()

      // @ts-ignore
      dividerSetWidth.current.style.width = `${maxWidth > DIVIDER_MIN_WIDTH ? maxWidth : DIVIDER_MIN_WIDTH}px`
    }
  }

  const debouncedSetStyle = useCallback(_.debounce(setStyle, 100), [])

  useEffect(debouncedSetStyle)

  return <div ref={dividerSetWidth} style={{
    width: 85,
    zIndex: 1,
    transition: 'width 320ms linear'
  }} className='divider-container' onClick={setCursorToDivider}>
    <div className={classNames({
      divider: true,
      // requires editable-hash className to be selected by the cursor navigation via editableNode
      ['editable-' + hashContext(thoughtsRanked, headRank(thoughtsRanked))]: true,
    })} style={{ borderColor: isActive ? 'rgb(204, 204, 204)' : 'gray' }}/>
  </div>
}

export default Divider
