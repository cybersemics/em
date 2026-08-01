import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import rgbToHex from '../util/rgbToHex'
import getThoughtById from './getThoughtById'

interface InheritedColors {
  backgroundColor?: string
  color?: string
}

/** Normalizes a color enough for equality checks while preserving the original value for rendering. */
const colorKey = (color: string): string => {
  try {
    return rgbToHex(color).toLowerCase()
  } catch {
    return color.trim().toLowerCase().replace(/\s+/g, '')
  }
}

/** Gets the fill color that should represent a text node. Background color takes precedence over text color. */
const fillFromColors = ({ backgroundColor, color }: InheritedColors) => backgroundColor || color

/** Gets the colors that apply to an element's descendants. */
const getInheritedColors = (element: HTMLElement, inherited: InheritedColors): InheritedColors => {
  const backgroundColor = element.style.backgroundColor || inherited.backgroundColor
  const color = element.style.color || element.getAttribute('color') || inherited.color

  return { backgroundColor, color }
}

/**
 * Gets the fill color for a thought by its ID. That is, a color applied to the entire thought value in a font or span tag.
 * @param state - The Redux state.
 * @param thoughtId - The ID of the thought to check.
 * @returns The fill color or undefined if not found.
 */
const getThoughtFill = (state: State, thoughtId: ThoughtId): string | undefined => {
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return undefined

  if (typeof DOMParser === 'undefined') return undefined

  const doc = new DOMParser().parseFromString(thought.value, 'text/html')
  let fill: string | undefined
  let hasVisibleText = false
  let mixedOrPartialColor = false

  /** Visits each node and records whether every visible text node resolves to the same fill. */
  const visit = (node: ChildNode, inherited: InheritedColors) => {
    if (mixedOrPartialColor) return

    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent?.trim()) return

      const nodeFill = fillFromColors(inherited)
      if (!nodeFill) {
        mixedOrPartialColor = true
        return
      }

      hasVisibleText = true

      if (!fill) {
        fill = nodeFill
      } else if (colorKey(fill) !== colorKey(nodeFill)) {
        mixedOrPartialColor = true
      }

      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const nextInherited = getInheritedColors(node as HTMLElement, inherited)
    node.childNodes.forEach(child => visit(child, nextInherited))
  }

  doc.body.childNodes.forEach(child => visit(child, {}))

  return hasVisibleText && !mixedOrPartialColor ? fill : undefined
}

export default getThoughtFill
