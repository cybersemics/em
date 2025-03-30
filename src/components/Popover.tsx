import React, { FC, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import useWindowOverflow from '../hooks/useWindowOverflow'
import FadeTransition from './FadeTransition'
import TriangleDown from './TriangleDown'

interface PopoverProps {
  children: React.ReactNode
  show?: boolean
  size?: number
}

/** A reusable popover component that handles positioning and styling for popup menus. */
const Popover: FC<PopoverProps> = ({ children, show, size = 18 }) => {
  const ref = useRef<HTMLDivElement>(null)
  const fontSize = useSelector(state => state.fontSize)
  const overflow = useWindowOverflow(ref)

  return (
    <FadeTransition duration='fast' nodeRef={ref} in={show} exit={false} unmountOnExit>
      <div
        ref={ref}
        className={css({
          position: 'relative',
          zIndex: 'stack',
          // position fixed or absolute causes the ColorPicker to get clipped by the toolbar's overflow-x: scroll
          // ideally we want overflow-x:scroll and overflow-y:visible, but Safari does not differing allow overflow-x and overflow-y
          // instead, keep position:static but set the width to 0
          // this will increase the height of the toolbar so the ColorPicker does not get clipped without taking up horizontal space
          width: 0,
        })}
        style={{
          // eyeballing it to get font sizes 14–24 to look right
          left: (size * (size + 90)) / 200 + 600 / (size * size),
          marginTop: size * 1.2 - 10,
        }}
      >
        <div
          className={css({
            backgroundColor: 'pickerBg',
            borderRadius: '3',
            display: 'inline-block',
            padding: '0.2em 0.25em 0.25em',
            position: 'relative',
            transform: 'translate(-50%)',
            userSelect: 'none',
          })}
        >
          <TriangleDown
            fill={token('colors.fgOverlay90')}
            size={fontSize}
            cssRaw={{ position: 'absolute', width: '100%' }}
            style={{
              ...(overflow.left ? { left: -overflow.left } : { right: -overflow.right }),
              top: -fontSize / 2,
            }}
          />
          {children}
        </div>
      </div>
    </FadeTransition>
  )
}

export default Popover
