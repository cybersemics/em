import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import isContextViewActive from '../selectors/isContextViewActive'
import viewportStore from '../stores/viewport'
import durations from '../util/durations'
import getContextAnimationName from '../util/getContextAnimationName'
import isDescendantPath from '../util/isDescendantPath'
import parentOf from '../util/parentOf'

const usePositionedAnnotation = (
  editableRef: RefObject<HTMLDivElement | null>,
  isEditing: boolean,
  isTableCol1: boolean | undefined,
  numContexts: number,
  path: Path,
  styleAnnotation: React.CSSProperties | undefined,
) => {
  // We're trying to get rid of contentWidth as part of #3369, but currently it's the easiest reactive proxy for a viewport resize event.
  const contentWidth = viewportStore.useSelector(state => state.contentWidth)
  const contextAnimation = useSelector(getContextAnimationName(path))
  const descendant = useSelector(state => isDescendantPath(path, state.cursor))

  const isInContextView = useSelector(state => isContextViewActive(state, parentOf(path)))
  const timeoutRef = useRef(0)
  const fontSize = useSelector(state => state.fontSize)
  const [top, setTop] = useState<string | undefined>(undefined)
  const [left, setLeft] = useState<string | undefined>(undefined)
  const [opacity, setOpacity] = useState<string | undefined>(undefined)

  const positionAnnotation = useCallback(() => {
    if (!editableRef.current) return

    const range = document.createRange()
    const textNode = editableRef.current.lastChild

    const length = textNode && textNode.nodeType === Node.TEXT_NODE && textNode.textContent?.length
    const offset = editableRef.current.getBoundingClientRect()

    let right = offset.width - fontSize - (length ? fontSize / 3 : 0)
    let top = 0

    if (length) {
      // Select the last character
      range.setStart(textNode, length - 1)
      range.setEnd(textNode, length)

      // Get bounding box
      const rect = range.getBoundingClientRect()
      const isAtEdge = rect.right - offset.left > offset.width

      top = rect.top - offset.top
      // offset annotation container to account for -12px left margin in ThoughtPositioner #3352
      if (!isAtEdge) right = rect.right - offset.left + (isTableCol1 ? 12 : 0)
    }

    // rect.right gives you the x position (relative to viewport)
    setLeft(`${right}px`)
    setTop(`${top}px`)
    setOpacity('1')
  }, [editableRef, fontSize, isTableCol1])

  // useSelector would be a cleaner way to get the editableRef's new position
  // but, on load, the refs are null until setTimeout runs
  useEffect(() => {
    if (contextAnimation && descendant && !isEditing) {
      clearTimeout(timeoutRef.current)
      setOpacity('0')
    }
    timeoutRef.current = setTimeout(
      positionAnnotation,
      contextAnimation ? durations.get(contextAnimation) : 0,
    ) as unknown as number
  }, [
    contentWidth,
    contextAnimation,
    descendant,
    editableRef,
    fontSize,
    isEditing,
    isInContextView,
    isTableCol1,
    numContexts,
    positionAnnotation,
    styleAnnotation,
  ])

  const styles = useMemo(() => ({ top, left, opacity }), [top, left, opacity])

  return styles
}

export default usePositionedAnnotation
