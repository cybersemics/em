/** Returns the nearest ancestor element within container that carries a text color or background color and contains the
 * node, or null if the node is not inside one. A color is carried by a <font color> or an inline color/background-color
 * style, as in getCommandState's extractColors. */
const enclosingColorElement = (node: Node, container: Node): HTMLElement | null => {
  for (let n: Node | null = node; n && n !== container; n = n.parentNode) {
    if (
      n.nodeType === Node.ELEMENT_NODE &&
      ((n as HTMLElement).getAttribute('color') ||
        (n as HTMLElement).style.color ||
        (n as HTMLElement).style.backgroundColor)
    ) {
      return n as HTMLElement
    }
  }
  return null
}

export default enclosingColorElement
