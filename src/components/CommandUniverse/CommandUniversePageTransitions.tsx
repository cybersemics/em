import { MotionConfigContext, motion, useReducedMotion } from 'motion/react'
import { ReactElement, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import CommandUniverseNavigation from '../../@types/CommandUniverseNavigation'
import commandUniverseMotion from './commandUniverseMotion'

/** The page being shown. */
const settled = { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }

/** Where a surface sits when it is not the page being shown. Zooming in pushes the page you left outward. */
const away = (zoom: 'in' | 'out') => ({
  opacity: 0,
  // Use transform: scale(...) to opt into WAAPI for better animation performance. Motion's scale prop runs on the JS frame loop.
  transform: `scale(${zoom === 'in' ? 2.5 : 0.3})`,
  filter: 'blur(48px)',
})

/** The zoom running between two surfaces, from the moment the active entry changes until the destination arrives. */
interface Transition {
  fromEntryId: string
  toEntryId: string
  type?: 'zoom' | 'none'
  zoom: 'in' | 'out'
  /** Source point as fractions of the page width and height. Null uses the page center. */
  origin: NonNullable<CommandUniverseNavigation['entries'][number]['arrival']>['origin']
}

/**
 * Coordinates retained page surfaces while Redux owns their history. The transition between them is presentation,
 * derived here from the change of active entry and cleared when Motion delivers the destination.
 *
 * Each surface declares where it belongs and Motion moves it there. Because the target is declarative,
 * navigating while a zoom is running simply re-targets: Motion continues from wherever the surface
 * got to rather than restarting, which is what keeps Back usable before the motion finishes.
 */
const CommandUniversePageTransitions = ({ children }: { children: ReactElement[] }) => {
  const { entries, index } = useSelector(state => state.commandUniverseNavigation)
  const isOpen = useSelector(state => !!state.showMobileCommandUniverse)
  const activeEntryId = entries[index].entryId
  const [shownEntryId, setShownEntryId] = useState(activeEntryId)
  const [transition, setTransition] = useState<Transition | null>(null)
  const { transition: motionOptions = commandUniverseMotion } = useContext(MotionConfigContext)
  const reducedMotion = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const focusTargets = useRef(new Map<string, HTMLElement>())
  const pendingFocus = useRef<string | null>(entries[index].arrival?.type === 'none' ? activeEntryId : null)

  // Start a transition during render when the active entry changes. Back reverses the arrival of the entry
  // being left; Forward and a new visit replay the destination's arrival. A reset opens without motion.
  if (activeEntryId !== shownEntryId) {
    const fromIndex = entries.findIndex(entry => entry.entryId === shownEntryId)
    const arrival = fromIndex === -1 ? null : entries[Math.max(fromIndex, index)].arrival
    setShownEntryId(activeEntryId)
    setTransition(
      arrival && {
        fromEntryId: shownEntryId,
        toEntryId: activeEntryId,
        zoom: fromIndex > index ? (arrival.zoom === 'in' ? 'out' : 'in') : arrival.zoom,
        origin: arrival.origin,
        type: arrival.type,
      },
    )
  }

  // The cell records its origin before navigation mounts another page, avoiding a layout read during the zoom.
  const transformOrigin = transition?.origin ? `${transition.origin.x * 100}% ${transition.origin.y * 100}%` : 'center'


  const duration = reducedMotion ? 0 : (motionOptions.duration ?? commandUniverseMotion.duration)
  const ease = motionOptions.ease ?? commandUniverseMotion.ease

  useEffect(() => {
    const retained = new Set(entries.map(entry => entry.entryId))
    focusTargets.current.forEach((_, entryId) => {
      if (!retained.has(entryId)) focusTargets.current.delete(entryId)
    })
  }, [entries])

  /** Restores what the page had focused, or focuses its designated heading, without moving the scroll. */
  const restoreFocus = (entryId: string) => {
    const page = root.current?.querySelector<HTMLElement>(`[data-entry-id="${entryId}"]`)
    if (!page) return
    const saved = focusTargets.current.get(entryId)
    const target =
      saved && page.contains(saved) ? saved : (page.querySelector<HTMLElement>('[data-page-focus]') ?? page)
    target.focus({ preventScroll: true })
  }

  useLayoutEffect(() => {
    if (!isOpen || transition?.type !== 'none') return
    pendingFocus.current = transition.toEntryId
    setTransition(current => (current === transition ? null : current))
  }, [isOpen, transition])

  useLayoutEffect(() => {
    if (!isOpen || transition || !pendingFocus.current) return
    const entryId = pendingFocus.current
    pendingFocus.current = null
    if (entryId === activeEntryId) restoreFocus(entryId)
  }, [activeEntryId, isOpen, transition])

  return (
    <div
      ref={root}
      className={css({ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' })}
    >
      {children.map(child => {
        const entryId = String(child.key)
        const entryIndex = entries.findIndex(entry => entry.entryId === entryId)
        const active = entryId === activeEntryId
        const entering = !!transition && transition.toEntryId === entryId
        const exiting = !!transition && transition.fromEntryId === entryId
        const moving = isOpen && transition?.type !== 'none' && (entering || exiting)
        // Keep a retained surface at the endpoint of its nearest history edge. Back and Forward then animate
        // it from the same pose where the previous transition left it, even after that transition clears.
        const parkedTarget =
          entryIndex < index
            ? away(entries[entryIndex + 1].arrival!.zoom)
            : entryIndex > index
              ? away(entries[entryIndex].arrival!.zoom === 'in' ? 'out' : 'in')
              : settled
        const target = entering || (!transition && active) ? settled : exiting ? away(transition.zoom) : parkedTarget
        return (
          <motion.div
            key={entryId}
            data-entry-id={entryId}
            // A surface only ever mounts as the destination of a new history entry, so it starts where that zoom
            // comes from.
            initial={entering && transition.type !== 'none' ? away(transition.zoom === 'in' ? 'out' : 'in') : target}
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
            // closes over that navigation's transition, which no longer matches and so clears nothing.
            onAnimationComplete={
              entering && transition.type !== 'none'
                ? () => {
                    if (!isOpen) return
                    // Commit the navigation before focusing: until the transition clears, every page is inert and
                    // a focus call inside one is ignored.
                    flushSync(() => setTransition(current => (current === transition ? null : current)))
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
