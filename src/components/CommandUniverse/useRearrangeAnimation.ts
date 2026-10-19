import { AnimationPlaybackControls, animate, useReducedMotion } from 'motion/react'
import { RefObject, useLayoutEffect, useRef } from 'react'
import durations from '../../util/durations'
import commandUniverseMotion from './commandUniverseMotion'

/**
 * How far below the fold, as a fraction of the viewport's height, the lowest cell coming into view starts from.
 *
 * The cells coming into view rise in the order of the slots they are heading for, not the order they were in before. They were out of view, so their old row means nothing to the user, and starting them from it sends their paths across each other. Instead each starts below the fold at a distance that grows with how far down its slot is, compressed toward this limit. Each keeps only its old column, so a cell that changes column rises diagonally, and since the higher slots travel further, the cells arrive staggered rather than as one sheet.
 */
const MAX_OFFSCREEN_START = 0.5

/** A grid cell or section header that was in view when the layout was captured. */
interface CapturedCell {
  rect: DOMRect
  /** The cell's opacity at capture, which is less than 1 if it was caught partway through fading in. */
  opacity: number
  /** The cell's ghost: a static copy that animates out in its place if the cell is no longer in view afterwards. */
  ghost: HTMLElement
}

/** Returns every cell and section header in the grid, keyed by `data-rearrange-key`, with its position and whether it is at least partly within the scroller's viewport. */
const measureCells = (scroller: HTMLElement): Map<string, { element: HTMLElement; rect: DOMRect; inView: boolean }> => {
  const viewport = scroller.getBoundingClientRect()
  return new Map(
    [...scroller.querySelectorAll<HTMLElement>('[data-rearrange-key]')].map(element => {
      const rect = element.getBoundingClientRect()
      return [
        element.dataset.rearrangeKey!,
        { element, rect, inView: rect.bottom > viewport.top && rect.top < viewport.bottom },
      ]
    }),
  )
}

/** Compresses a distance so that it never exceeds MAX_OFFSCREEN_START of the viewport's height, while preserving order: a greater distance always compresses to a greater one. */
const compressOffscreen = (distance: number, viewportHeight: number) =>
  MAX_OFFSCREEN_START * viewportHeight * (1 - Math.exp(-distance / (MAX_OFFSCREEN_START * viewportHeight)))

/**
 * Animates the grid rearranging itself when the sort order or search changes, in place of a crossfade of the whole page. A change always returns the grid to the top, so anything that newly comes into view arrives from below. Each cell in view takes one of three animations, all started together:
 *
 * - A cell in view before and after translates from its old position to its new one.
 * - A cell in view before but not after slides down toward its new slot below the fold, leaving through the bottom of the view, which clips it. Like the cells arriving, it travels a compressed distance (see MAX_OFFSCREEN_START), so one heading far down the list does not shoot off. A cell that is no longer in the list at all, or a section header, fades out where it was instead, in half the time, so that it has cleared its slot before the cell taking it arrives.
 * - A cell in view after but not before rises from below the fold and fades in. It starts in the column it held in the old layout, so a cell that changes column arrives diagonally, and a cell with no old position rises straight up its new column. The cells rise in the order of their new slots (see MAX_OFFSCREEN_START).
 *
 * Section headers rearrange the same way, except that a header coming into view fades in slowly without sliding, so the cells moving carry the change and the headers follow quietly.
 *
 * Call `capture` immediately before the state change, while the old layout is still on screen. The animation runs once `layoutKey` changes and React has committed the new layout.
 *
 * Motion's own layout animations (the `layout` prop) would be the obvious way to do this, but they do not fit. They animate every cell in the list rather than only those in view, and they move each cell the full distance between its old and new slots, whereas here a cell leaving travels only a compressed distance below the fold, and a cell arriving starts just below it rather than from its old row. So the hook measures the cells itself, before and after, and animates the difference.
 *
 * A cell that leaves the view cannot animate its own element. Its slide ends at a compressed point just below the fold, but its element has to stay in its new slot, often far further down the list, and a cell removed from the list has no element at all. Instead `capture` clones each cell in view into a ghost, and the ghost of each cell that left animates out in its place, in the ghost layer over the page.
 *
 * A change that arrives while a rearrangement is still running interrupts it: `capture` measures the cells mid-flight, then cancels the running animations and clears the ghost layer, so the next rearrangement starts every cell from wherever it had got to.
 */
const useRearrangeAnimation = ({
  scrollRef,
  ghostLayerRef,
  layoutKey,
}: {
  /** The scroller that the grid lives in. Only cells within its viewport animate. */
  scrollRef: RefObject<HTMLDivElement | null>
  /** An empty, absolutely positioned element over the page, which holds the ghosts of cells that left the view while they animate out. */
  ghostLayerRef: RefObject<HTMLDivElement | null>
  /** Changes whenever the rendered layout changes. */
  layoutKey: unknown
}) => {
  const reduceMotion = useReducedMotion()
  /** The cells in view at the last capture, keyed by `data-rearrange-key`. Null when nothing has been captured since the last rearrangement, so a render that is not a sort or search change does not animate. */
  const capturedRef = useRef<Map<string, CapturedCell> | null>(null)
  /** The left edge of every cell at capture, including those out of view, so that a cell coming into view can start from the column it held in the old layout. */
  const capturedLeftRef = useRef<Map<string, number>>(new Map())
  /** The animations of the rearrangement in progress, so that the next capture can cancel them. */
  const animationsRef = useRef<AnimationPlaybackControls[]>([])

  /** Records where each cell in view is, so that the next layout can animate from it. */
  const capture = () => {
    const scroller = scrollRef.current
    if (!scroller) return

    // Measure before cancelling a rearrangement that is still running, so that its cells start again from wherever they had got to.
    const cells = measureCells(scroller)
    capturedLeftRef.current = new Map([...cells].map(([key, { rect }]) => [key, rect.left]))
    capturedRef.current = new Map(
      [...cells]
        .filter(([, { inView }]) => inView)
        .map(([key, { element, rect }]) => {
          const style = window.getComputedStyle(element)
          const ghost = element.cloneNode(true) as HTMLElement
          ghost.setAttribute('aria-hidden', 'true')
          // The ghost is not one of the cells, so it must not be mistaken for one.
          ghost.removeAttribute('data-rearrange-key')
          ghost.inert = true
          // The ghost is taken out of the grid, so it needs its own box and the font size it inherited there.
          Object.assign(ghost.style, {
            position: 'absolute',
            display: 'block',
            margin: '0',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            fontSize: style.fontSize,
          })
          return [key, { rect, opacity: Number(style.opacity), ghost }]
        }),
    )

    animationsRef.current.forEach(animation => animation.cancel())
    animationsRef.current = []
    ghostLayerRef.current?.replaceChildren()
  }

  useLayoutEffect(() => {
    const before = capturedRef.current
    const beforeLeft = capturedLeftRef.current
    const scroller = scrollRef.current
    const ghostLayer = ghostLayerRef.current
    capturedRef.current = null
    if (!before || !scroller || !ghostLayer) return

    // Scroll position is meaningless in a different order, so every change starts again from the top.
    scroller.scrollTop = 0
    if (reduceMotion) return

    const cells = measureCells(scroller)
    const viewport = scroller.getBoundingClientRect()
    const layerRect = ghostLayer.getBoundingClientRect()
    const transition = { duration: durations.get('commandUniverseRearrange') / 1000, ease: commandUniverseMotion.ease }

    /** Animates a cell coming into view, rising from below the fold. */
    const animateArrival = (key: string, element: HTMLElement, rect: DOMRect) => {
      // Horizontal offset to the column the cell held in the old layout, or none if it had no old position.
      const startX = (beforeLeft.get(key) ?? rect.left) - rect.left
      // Vertical offset to a start below the fold, further down the lower the cell's new slot is (see MAX_OFFSCREEN_START).
      const startY = viewport.bottom + compressOffscreen(rect.top - viewport.top, viewport.height) - rect.top
      return animate(
        element,
        { transform: [`translate(${startX}px, ${startY}px)`, 'translate(0px, 0px)'], opacity: [0, 1] },
        transition,
      )
    }

    const moves = [...cells]
      .filter(([, { inView }]) => inView)
      .map(([key, { element, rect }]) => {
        const previous = before.get(key)
        return previous
          ? animate(
              element,
              {
                transform: [
                  `translate(${previous.rect.left - rect.left}px, ${previous.rect.top - rect.top}px)`,
                  'translate(0px, 0px)',
                ],
                opacity: [previous.opacity, 1],
              },
              transition,
            )
          : key.startsWith('section:')
            ? animate(element, { opacity: [0, 1] }, { ...transition, duration: durations.get('slow') / 1000 })
            : animateArrival(key, element, rect)
      })

    // Clip the ghosts to the scroller's viewport, which a cell that was only partly in view would otherwise overhang.
    Object.assign(ghostLayer.style, {
      clipPath: `inset(${viewport.top - layerRect.top}px ${layerRect.right - viewport.right}px ${layerRect.bottom - viewport.bottom}px ${viewport.left - layerRect.left}px)`,
    })
    /** Animates the ghost of a cell leaving the view, sliding down toward its new slot below the fold. */
    const animateDeparture = (ghost: HTMLElement, rect: DOMRect, next: DOMRect) => {
      // Horizontal offset to the cell's column in the new layout.
      const endX = next.left - rect.left
      // Vertical offset to an end below the fold, further down the further below the view the new slot is, compressed so that a cell heading far down the list does not shoot off.
      const endY = viewport.bottom + compressOffscreen(next.top - viewport.bottom, viewport.height) - rect.top
      return animate(ghost, { transform: ['translate(0px, 0px)', `translate(${endX}px, ${endY}px)`] }, transition)
    }

    const departures = [...before]
      .filter(([key]) => !cells.get(key)?.inView)
      .map(([key, { rect, opacity, ghost }]) => {
        // The ghost was placed in viewport coordinates when it was captured. Make them relative to the layer that holds it.
        ghost.style.left = `${parseFloat(ghost.style.left) - layerRect.left}px`
        ghost.style.top = `${parseFloat(ghost.style.top) - layerRect.top}px`
        ghostLayer.appendChild(ghost)
        // The cell's position in the new layout, which it slides toward. Undefined for a section header and for a cell no longer in the list, which fade out where they were instead.
        const next = key.startsWith('section:') ? undefined : cells.get(key)?.rect
        const animation = next
          ? animateDeparture(ghost, rect, next)
          : // Half the time of the others, so that a cell leaving has cleared its slot before the one taking it arrives, rather than the two crossfading.
            animate(ghost, { opacity: [opacity, 0] }, { ...transition, duration: transition.duration / 2 })
        animation.then(() => ghost.remove())
        return animation
      })

    animationsRef.current = [...moves, ...departures]
    // Runs only when the layout changes. The other values are refs and settings read at the time, and re-running on them would animate a layout that has not changed.
  }, [layoutKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return capture
}

export default useRearrangeAnimation
