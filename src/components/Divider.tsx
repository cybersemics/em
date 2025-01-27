import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { DIVIDER_MIN_WIDTH, DIVIDER_PLUS_PX } from '../constants'
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
      const dividerId = head(path)
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
        const parentSiblings = getAllChildrenAsThoughts(state, grandParentId)
        thoughtsAtSameDepth = parentSiblings.flatMap(parent => {
          const childrenOfParent = parent.id ? getAllChildrenAsThoughts(state, parent.id) : []
          return childrenOfParent.filter(child => !isDivider(child.value))
        })
      }

      return {
        dividerId,
        isOnlyChild,
        isTableView,
        children,
        thoughtsAtSameDepth,
      }
    },
    (prev, next) => {
      return (
        prev.dividerId === next.dividerId &&
        prev.isOnlyChild === next.isOnlyChild &&
        prev.isTableView === next.isTableView &&
        prev.children.length === next.children.length &&
        prev.thoughtsAtSameDepth.length === next.thoughtsAtSameDepth.length
      )
    },
  )
}

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dispatch = useDispatch()
  const dividerRef = useRef<HTMLDivElement>(null)
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)

  const { dividerId, isOnlyChild, isTableView, children, thoughtsAtSameDepth } = useDividerData(path)

  const editingThoughtId = useSelector((state: State) => state.cursor && head(state.cursor))

  // Subscribe to untrimmed editing value
  const editingValueUntrimmed = editingValueUntrimmedStore.useSelector(editingValue => editingValue)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  // Initialize canvas and context once
  if (!canvasRef.current) {
    canvasRef.current = document.createElement('canvas')
    contextRef.current = canvasRef.current.getContext('2d')
  }

  /** Helper function to calculate text width including trailing spaces. */
  const calculateTextWidth = (text: string, font: string) => {
    if (!contextRef.current) return 0
    contextRef.current.font = font
    return Math.ceil(contextRef.current.measureText(text).width)
  }

  /**
   * Calculates the width of the thought text, including trailing spaces.
   * Uses the untrimmed editing value for the currently edited thought.
   */
  const getThoughtWidths = (
    thoughts: { id: ThoughtId; value: string }[],
    font: string,
    editingValueUntrimmed: string | null,
    editingThoughtId: ThoughtId | null,
  ) => {
    return thoughts.map(thought => {
      const text = editingValueUntrimmed && thought.id === editingThoughtId ? editingValueUntrimmed : thought.value
      return calculateTextWidth(text, font) + DIVIDER_PLUS_PX
    })
  }

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  useEffect(
    () => {
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
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dividerRef,
      children,
      thoughtsAtSameDepth,
      isOnlyChild,
      isTableView,
      dividerId,
      editingValueUntrimmed,
      editingThoughtId,
    ],
  )

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
