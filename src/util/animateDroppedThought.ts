import { token } from '../../styled-system/tokens'
import durations from '../util/durations'

/** Options for the dropped thought clone animation. */
type AnimateDroppedThoughtOptions = {
  /** Hashed path of the dragged item to clone (from hashPath). */
  fromPath: string
  /** Destination rectangle (in viewport coordinates) to animate to. */
  toRect: DOMRect
  /** Hashed path of the destination to track during animation (for handling layout shifts). */
  toPath?: string
}

/**
 * Clones the dragged thought DOM node and animates it to the destination rect.
 * Used when dropping into a collapsed destination where the original node unmounts immediately.
 *
 * Tracks the destination element's position during animation to handle layout shifts smoothly.
 * As the destination thought moves (e.g., shifts up when a thought above it is removed),
 * the clone adjusts its trajectory to follow the moving target.
 *
 * Best-effort; silently aborts if DOM nodes cannot be found.
 */
const animateDroppedThought = ({ fromPath, toRect, toPath }: AnimateDroppedThoughtOptions) => {
  const duration = durations.get('fast')
  const zIndex = token('zIndex.cloneDroppedThought')
  if (!zIndex) return

  // find the source element rendered by TreeNode using unique path
  const source = document.querySelector<HTMLElement>(`[aria-label="tree-node"][data-path="${fromPath}"]`)
  if (!source) return

  // find the destination element to track during animation using unique path
  let destinationEl: HTMLElement | null = null
  if (toPath) {
    destinationEl = document.querySelector<HTMLElement>(`[aria-label="tree-node"][data-path="${toPath}"]`)
  }

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
  // add 1em indent to make it clear the thought is becoming a subthought
  const computedStyle = window.getComputedStyle(source)
  const fontSize = parseFloat(computedStyle.fontSize)
  const indentOffset = fontSize // 1em

  const dx = toRect.left - fromRect.left + indentOffset
  const dy = toRect.top - fromRect.top
  clone.style.setProperty('--clone-dx', `${dx}px`)
  clone.style.setProperty('--clone-dy', `${dy}px`)

  // apply combined translate + fade/scale animation
  clone.style.animationName = 'cloneDragToCollapsed'
  clone.style.animationDuration = `${duration}ms`
  clone.style.animationTimingFunction = 'ease-out'
  clone.style.animationFillMode = 'forwards'

  // place in a top-level overlay container to avoid clipping
  const container = document.body
  container.appendChild(clone)

  // Track destination position during animation to handle layout shifts.
  // This makes the clone smoothly follow the destination as it moves.
  let animationActive = true
  let lastDx = dx
  let lastDy = dy

  /** Update the clone's position during animation to follow the destination as it moves. */
  const updateTarget = () => {
    if (!animationActive || !destinationEl) return

    const currentDestRect = destinationEl.getBoundingClientRect()
    const newDx = currentDestRect.left - fromRect.left
    const newDy = currentDestRect.top - fromRect.top

    // Only update if position actually changed to avoid unnecessary style recalcs
    if (newDx !== lastDx || newDy !== lastDy) {
      clone.style.setProperty('--clone-dx', `${newDx}px`)
      clone.style.setProperty('--clone-dy', `${newDy}px`)
      lastDx = newDx
      lastDy = newDy
    }

    requestAnimationFrame(updateTarget)
  }

  // next frame to ensure initial styles are applied
  requestAnimationFrame(() => {
    // width adjustment to better match destination width
    clone.style.width = `${toRect.width}px`

    // start tracking destination position
    if (destinationEl) {
      requestAnimationFrame(updateTarget)
    }

    /** Remove the clone after the animation completes or is cancelled. */
    const remove = () => {
      animationActive = false
      clone.removeEventListener('animationend', remove)
      clone.removeEventListener('animationcancel', remove)
      if (clone.parentNode) clone.parentNode.removeChild(clone)
    }
    clone.addEventListener('animationend', remove)
    clone.addEventListener('animationcancel', remove)
  })
}

export default animateDroppedThought
