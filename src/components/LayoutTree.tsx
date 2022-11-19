import React from 'react'
import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { isTouch } from '../browser'
import { HOME_PATH } from '../constants'
import globals from '../globals'
import { childrenFilterPredicate, getAllChildrenSorted, hasChildren } from '../selectors/getChildren'
import viewportStore from '../stores/viewport'
import { appendToPathMemo } from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parseLet from '../util/parseLet'
import DropEnd from './DropEnd'
import VirtualThought from './VirtualThought'

type TreeThought = {
  depth: number
  env?: LazyEnv
  // index among visible siblings at the same level
  indexChild: number
  // index among all visible thoughts in the tree
  indexDescendant: number
  leaf: boolean
  simplePath: SimplePath
  thought: Thought
}

/** Recursiveley calculates the tree of visible thoughts, in order, represented as a flat list of thoughts with tree layout information. */
const virtualTree = (
  state: State,
  simplePath: SimplePath,
  { depth, env, indexDescendant }: { depth: number; env?: LazyEnv; indexDescendant: number } = {
    depth: 0,
    indexDescendant: 0,
  },
): TreeThought[] => {
  const hashedPath = hashPath(simplePath)
  if (!isRoot(simplePath) && !state.expanded[hashedPath] && !state.expandedBottom[hashedPath]) return []

  const thoughtId = head(simplePath)
  const children = getAllChildrenSorted(state, thoughtId)

  const filteredChildren = children.filter(childrenFilterPredicate(state, simplePath))

  const thoughts = filteredChildren.reduce<TreeThought[]>((accum, child, i) => {
    const childPath = appendToPathMemo(simplePath, child.id)
    const lastVirtualIndex = accum.length > 0 ? accum[accum.length - 1].indexDescendant : 0
    const virtualIndexNew = indexDescendant + lastVirtualIndex + (depth === 0 && i === 0 ? 0 : 1)
    const envParsed = parseLet(state, simplePath)
    const envNew =
      env && Object.keys(env).length > 0 && Object.keys(envParsed).length > 0 ? { ...env, ...envParsed } : undefined

    const descendants = virtualTree(state, childPath, {
      depth: depth + 1,
      env: envNew,
      indexDescendant: virtualIndexNew,
    })

    return [
      ...accum,
      {
        depth,
        env: envNew || undefined,
        indexChild: i,
        indexDescendant: virtualIndexNew,
        // true if the thought has no visible children.
        // It may still have hidden children.
        leaf: descendants.length === 0,
        simplePath: childPath,
        thought: child,
      },
      ...descendants,
    ]
  }, [])

  return thoughts
}

/** A drop target at the end of the ROOT context. */
const RootDropEnd = () => {
  // Only allow dropping on the root when the root children are visible.
  // It would be confusing to allow dropping on the root when there are intervening hidden ancestors that can't be dropped on.
  const isVisible = useSelector((state: State) => !state.cursor || state.cursor.length < 3)
  return (
    <>
      {isVisible && (
        <DropEnd
          depth={0}
          indexDescendant={0}
          leaf={false}
          simplePath={HOME_PATH}
          // Extend the click area of the drop target when there is nothing below.
          // Always extend the root subthught drop target.
          last={true}
        />
      )}
    </>
  )
}

/** Lays out thoughts as DOM siblings with manual x,y positioning. */
const LayoutTree = () => {
  const virtualThoughts = useSelector((state: State) => virtualTree(state, HOME_PATH))
  const fontSize = useSelector((state: State) => state.fontSize)
  const indent = useSelector((state: State) =>
    state.cursor && state.cursor.length > 2
      ? // when the cursor is on a leaf, the indention level should not change
        state.cursor.length - (hasChildren(state, head(state.cursor)) ? 2 : 3)
      : 0,
  )

  // only set during drag-and-drop to avoid re-renders
  const isCursorLeaf = useSelector(
    (state: State) =>
      (state.dragInProgress || globals.simulateDrag || globals.simulateDrop) &&
      state.cursor &&
      !hasChildren(state, head(state.cursor)),
  )

  // only set during drag-and-drop to avoid re-renders
  const cursorDepth = useSelector((state: State) =>
    (state.dragInProgress || globals.simulateDrag || globals.simulateDrop) && state.cursor ? state.cursor.length : 0,
  )

  // setup list virtualization
  const viewport = viewportStore.useState()
  const overshoot = 5 // the number of additional thoughts below the bottom of the screen that are rendered
  const top = viewport.scrollTop + viewport.innerHeight + overshoot
  const estimatedYStart = 80
  const estimatedHeight = fontSize * 1.87

  return (
    <div
      style={{
        // Use translateX instead of marginLeft to prevent multiline thoughts from continuously recalculating layout as their width changes during the transition.
        // The indent multipicand (0.9) causes the translateX counter-indentation to fall short of the actual indentation, causing a progressive shifting right as the user navigates deeper. This provides an additional cue for the user's depth, which is helpful when autofocus obscures the actual depth, but it must stay small otherwise the thought width becomes too small.
        transform: `translateX(${1.5 - indent * 0.9}em)`,
        transition: 'transform 0.75s ease-out',
        // Add a negative marginRight equal to translateX to ensure the thought takes up the full width. Not animated for a more stable visual experience.
        marginRight: `${-indent * 0.9 + (isTouch ? 2 : -1)}em`,
      }}
    >
      {virtualThoughts.map(({ depth, env, indexChild, indexDescendant, leaf, simplePath, thought }, i) => {
        const next = virtualThoughts[i + 1]
        const prev = virtualThoughts[i - 1]
        // cliff is the number of levels that drop off after the last thought at a given depth. Increase in depth is ignored.
        // This is used to determine how many DropEnd to insert before the next thought (one for each level dropped).
        const cliff = next ? Math.min(0, next.depth - depth) : -depth

        // List Virtualization
        // Hide thoughts that are below the viewport.
        // Render virtualized thoughts with their estimated height so that documeent height is relatively stable.
        // Otherwise scrolling down quickly will bottom out as the thoughts are re-rendered and the document height is built back up.
        const estimatedY = i * estimatedHeight + estimatedYStart
        const hide = estimatedY > top + estimatedHeight
        if (hide) return <div key={thought.id} style={{ height: estimatedHeight }} />

        return (
          <React.Fragment key={thought.id}>
            <div
              style={{
                position: 'relative',
                // Cannot use transform because it creates a new stacking context, which causes later siblings' SubthoughtsDropEmp/y to be covered by previous siblings'.
                // Unfortunately left causes layout recalculation, so we may want to hoist SubthoughtsDropEmpty into a parent and manually control the position.
                left: `${depth}em`,
                marginRight: `${depth}em`,
                transition: 'left 0.15s ease-out',
              }}
            >
              <VirtualThought
                debugIndex={globals.simulateDrop ? indexChild : undefined}
                depth={depth}
                dropCliff={cliff < 0 && !!prev}
                env={env}
                indexDescendant={indexDescendant}
                // isMultiColumnTable={isMultiColumnTable}
                isMultiColumnTable={false}
                leaf={leaf}
                prevChildId={indexChild !== 0 ? prev?.thought.id : undefined}
                nextChildId={next?.depth < depth ? next?.thought.id : undefined}
                simplePath={simplePath}
              />
            </div>

            {/* DropEnd (cliff) */}
            {cliff < 0 &&
              // do not render hidden cliffs
              // rough autofocus estimate
              cursorDepth - depth < (isCursorLeaf ? 3 : 2) &&
              Array(-cliff)
                .fill(0)
                .map((x, i) => {
                  const simplePathEnd = simplePath.slice(0, cliff + i) as SimplePath
                  return (
                    <div
                      key={`${head(simplePathEnd)}`}
                      className='z-index-subthoughts-drop-end'
                      style={{
                        position: 'relative',
                        top: '-0.2em',
                        left: `calc(${simplePathEnd.length}em + ${isTouch ? -1 : 1}px)`,
                        transition: 'left 0.15s ease-out',
                      }}
                    >
                      <DropEnd
                        depth={simplePathEnd.length}
                        indexDescendant={indexDescendant}
                        last={!next}
                        leaf={false}
                        simplePath={simplePathEnd}
                        // Extend the click area of the drop target when there is nothing below.
                        // The last visible drop-end will always be a dimmed thought at distance 1 (an uncle).
                        // Dimmed thoughts at distance 0 should not be extended, as they are dimmed siblings and sibling descendants that have thoughts below
                        // last={!nextChildId}
                      />
                    </div>
                  )
                })}
          </React.Fragment>
        )
      })}

      <RootDropEnd />
    </div>
  )
}

export default LayoutTree
