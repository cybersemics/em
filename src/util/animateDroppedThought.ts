import { token } from '../../styled-system/tokens'
import durations from '../util/durations'

/** Options for the dropped thought clone animation. */
type AnimateDroppedThoughtOptions = {
  /** Hashed path of the dragged item to clone (from hashPath). */
  fromPath: string
  /** Hashed path of the destination to animate to and track during animation (for handling layout shifts). */
  toPath: string
}

/**
 * Clones the dragged thought DOM node and animates it to the destination thought.
 * Used when dropping into a collapsed destination where the original node unmounts immediately.
 *
 * Captures source position before unmount, waits for layout to settle, then animates
 * to the destination's final position. Uses CSS left/top properties directly.
 *
 * Best-effort; silently aborts if DOM nodes cannot be found.
 */
const animateDroppedThought = ({ fromPath, toPath }: AnimateDroppedThoughtOptions) => {
  const duration = durations.get('fast')
  const zIndex = token('zIndex.cloneDroppedThought')
  if (!zIndex) return

  // find and clone the source element immediately before it unmounts
  const source = document.querySelector<HTMLElement>(`[data-path="${fromPath}"]`)
  if (!source) return

  // capture source position from its CSS properties
  const sourceLeft = parseFloat(source.style.left) || 0
  const sourceTop = parseFloat(source.style.top) || 0

  const clone = source.cloneNode(true) as HTMLElement
  const sourceParent = source.parentElement
  if (!sourceParent) return

  // wait for DOM update and layout shift before measuring destination
  requestAnimationFrame(() => {
    const destinationEl = document.querySelector<HTMLElement>(`[data-path="${toPath}"]`)
    if (!destinationEl) return

    // read destination position from CSS properties
    const destLeft = parseFloat(destinationEl.style.left) || 0
    const destTop = parseFloat(destinationEl.style.top) || 0

    // calculate translation distances
    // add 1em indent to make it clear the thought is becoming a subthought
    const computedStyle = window.getComputedStyle(source)
    const fontSize = parseFloat(computedStyle.fontSize)
    const indentOffset = fontSize // 1em

    const dx = destLeft - sourceLeft + indentOffset
    const dy = destTop - sourceTop

    // position clone at source location (inherits absolute positioning)
    clone.style.position = 'absolute'
    clone.style.left = `${sourceLeft}px`
    clone.style.top = `${sourceTop}px`
    clone.style.pointerEvents = 'none'
    clone.style.zIndex = String(zIndex)

    // set CSS variables for keyframe animation
    clone.style.setProperty('--clone-dx', `${dx}px`)
    clone.style.setProperty('--clone-dy', `${dy}px`)

    // apply animation
    clone.style.animationName = 'cloneDragToCollapsed'
    clone.style.animationDuration = `${duration}ms`
    clone.style.animationTimingFunction = 'ease-out'
    clone.style.animationFillMode = 'forwards'

    // append to same parent as source for proper positioning context
    sourceParent.appendChild(clone)

    /** Remove the clone after the animation completes or is cancelled. */
    const remove = () => {
      clone.removeEventListener('animationend', remove)
      clone.removeEventListener('animationcancel', remove)
      if (clone.parentNode) clone.parentNode.removeChild(clone)
    }
    clone.addEventListener('animationend', remove)
    clone.addEventListener('animationcancel', remove)
  })
}

export default animateDroppedThought
