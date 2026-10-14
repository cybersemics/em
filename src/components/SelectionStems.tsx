import { useEffect, useRef } from 'react'
import { css } from '../../styled-system/css'
import * as selection from '../device/selection'

const stemClassName = css({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '2px',
  height: '1px',
  backgroundColor: 'selectionHandle',
  pointerEvents: 'none',
  transformOrigin: 'top left',
  // keeps the stem on its own layer so that moving it never forces a layout
  transform: 'translate(0, 0)',
  zIndex: 'thoughtAnnotationLink',
  opacity: 0,
})

/** Draws iOS-style stems at the start and end of a text selection in a thought or note. Android draws only its teardrop handles, so without stems a selection on the dark theme's translucent highlight is hard to see. The stems are positioned in document coordinates so that the page scroll moves them without an update. */
const SelectionStems = () => {
  const startRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // coalesces every selectionchange and resize in a frame into a single read and write
    const frame = { id: 0 }

    /** Measures the selection and moves the stems to its edges, or hides them when there is no selection in an editable. */
    const update = () => {
      frame.id = 0
      const start = startRef.current
      const end = endRef.current
      if (!start || !end) return

      const rects = selection.editableClientRects()
      const first = rects[0]
      const last = rects[rects.length - 1]

      if (!first || !last) {
        start.style.opacity = '0'
        end.style.opacity = '0'
        return
      }

      // the 2px stem is centered on the edge of the highlight
      start.style.transform = `translate(${first.left + window.scrollX - 1}px, ${first.top + window.scrollY}px) scaleY(${first.height})`
      end.style.transform = `translate(${last.right + window.scrollX - 1}px, ${last.top + window.scrollY}px) scaleY(${last.height})`
      start.style.opacity = '1'
      end.style.opacity = '1'
    }

    /** Schedules an update for the next frame. */
    const schedule = () => {
      if (!frame.id) frame.id = requestAnimationFrame(update)
    }

    document.addEventListener('selectionchange', schedule)
    window.addEventListener('resize', schedule)
    return () => {
      document.removeEventListener('selectionchange', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame.id)
    }
  }, [])

  return (
    <>
      <div ref={startRef} className={stemClassName} aria-hidden />
      <div ref={endRef} className={stemClassName} aria-hidden />
    </>
  )
}

export default SelectionStems
