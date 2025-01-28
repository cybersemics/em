import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { DIVIDER_MIN_WIDTH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueUntrimmedStore from '../stores/editingValueUntrimmed'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isDivider from '../util/isDivider'

/** Custom hook to fetch divider-related data from the state. */
const useDividerData = (path: Path) => {
  return useSelector(
    (state: State) => {
      const parentPath = rootedParentOf(state, path)
      const parentId = head(parentPath)
      const grandParentPath = parentId ? rootedParentOf(state, parentPath) : []
      const grandParentId = head(grandParentPath)
      const children = parentId ? getAllChildrenAsThoughts(state, parentId) : []
      const childrenWithoutDividers = children.filter(child => !isDivider(child.value))
      const isOnlyChild = childrenWithoutDividers.length === 0
      const isTableView =
        (parentId && attributeEquals(state, parentId, '=view', 'Table')) ||
        (grandParentId && attributeEquals(state, grandParentId, '=view', 'Table'))

      let thoughtsAtSameDepth: { id: ThoughtId; value: string }[] = []

      if (isTableView && isOnlyChild && grandParentId) {
        const parentSiblings = getAllChildrenAsThoughts(state, grandParentId).filter(child => !isDivider(child.value))
        thoughtsAtSameDepth = parentSiblings.flatMap(parent => {
          const childrenOfParent = parent.id ? getAllChildrenAsThoughts(state, parent.id) : []
          return childrenOfParent.filter(child => !isDivider(child.value))
        })
      }

      return {
        isOnlyChild,
        isTableView,
        children,
        thoughtsAtSameDepth,
      }
    },
    // Ensure the selector runs only when values change, excluding ref changes to avoid redundant re-renders.
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next),
  )
}

let canvas: HTMLCanvasElement | null = null
let context: CanvasRenderingContext2D | null = null

/**
 * Initializes the canvas and context for text width calculation.
 */
const initializeCanvas = () => {
  if (!canvas) {
    canvas = document.createElement('canvas')
    context = canvas.getContext('2d')
  }
}

/**
 * Calculates the width of a single text string, considering trailing spaces.
 */
const calculateTextWidth = (text: string, font: string): number => {
  initializeCanvas()
  if (!context) return 0
  context.font = font
  return Math.ceil(context.measureText(text).width)
}

/** Calculates the width of multiple thoughts. */
const getThoughtWidths = (
  thoughts: { id: ThoughtId; value: string }[],
  font: string,
  editingValueUntrimmed: string | null,
  editingThoughtId: ThoughtId | null,
): number[] => {
  return thoughts.map(thought => {
    const text = editingValueUntrimmed && thought.id === editingThoughtId ? editingValueUntrimmed : thought.value
    // Add 22px to include the full width of the thought
    return calculateTextWidth(text, font) + 22
  })
}

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dispatch = useDispatch()
  const dividerRef = useRef<HTMLDivElement>(null)
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)

  const { isOnlyChild, isTableView, children, thoughtsAtSameDepth } = useDividerData(path)

  const editingThoughtId = useSelector((state: State) => state.cursor && head(state.cursor))

  // Subscribe to untrimmed editing value
  const editingValueUntrimmed = editingValueUntrimmedStore.useSelector(editingValue => editingValue)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  useEffect(() => {
    /** Calculates and updates the Divider's width based on sibling thought widths. */
    const updateDividerWidth = () => {
      if (!dividerRef.current) return

      const computedStyle = window.getComputedStyle(dividerRef.current)
      const font = computedStyle.font || '18px Arial, sans-serif'

      if (isOnlyChild && !isTableView) {
        setDividerWidth(DIVIDER_MIN_WIDTH)
        return
      }

      let widths: number[] = []
      if (isTableView && isOnlyChild) {
        if (thoughtsAtSameDepth.length === 0) {
          setDividerWidth(DIVIDER_MIN_WIDTH)
          return
        }
        widths = getThoughtWidths(thoughtsAtSameDepth, font, editingValueUntrimmed, editingThoughtId)
      } else {
        // Non-Table View or Divider is not the only item
        const siblingThoughts = children.filter(child => !isDivider(child.value))

        if (siblingThoughts.length === 0) {
          setDividerWidth(DIVIDER_MIN_WIDTH)
          return
        }
        widths = getThoughtWidths(siblingThoughts, font, editingValueUntrimmed, editingThoughtId)
      }

      setDividerWidth(Math.round(Math.max(...widths, DIVIDER_MIN_WIDTH)))
    }

    updateDividerWidth() // Initial call to set the width

    // `eslint-disable-next-line react-hooks/exhaustive-deps` is used to exclude `editingThoughtId` because it is not essential for this effect's dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dividerRef, children, thoughtsAtSameDepth, isOnlyChild, isTableView, editingValueUntrimmed])

  return (
    <div
      aria-label='divider'
      ref={dividerRef}
      className={css({
        margin: '-2px -4px -5px',
        marginLeft: '-20px',
        padding: '10px 4px 16px',
        position: 'relative',
        zIndex: 'stack',
      })}
      style={{ width: `${dividerWidth}px` }}
      {...fastClick(setCursorToDivider)}
    >
      <div
        aria-label={'editable-' + head(path)}
        className={css(
          {
            border: 'solid 1px {colors.divider}',
          },
          cssRaw,
        )}
      />
    </div>
  )
}

export default Divider
