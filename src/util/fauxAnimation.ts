import ThoughtId from '../@types/ThoughtId'

/** Options for the ghost drop animation. */
type DropFauxOptions = {
  /** The thought id of the dragged item to clone. */
  fromThoughtId: ThoughtId
  /** Destination rectangle (in viewport coordinates) to animate to. */
  toRect: DOMRect
  /** Duration in ms. */
  duration?: number
  /** Optional z-index for the ghost. */
  zIndex?: number
}

/**
 * Clones the dragged thought DOM node and animates it to the destination rect.
 * Used when dropping into a collapsed destination where the original node unmounts immediately.
 *
 * Best-effort; silently aborts if DOM nodes cannot be found.
 */
const startDropFauxAnimation = ({ fromThoughtId, toRect, duration = 200, zIndex = 3 }: DropFauxOptions) => {
  // find the source element rendered by TreeNode
  const source = document.querySelector<HTMLElement>(`[aria-label="tree-node"][data-thought-id="${fromThoughtId}"]`)
  if (!source) return

  // clone the rendered element for a visual-only animation
  const clone = source.cloneNode(true) as HTMLElement

  // measure source rect after cloning to avoid reflow on source
  const fromRect = source.getBoundingClientRect()

  // absolute position in the page overlay
  clone.style.position = 'fixed'
  clone.style.pointerEvents = 'none'
  clone.style.margin = '0'
  clone.style.left = `${fromRect.left}px`
  clone.style.top = `${fromRect.top}px`
  clone.style.width = `${fromRect.width}px`
  clone.style.height = `${fromRect.height}px`
  clone.style.zIndex = String(zIndex)
  clone.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out, width ${duration}ms ease-out`

  // place in a top-level overlay container to avoid clipping
  const container = document.body
  container.appendChild(clone)

  // next frame to ensure initial styles are applied
  requestAnimationFrame(() => {
    clone.style.left = `${toRect.left}px`
    clone.style.top = `${toRect.top}px`
    // maintain width; destination may be narrower, but adjusting width slightly improves perceived continuity
    clone.style.width = `${toRect.width}px`

    /** Remove the clone after the animation completes. */
    const remove = () => {
      clone.removeEventListener('transitionend', remove)
      if (clone.parentNode) clone.parentNode.removeChild(clone)
    }
    clone.addEventListener('transitionend', remove)

    // fallback cleanup in case transitionend doesn't fire
    window.setTimeout(remove, duration + 50)
  })
}

export default startDropFauxAnimation
