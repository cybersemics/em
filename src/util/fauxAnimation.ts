import ThoughtId from '../@types/ThoughtId'

/** Options for the faux drop animation. */
type DropFauxOptions = {
  /** The thought id of the dragged item to clone. */
  fromThoughtId: ThoughtId
  /** Destination rectangle (in viewport coordinates) to animate to. */
  toRect: DOMRect
  /** Duration in ms. */
  duration?: number
  /** Optional z-index for the faux clone. */
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
  // drive translate distances with CSS variables to use keyframes
  const dx = toRect.left - fromRect.left
  const dy = toRect.top - fromRect.top
  clone.style.setProperty('--faux-dx', `${dx}px`)
  clone.style.setProperty('--faux-dy', `${dy}px`)
  // apply combined translate + fade/scale animation
  clone.style.animationName = 'fauxDragToCollapsed'
  clone.style.animationDuration = `${duration}ms`
  clone.style.animationTimingFunction = 'ease-out'
  clone.style.animationFillMode = 'forwards'

  // place in a top-level overlay container to avoid clipping
  const container = document.body
  container.appendChild(clone)

  // next frame to ensure initial styles are applied
  requestAnimationFrame(() => {
    // width adjustment to better match destination width
    clone.style.width = `${toRect.width}px`

    /** Remove the clone after the animation completes. */
    const remove = () => {
      clone.removeEventListener('animationend', remove)
      if (clone.parentNode) clone.parentNode.removeChild(clone)
    }
    clone.addEventListener('animationend', remove)

    // fallback cleanup in case animationend doesn't fire
    window.setTimeout(remove, duration + 50)
  })
}

export default startDropFauxAnimation
