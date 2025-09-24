import { ReactElement, RefObject } from 'react'
import { ConnectDropTarget, ConnectableElement } from 'react-dnd'

/**
 * Type-safe ref assertion for React 19 compatibility.
 *
 * React 19 has stricter type checking for refs then lower versions,
 * where RefObject<T | null> is not directly assignable to RefObject<T> (this is a type bug).
 * This utility provides a type-safe way to assert that a ref is non-null when you know it's safe to do so.
 *
 * @template T - The type of the element the ref points to.
 * @param ref - The ref object that may be null.
 * @returns A ref object typed as non-null.
 *
 * @example
 * const contentRef = useRef<HTMLDivElement | null>(null)
 * // Use assertRef when you know the ref is not null
 * const nonNullRef = assertRef(contentRef)
 */
const assertRef = <T>(ref: RefObject<T | null>): RefObject<T> => {
  return ref as RefObject<T>
}

/**
 * Type-safe ref wrapper for React DnD ConnectDropTarget compatibility.
 *
 * React DnD's ConnectDropTarget type has complex type signatures that don't always align
 * with React 19's stricter types. This utility provides a type-safe way to wrap
 * ConnectDropTarget refs for use in React components.
 *
 * @param refCallback - The ConnectDropTarget ref callback from react-dnd.
 * @returns A type-safe ref callback function that can be used with React refs.
 *
 * @example
 * const [dropTarget] = useDrop(...)
 * // Wrap ConnectDropTarget for type safety
 * const wrappedRef = dndRef(dropTarget)
 * // Use with React ref
 * <div ref={wrappedRef}>Drop target</div>
 */
export const dndRef = (refCallback: ConnectDropTarget) => {
  return (node: ConnectableElement) => {
    refCallback(node)
  }
}

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
export const dndRefCallback = (callback: (node: ConnectableElement | null) => ReactElement | null) => {
  return (node: ConnectableElement) => {
    callback(node)
  }
}

export default assertRef
