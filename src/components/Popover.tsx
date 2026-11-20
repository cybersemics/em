import React, { FC, useLayoutEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { isTouch } from '../browser'
import useWindowOverflow from '../hooks/useWindowOverflow'
import FadeTransition from './FadeTransition'
import TriangleDown from './TriangleDown'

interface PopoverProps {
  ariaLabel?: string
  children: React.ReactNode
  show?: boolean
  size?: number
}

/** A reusable popover component that handles positioning and styling for popup menus. */
const Popover: FC<PopoverProps> = ({ ariaLabel, children, show, size = 18 }) => {
  const ref = useRef<HTMLDivElement>(null)
  const fontSize = useSelector(state => state.fontSize)
  const overflow = useWindowOverflow(ref)

  // eyeballing it to get font sizes 14–24 to look right
  const left = (size * (size + 90)) / 200 + 600 / (size * size)
  const marginTop = size * 1.2 - 10

  // Keep the picker in the native scroller, but clip the empty band beside it so thoughts remain interactive.
  useLayoutEffect(() => {
    const content = ref.current?.firstElementChild
    const toolbar = ref.current?.closest<HTMLElement>('#toolbar')
    if (!show || !content || !toolbar || toolbar.dataset.scrollAtEdge === 'true') return

    /** Measures the clip once on open/resize; scrolling only updates its CSS variable. */
    const measure = () => {
      const rect = content.getBoundingClientRect()
      const origin = toolbar.getBoundingClientRect()
      const left = `calc(${rect.left - origin.left + toolbar.scrollLeft}px - var(--toolbar-scroll-left))`
      const right = `calc(${rect.right - origin.left + toolbar.scrollLeft}px - var(--toolbar-scroll-left))`
      const row = fontSize + 30
      const bottom = rect.bottom - origin.top
      toolbar.style.setProperty('--toolbar-scroll-left', `${toolbar.scrollLeft}px`)
      toolbar.style.clipPath = `polygon(0 0, 100% 0, 100% ${row}px, ${right} ${row}px, ${right} ${bottom}px, ${left} ${bottom}px, ${left} ${row}px, 0 ${row}px)`
    }
    measure()
    window.addEventListener('resize', measure)
    return () => {
      toolbar.style.clipPath = ''
      window.removeEventListener('resize', measure)
    }
  }, [show, size, fontSize])

  /** Stops a tap that lands on the popover's padding rather than one of its options from reaching the toolbar button that renders the popover, which would otherwise close it (#4264). */
  const containTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    // nodeRef avoids FadeTransition's wrapper span, which would make this div a block-in-inline. WebKit relayouts that
    // case inconsistently, applying marginTop above the line box and shifting the whole toolbar button down (#4263).
    <FadeTransition type='fast' in={show} exit={false} unmountOnExit nodeRef={ref}>
      <div
        ref={ref}
        className={css({
          position: 'relative',
          zIndex: 'stack',
          // the width is 0 so that the content can be centered under the anchor with translate(-50%)
          width: 0,
        })}
        style={{ left, marginTop }}
      >
        <div
          aria-label={ariaLabel}
          onClick={isTouch ? undefined : containTap}
          onTouchEnd={isTouch ? containTap : undefined}
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
            // the triangle is full width and overlaps the top of the popover's content, so it must not intercept taps aimed at the options underneath it (#4264)
            className={css({ pointerEvents: 'none', position: 'absolute', width: '100%' })}
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
