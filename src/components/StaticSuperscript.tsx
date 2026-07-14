import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import getThoughtFill from '../selectors/getThoughtFill'
import getCommandState from '../util/getCommandState'

/** Gets inline styles that should apply to a superscript when the entire thought is bold or italic. */
const getThoughtFormattingStyle = (value: string): React.CSSProperties | undefined => {
  const commandState = getCommandState(value)

  const style: React.CSSProperties = {
    ...(commandState.bold ? { fontWeight: 600 } : null),
    ...(commandState.italic ? { fontStyle: 'italic' } : null),
  }

  return Object.keys(style).length > 0 ? style : undefined
}

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
  const isVisible = !!(show && (n || !hideZero))
  const fill = useSelector(state =>
    // make sure fill is only calculated if the superscript is shown, since getThoughtFill is expensive
    isVisible && thoughtId ? getThoughtFill(state, thoughtId) : undefined,
  )
  const formattingStyle = useSelector(state => {
    if (!isVisible || !thoughtId) return undefined
    const thought = getThoughtById(state, thoughtId)
    return thought ? getThoughtFormattingStyle(thought.value) : undefined
  }, shallowEqual)

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
                top: '-2px',
                left: '1px',
              })}
              style={{ ...formattingStyle, color: fill }}
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
