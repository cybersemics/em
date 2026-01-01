import { RefObject, useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import isDescendantPath from '../util/isDescendantPath'
import usePrevious from './usePrevious'

/** Iterates through a DOM node to find the text node that comprises the final portion of the thought. */
const getFinalTextNode = (element: ChildNode | null) => {
  let child = element

  do {
    if (child === null) return null
    child = child.lastChild
  } while (child?.nodeType !== Node.TEXT_NODE)

  return child
}

/** Create a selection range at the end of an editable and measure its position to determine where to place a thought annotation (context superscript or url/email link).
 * If contextAnimation returns an animation name, that means that the thought is in the process of transitioning in or out of a context view.
 * In that case, hide the annotation until the animation is complete, and position it after the thought has reached its final position.
 */
const usePositionedAnnotation = (
  editableRef: RefObject<HTMLDivElement | null>,
  inTransition: boolean,
  isEditing: boolean,
  isTableCol1: boolean | undefined,
  isTableCol2: boolean | undefined,
  multiline: boolean | undefined,
  numContexts: number,
  path: Path,
) => {
  const descendant = useSelector(state => isDescendantPath(path, state.cursor))
  const fontSize = useSelector(state => state.fontSize)
  const [top, setTop] = useState<string | undefined>(undefined)
  const [left, setLeft] = useState<string | undefined>(undefined)
  const [right, setRight] = useState<string | undefined>(undefined)
  const [opacity, setOpacity] = useState<string | undefined>('0')
  const [transform, setTransform] = useState<string | undefined>(undefined)
  const wasTableCol2 = usePrevious(isTableCol2)

  const positionAnnotation = useCallback(() => {
    if (!editableRef.current) return

    const range = document.createRange()
    const textNode = getFinalTextNode(editableRef.current)

    const length = textNode && textNode.nodeType === Node.TEXT_NODE && textNode.textContent?.length
    const offset = editableRef.current.getBoundingClientRect()

    let right = offset.width - (isTableCol1 ? 0 : fontSize) - (length ? fontSize / 3 : 0)
    let top = 0
    let isAtEdge = false

    if (length) {
      // Select the last character
      range.setStart(textNode, length - 1)
      range.setEnd(textNode, length)

      // Get bounding box
      const rect = range.getBoundingClientRect()
      isAtEdge = rect.right - offset.left > offset.width

      top = rect.top - offset.top
      // offset annotation container to account for -12px left margin in ThoughtPositioner #3352
      if (!isAtEdge) right = rect.right - offset.left + (isTableCol1 && !isEditing ? 12 : 0)
    }

    setTop(`${top}px`)

    if (isTableCol1) {
      setLeft(undefined)
      // For table col 1, isAtEdge is actually a proxy for ellipsizedUrl. urlLinkStyle has an extra 0.333em of padding on it.
      setRight(isAtEdge ? '30.6px' : '24px')
      setTransform('translateX(100%)')
    } else {
      // rect.right gives you the x position (relative to viewport)
      setLeft(`${right}px`)
      setRight(undefined)
      setTransform(undefined)
    }
  }, [editableRef, fontSize, isEditing, isTableCol1])

  // useSelector would be a cleaner way to get the editableRef's new position
  // but, on load, the refs are null until setTimeout runs
  useEffect(() => {
    setOpacity('0')
    if (!inTransition) {
      positionAnnotation()
      setOpacity('1')
    }
  }, [
    descendant,
    editableRef,
    fontSize,
    inTransition,
    isEditing,
    isTableCol1,
    isTableCol2,
    multiline,
    numContexts,
    positionAnnotation,
    wasTableCol2,
  ])

  useEffect(() => {
    window.addEventListener('resize', positionAnnotation)
    return () => window.removeEventListener('resize', positionAnnotation)
  }, [positionAnnotation])

  const styles = useMemo(() => ({ top, left, right, opacity, transform }), [top, left, right, opacity, transform])

  return styles
}

export default usePositionedAnnotation
