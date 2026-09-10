import { MotionConfigContext, useAnimate, useReducedMotion } from 'motion/react'
import { ReactElement, useContext, useEffect, useLayoutEffect, useRef } from 'react'
import { css } from '../../../styled-system/css'
import useCommandUniverseNavigator from '../../hooks/useCommandUniverseNavigator'
import commandUniverseMotion from './commandUniverseMotion'

/** Coordinates retained page surfaces with Motion. The router supplies keyed content; the provider owns history. */
const CommandUniversePageTransitions = ({ children }: { children: ReactElement[] }) => {
  const { entries, activeEntryId, isOpen, transition, finishTransition } = useCommandUniverseNavigator()
  const { transition: motionOptions = commandUniverseMotion } = useContext(MotionConfigContext)
  const reducedMotion = useReducedMotion()
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const pages = useRef(new Map<string, HTMLDivElement>())
  const focusTargets = useRef(new Map<string, HTMLElement>())
  const previousTransition = useRef(transition)

  useLayoutEffect(() => {
    if (!isOpen || !transition) return
    const entering = pages.current.get(transition.toEntryId)!
    const exiting = pages.current.get(transition.fromEntryId)!
    const rect = scope.current.getBoundingClientRect()
    const origin = transition.origin
    const x = origin ? origin.x + origin.width / 2 - rect.x : rect.width / 2
    const y = origin ? origin.y + origin.height / 2 - rect.y : rect.height / 2
    scope.current.style.setProperty('--page-origin', `${x}px ${y}px`)

    const duration = reducedMotion ? 0 : (motionOptions.duration ?? commandUniverseMotion.duration)
    const ease = motionOptions.ease ?? commandUniverseMotion.ease
    const zoomIn = transition.zoom === 'in'
    let cancelled = false
    const controls = [
      animate(
        entering,
        duration === 0
          ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
          : { opacity: [0, 1], scale: [zoomIn ? 0.3 : 2.5, 1], filter: ['blur(48px)', 'blur(0px)'] },
        { duration, ease },
      ),
      animate(
        exiting,
        duration === 0
          ? { opacity: 0, scale: 1, filter: 'blur(0px)' }
          : zoomIn
            ? { opacity: [1, 0, 0], scale: [1, 1.75, 2.5], filter: ['blur(0px)', 'blur(48px)', 'blur(48px)'] }
            : { opacity: [1, 0], scale: [1, 0.3], filter: ['blur(0px)', 'blur(48px)'] },
        { duration, ease },
      ),
    ]
    // Motion resolves when both surfaces finish. Cleanup and the transition id guard reject stale completions.
    Promise.all(controls).then(() => {
      if (!cancelled) finishTransition(transition.id)
    })
    return () => {
      cancelled = true
      controls.forEach(control => control.stop())
    }
  }, [animate, finishTransition, isOpen, motionOptions, reducedMotion, scope, transition])

  useLayoutEffect(() => {
    const completed = previousTransition.current
    previousTransition.current = transition
    if (!isOpen || transition || !completed || completed.toEntryId !== activeEntryId) return
    const page = pages.current.get(activeEntryId)
    if (!page) return
    const saved = focusTargets.current.get(activeEntryId)
    const target =
      saved && page.contains(saved) ? saved : (page.querySelector<HTMLElement>('[data-page-focus]') ?? page)
    target.focus({ preventScroll: true })
  }, [activeEntryId, isOpen, transition])

  useEffect(() => {
    const retained = new Set(entries.map(entry => entry.entryId))
    focusTargets.current.forEach((_, entryId) => {
      if (!retained.has(entryId)) focusTargets.current.delete(entryId)
    })
  }, [entries])

  return (
    <div
      ref={scope}
      className={css({ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' })}
    >
      {children.map(child => {
        const entryId = String(child.key)
        const active = entryId === activeEntryId
        const animating = isOpen && (transition?.toEntryId === entryId || transition?.fromEntryId === entryId)
        return (
          <div
            key={entryId}
            ref={element => {
              if (element) pages.current.set(entryId, element)
              else pages.current.delete(entryId)
            }}
            data-testid={active ? 'active-page' : 'inactive-page'}
            tabIndex={-1}
            inert={!isOpen || !active || !!transition}
            aria-hidden={!active}
            onFocusCapture={event => focusTargets.current.set(entryId, event.target)}
            className={css({
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              outline: 'none',
              transformOrigin: 'var(--page-origin, center)',
            })}
            // Whole-page opacity also hides descendants that explicitly override visibility.
            style={{
              visibility: active || animating ? 'visible' : 'hidden',
              opacity: animating && transition?.toEntryId === entryId ? 0 : active || animating ? 1 : 0,
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

export default CommandUniversePageTransitions
