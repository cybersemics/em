import React, { CSSProperties } from 'react'
import { DragElementWrapper } from 'react-dnd'

export interface DropEndProps {
    innerRef: DragElementWrapper<any>,
    dropStyle?: CSSProperties,
    indicatorStyle?: CSSProperties,
    showIndicator: boolean,
    color?: string,
}

/**
 * Drop End component.
 */
const DropEnd = ({ innerRef, dropStyle, indicatorStyle, showIndicator, color }: DropEndProps) => {
  return (
    <div
      ref={innerRef}
      style={{
        position: 'absolute',
        transform: 'translateX(0.4rem)',
        height: '1.2rem',
        width: 'calc(100% - 0.4rem)',
        ...dropStyle,
      }}
    >
      {
        showIndicator &&
          <div
            style={{
              position: 'initial',
              background: color,
              ...indicatorStyle,
            }}
            className='drop-hover-new'>
          </div>
      }
    </div>
  )
}

export default DropEnd
