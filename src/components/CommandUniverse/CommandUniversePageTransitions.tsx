import { MotionConfigContext, motion, useReducedMotion } from 'motion/react'
import { ReactElement, useContext, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { css } from '../../../styled-system/css'
import useCommandUniverseNavigator from '../../hooks/useCommandUniverseNavigator'
import commandUniverseMotion from './commandUniverseMotion'

/** The page being shown. */
const settled = { opacity: 1, scale: 1, filter: 'blur(0px)' }

/** Where a surface sits when it is not the page being shown. Zooming in pushes the page you left outward. */
const away = (zoom: 'in' | 'out') => ({ opacity: 0, scale: zoom === 'in' ? 2.5 : 0.3, filter: 'blur(48px)' })

/** A retained page that no navigation is currently moving. */
const parked = { opacity: 0, scale: 1, filter: 'blur(0px)' }

/**
 * Coordinates retained page surfaces. The router supplies keyed content; the provider owns history.
 *
 * Each surface declares where it belongs and Motion moves it there. Because the target is declarative,
 * navigating while a zoom is running simply re-targets: Motion continues from wherever the surface
 * got to rather than restarting, which is what keeps Back usable before the motion finishes.
 */
const CommandUniversePageTransitions = ({ children }: { children: ReactElement[] }) => {
  const { activeEntryId, isOpen, transition, finishTransition } = useCommandUniverseNavigator()
  const { transition: motionOptions = commandUniverseMotion } = useContext(MotionConfigContext)
  const reducedMotion = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const focusTargets = useRef(new Map<string, HTMLElement>())
  const [transformOrigin, setTransformOrigin] = useState('center')

  // The zoom grows from the tapped cell. The navigator carries that cell's rectangle in viewport
  // coordinates; only the container's own position on screen is missing, and that exists solely after
  // layout. Measure it here and hand the result down as an ordinary style.
  useLayoutEffect(() => {
    if (!root.current || !transition) return
    const rect = root.current.getBoundingClientRect()
    const origin = transition.origin
    const x = origin ? origin.x + origin.width / 2 - rect.x : rect.width / 2
    const y = origin ? origin.y + origin.height / 2 - rect.y : rect.height / 2
    setTransformOrigin(`${x}px ${y}px`)
  }, [transition])

  const duration = reducedMotion ? 0 : (motionOptions.duration ?? commandUniverseMotion.duration)
  const ease = motionOptions.ease ?? commandUniverseMotion.ease

  /** Restores what the page had focused, or focuses its designated heading, without moving the scroll. */
  const restoreFocus = (entryId: string) => {
    const page = root.current?.querySelector<HTMLElement>(`[data-entry-id="${entryId}"]`)
    if (!page) return
    const saved = focusTargets.current.get(entryId)
    const target =
      saved && page.contains(saved) ? saved : (page.querySelector<HTMLElement>('[data-page-focus]') ?? page)
    target.focus({ preventScroll: true })
  }

  return (
    <div
      ref={root}
      className={css({ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' })}
    >
      {children.map(child => {
        const entryId = String(child.key)
        const active = entryId === activeEntryId
        const entering = !!transition && transition.toEntryId === entryId
        const exiting = !!transition && transition.fromEntryId === entryId
        const moving = isOpen && (entering || exiting)
        const target = entering || (!transition && active) ? settled : exiting ? away(transition.zoom) : parked
        return (
          <motion.div
            key={entryId}
            data-entry-id={entryId}
            // A surface only ever mounts as the destination of a new history entry, so it starts where that zoom
            // comes from.
            initial={entering ? away(transition.zoom === 'in' ? 'out' : 'in') : target}
            animate={target}
            transition={
              moving
                ? {
                    duration,
                    ease,
                    // Zooming in, the page you left clears by the midpoint so it does not haze the arriving one.
                    opacity: { duration: exiting && transition.zoom === 'in' ? duration / 2 : duration, ease },
                  }
                : { duration: 0 }
            }
            // The navigation ends when its destination arrives. A completion from an abandoned navigation
            // carries that navigation's id, which the provider rejects.
            onAnimationComplete={
              entering
                ? () => {
                    if (!isOpen) return
                    // Commit the navigation before focusing: until the transition clears, every page is inert and
                    // a focus call inside one is ignored.
                    flushSync(() => finishTransition(transition.id))
                    restoreFocus(entryId)
                  }
                : undefined
            }
            tabIndex={-1}
            inert={!isOpen || !active || !!transition}
            aria-hidden={!active}
            onFocusCapture={event => focusTargets.current.set(entryId, event.target)}
            // Opacity rather than visibility, which descendants can override.
            style={{ visibility: active || moving ? 'visible' : 'hidden', transformOrigin }}
            className={css({
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              outline: 'none',
            })}
          >
            {child}
          </motion.div>
        )
      })}
    </div>
  )
}

export default CommandUniversePageTransitions
