import React, { FC, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

/**
 * A reusable popover component that handles positioning and styling for popup menus.
 *
 * In the toolbar, the popover is portaled into the toolbar's dropdown layer, outside the horizontally scrolling #toolbar. Rendered inside the scroller, it would either be clipped by overflow-x: scroll, or, kept in flow, stretch the scroller's box down across the thoughts beside it, where it swallows taps and gestures (#5977). It is positioned at an anchor that stays in the toolbar button, and follows the anchor as the toolbar scrolls. Outside a toolbar, e.g. when a picker is rendered on its own, it renders in place.
 */
const Popover: FC<PopoverProps> = ({ ariaLabel, children, show, size = 18 }) => {
  const anchorRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const fontSize = useSelector(state => state.fontSize)
  const overflow = useWindowOverflow(ref)
  const [layer, setLayer] = useState<HTMLElement | null>(null)

  // eyeballing it to get font sizes 14–24 to look right
  const left = (size * (size + 90)) / 200 + 600 / (size * size)
  const marginTop = size * 1.2 - 10

  useLayoutEffect(() => {
    setLayer(
      anchorRef.current?.closest('[aria-label="toolbar"]')?.querySelector<HTMLElement>('[data-toolbar-dropdowns]') ??
        null,
    )
  }, [])

  // Measure once when the popover opens, and again on resize, rather than on every scroll. While it is open, the
  // popover follows the toolbar's scroll with a transform, which only the compositor has to handle.
  // The position is written to the element rather than kept in state, so that it is in place before any passive effect
  // reads it, such as the Toolbar's, which scrolls an open Color Picker into view.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const scroller = anchor?.closest<HTMLElement>('#toolbar')
    if (!show || !layer || !anchor || !scroller) return

    let scrollLeftAtMeasure = 0

    /** Positions the popover at the anchor, relative to the dropdown layer. */
    const measure = () => {
      const el = ref.current
      if (!el) return
      const anchorRect = anchor.getBoundingClientRect()
      const layerRect = layer.getBoundingClientRect()
      scrollLeftAtMeasure = scroller.scrollLeft
      el.style.left = `${anchorRect.left - layerRect.left + left}px`
      el.style.top = `${anchorRect.top - layerRect.top + marginTop}px`
      el.style.transform = ''
    }

    /** Moves the popover with its toolbar button as the toolbar scrolls. */
    const followScroll = () => {
      if (ref.current) ref.current.style.transform = `translateX(${scrollLeftAtMeasure - scroller.scrollLeft}px)`
    }

    measure()
    scroller.addEventListener('scroll', followScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      scroller.removeEventListener('scroll', followScroll)
      window.removeEventListener('resize', measure)
    }
  }, [show, layer, left, marginTop])

  /** Stops a tap that lands on the popover's padding rather than one of its options from reaching the toolbar button that renders the popover, which would otherwise close it (#4264). */
  const containTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  const popover = (
    // nodeRef avoids FadeTransition's wrapper span, which would make this div a block-in-inline. WebKit relayouts that
    // case inconsistently, applying marginTop above the line box and shifting the whole toolbar button down (#4263).
    <FadeTransition type='fast' in={show} exit={false} unmountOnExit nodeRef={ref}>
      <div
        ref={ref}
        className={css({
          position: layer ? 'absolute' : 'relative',
          zIndex: 'stack',
          // keep a do-nothing transform, so that following the toolbar's scroll only has to change its value
          transform: 'translateX(0)',
          // the width is 0 so that the content can be centered under the anchor with translate(-50%)
          width: 0,
        })}
        // in the dropdown layer, left and top are set when the popover is measured
        style={layer ? undefined : { left, marginTop }}
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

  return (
    <>
      {/* Marks where the popover opens: absolutely positioned without an offset, it sits at the static position the popover would have in flow, below the icon, without taking up any space. */}
      <div ref={anchorRef} className={css({ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' })} />
      {layer ? createPortal(popover, layer) : popover}
    </>
  )
}

export default Popover
