import { ReactElement, useEffect, useLayoutEffect, useRef } from 'react'
import { css } from '../../../styled-system/css'
import useCommandUniverseNavigator from '../../hooks/useCommandUniverseNavigator'

/** Coordinates retained page surfaces. The router supplies keyed content; the provider owns history. */
const CommandUniversePageTransitions = ({ children }: { children: ReactElement[] }) => {
  const { entries, activeEntryId, isOpen } = useCommandUniverseNavigator()
  const pages = useRef(new Map<string, HTMLDivElement>())
  const focusTargets = useRef(new Map<string, HTMLElement>())
  const previousActiveEntryId = useRef(activeEntryId)

  useLayoutEffect(() => {
    const previous = previousActiveEntryId.current
    previousActiveEntryId.current = activeEntryId
    if (!isOpen || previous === activeEntryId) return
    const page = pages.current.get(activeEntryId)
    if (!page) return
    const saved = focusTargets.current.get(activeEntryId)
    const target =
      saved && page.contains(saved) ? saved : (page.querySelector<HTMLElement>('[data-page-focus]') ?? page)
    target.focus({ preventScroll: true })
  }, [activeEntryId, isOpen])

  useEffect(() => {
    const retained = new Set(entries.map(entry => entry.entryId))
    focusTargets.current.forEach((_, entryId) => {
      if (!retained.has(entryId)) focusTargets.current.delete(entryId)
    })
  }, [entries])

  return (
    <div className={css({ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' })}>
      {children.map(child => {
        const entryId = String(child.key)
        const active = entryId === activeEntryId
        return (
          <div
            key={entryId}
            ref={element => {
              if (element) pages.current.set(entryId, element)
              else pages.current.delete(entryId)
            }}
            data-testid={active ? 'active-page' : 'inactive-page'}
            tabIndex={-1}
            inert={!isOpen || !active}
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
            })}
            // Whole-page opacity also hides descendants that explicitly override visibility.
            style={{ visibility: active ? 'visible' : 'hidden', opacity: active ? 1 : 0 }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

export default CommandUniversePageTransitions
