import React from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import ThoughtId from '../@types/ThoughtId'
import getElementFill from '../selectors/getElementFill'

/** Renders a given number as a superscript. */
const StaticSuperscript = React.forwardRef<
  HTMLSpanElement,
  {
    n: number
    cssRaw?: SystemStyleObject
    style?: React.CSSProperties
    show?: boolean
    hideZero?: boolean
    absolute?: boolean
    thoughtId?: ThoughtId
  }
>(({ n, style, show = true, hideZero, absolute, cssRaw, thoughtId }, forwardRef) => {
  const fill = useSelector(state => (thoughtId ? getElementFill(state, thoughtId) : undefined))

  return (
    <span
      ref={forwardRef}
      className={css(
        {
          /* prevent expanded click area from wrapping */
          whiteSpace: 'nowrap',
          zIndex: 'stack',
          pointerEvents: 'none',
          userSelect: 'none',
        },
        cssRaw,
      )}
      style={style}
    >
      {show && (
        <span
          className={css({
            fontSize: '60%',
            whiteSpace: 'nowrap',
            position: absolute ? 'absolute' : undefined,
          })}
        >
          {(n || !hideZero) && (
            <sup
              role='superscript'
              className={css({
                position: 'relative',
                zIndex: 'stack',
                top: '-1px',
                left: '1px',
              })}
              style={{ color: fill }}
            >
              {n}
            </sup>
          )}
        </span>
      )}
    </span>
  )
})

StaticSuperscript.displayName = 'StaticSuperscript'
export default StaticSuperscript
