import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import Path from '../@types/Path'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { DIVIDER_MIN_WIDTH, DIVIDER_PLUS_PX } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import rootedParentOf from '../selectors/rootedParentOf'
import fastClick from '../util/fastClick'
import head from '../util/head'

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dividerSetWidth = React.createRef<HTMLInputElement>()
  const dispatch = useDispatch()

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Get the max width of nearby for divider list child elements, add 30 px and set this width for divider. */
  const setStyle = () => {
    if (dividerSetWidth.current) {
      const parentUl = dividerSetWidth.current.closest('ul')
      const children = parentUl ? (Array.from(parentUl.childNodes) as HTMLElement[]) : []
      const widths = children.map((child: HTMLElement) => {
        if (child.querySelector('[data-divider=true]')) return DIVIDER_PLUS_PX
        const subs = child.getElementsByClassName('subthought') as HTMLCollectionOf<HTMLElement>
        return subs.length ? subs[0].offsetWidth + DIVIDER_PLUS_PX : DIVIDER_PLUS_PX
      })
      const maxWidth = Math.max(...widths)
      dividerSetWidth.current.style.width = `${maxWidth > DIVIDER_MIN_WIDTH ? maxWidth : DIVIDER_MIN_WIDTH}px`
    }
  }

  useEffect(setStyle)

  const isTableView = useSelector(state => {
    const parentId = head(rootedParentOf(state, path))
    return attributeEquals(state, parentId, '=view', 'Table')
  })

  return (
    <div
      aria-label='divider'
      ref={dividerSetWidth}
      className={css({
        margin: '-2px -4px -5px',
        marginLeft: isTableView ? '0px' : '-20px',
        maxWidth: '100%',
        padding: '10px 4px 16px',
        position: 'relative',
        width: 85,
        zIndex: 'stack',
      })}
      {...fastClick(setCursorToDivider)}
    >
      <div
        aria-label={'editable-' + head(path)}
        className={css(
          {
            border: 'solid 1px {colors.divider}',
            // requires editable-hash className to be selected by the cursor navigation via editableNode
          },
          cssRaw,
        )}
      />
    </div>
  )
}

export default Divider
