import { ReactElement } from 'react'
import { ConnectableElement } from 'react-dnd'

/**
 * Type-safe ref callback wrapper for React DnD drag and drop operations.
 *
 * React DnD ref callbacks have complex type signatures that don't always align
 * with React 19's stricter types. This utility provides a type-safe way to
 * handle ref callbacks in drag and drop scenarios.
 *
 * @param callback - The ref callback function that handles the connectable element.
 * @returns A type-safe ref callback function for React DnD operations.
 *
 * @example
 * const [dragSource, dropTarget] = useDragAndDrop(...)
 * // Create type-safe ref callback
 * const refCallback = dndRefCallback(node => {
 * if (node) return dragSource(dropTarget(node))
 * return null
 * })
 * // Use with React ref
 * <div ref={refCallback}>Drag and drop target</div>
 */
const dndRef = (callback: (node: ConnectableElement | null) => ReactElement | null) => {
  return (node: ConnectableElement) => {
    callback(node)
  }
}

export default dndRef
