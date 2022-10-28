import _ from 'lodash'
import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import VirtualThoughtProps from '../@types/VirtualThoughtProps'
import { HOME_PATH, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import globals from '../globals'
import attribute from '../selectors/attribute'
import calculateAutofocus from '../selectors/calculateAutofocus'
import { childrenFilterPredicate, getAllChildrenAsThoughts, getAllChildrenSorted } from '../selectors/getChildren'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import unroot from '../util/unroot'
import Subthought from './Subthought'
import SubthoughtsDropEmpty from './Subthoughts/SubthoughtsDropEmpty'
import SubthoughtsDropEnd from './Subthoughts/SubthoughtsDropEnd'

type TreeThought = {
  depth: number
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
  { depth, indexDescendant } = { depth: 0, indexDescendant: 0 },
): TreeThought[] => {
  if (!state.expanded[hashPath(simplePath)]) return []

  const thoughtId = head(simplePath)
  const children = getAllChildrenSorted(state, thoughtId)

  const filteredChildren = children.filter(childrenFilterPredicate(state, simplePath))

  const thoughts = filteredChildren.reduce<TreeThought[]>((accum, child, i) => {
    const childPath = unroot(appendToPath(simplePath, child.id))
    const lastVirtualIndex = accum.length > 0 ? accum[accum.length - 1].indexDescendant : 0
    const virtualIndexNew = indexDescendant + lastVirtualIndex + (depth === 0 && i === 0 ? 0 : 1)
    const descendants = virtualTree(state, childPath, {
      depth: depth + 1,
      indexDescendant: virtualIndexNew,
    })
    return [
      ...accum,
      {
        depth,
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

/** A thought that is rendered in a flat list but positioned like a node in a tree. */
const VirtualThought = ({
  depth,
  indexChild,
  indexDescendant,
  leaf,
  prevChildId,
  nextChildId,
  simplePath,
}: VirtualThoughtProps) => {
  const thought = useSelector(
    (state: State) => getThoughtById(state, head(simplePath)),
    (a, b) => a === b || a.id === b.id,
  )
  const parentPath = useSelector((state: State) => rootedParentOf(state, simplePath), shallowEqual)

  const distance = useSelector((state: State) =>
    state.cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, state.cursor.length - depth!)) : 0,
  )

  /** Calculates the autofocus state to hide or dim thoughts.
   * Note: The following properties are applied to the immediate children with given class.
   * - autofocus-show fully visible
   * - autofocus-dim dimmed
   * - autofocus-hide shifted left and hidden
   * - autofocus-hide-parent shiifted left and hidden
   * Note: This doesn't fully account for the visibility. There are other additional classes that can affect opacity. For example cursor and its expanded descendants are always visible with full opacity.
   */
  const autofocus = useSelector((state: State) => calculateAutofocus(state, simplePath))

  const childrenAttributeId = useSelector(
    (state: State) =>
      (thought.value !== '=children' &&
        getAllChildrenAsThoughts(state, thought.id).find(child => child.value === '=children')?.id) ||
      null,
  )
  const grandchildrenAttributeId = useSelector(
    (state: State) =>
      (thought.value !== '=grandchildren' &&
        getAllChildrenAsThoughts(state, thought.parentId).find(child => child.value === '=grandchildren')?.id) ||
      null,
  )
  const hideBulletsChildren = useSelector((state: State) => attribute(state, childrenAttributeId, '=bullet') === 'None')
  const hideBulletsGrandchildren = useSelector(
    (state: State) => attribute(state, grandchildrenAttributeId, '=bullet') === 'None',
  )

  const styleChildren = useSelector((state: State) => getStyle(state, childrenAttributeId), _.isEqual)
  const styleGrandchildren = useSelector((state: State) => getStyle(state, grandchildrenAttributeId), _.isEqual)
  const styleContainerChildren = useSelector(
    (state: State) => getStyle(state, childrenAttributeId, { attributeName: '=styleContainer' }),
    _.isEqual,
  )
  const styleContainerGrandchildren = useSelector(
    (state: State) => getStyle(state, grandchildrenAttributeId, { attributeName: '=styleContainer' }),
    _.isEqual,
  )

  return (
    <>
      <Subthought
        // allowSingleContext={allowSingleContextParent}
        allowSingleContext={false}
        autofocus={autofocus}
        child={thought}
        depth={depth}
        distance={distance}
        // env={env}
        env={''}
        hideBullet={hideBulletsChildren || hideBulletsGrandchildren}
        index={indexChild}
        // isHeader={isHeader}
        isHeader={false}
        // isMultiColumnTable={isMultiColumnTable}
        isMultiColumnTable={false}
        parentPath={parentPath}
        path={parentPath}
        prevChildId={prevChildId}
        // showContexts={showContexts}
        showContexts={false}
        styleChildren={styleChildren || undefined}
        styleContainerChildren={styleContainerChildren || undefined}
        styleContainerGrandchildren={styleContainerGrandchildren || undefined}
        styleGrandchildren={styleGrandchildren || undefined}
        // zoomCursor={zoomCursor}
      />
      {leaf && (autofocus === 'show' || autofocus === 'dim' || globals.simulateDrag || globals.simulateDrop) && (
        <SubthoughtsDropEmpty
          depth={depth}
          indexChild={indexChild}
          indexDescendant={indexDescendant}
          leaf={leaf}
          prevChildId={prevChildId}
          nextChildId={nextChildId}
          simplePath={simplePath}
        />
      )}
    </>
  )
}

/** A drop target at the end of the ROOT context. */
const RootDropEnd = () => {
  // Only allow dropping on the root when the root children are visible.
  // It would be confusing to allow dropping on the root when there are intervening hidden ancestors that can't be dropped on.
  const isVisible = useSelector((state: State) => !state.cursor || state.cursor.length < 3)
  return (
    <>
      {isVisible && (
        <SubthoughtsDropEnd
          depth={0}
          indexChild={0}
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

  return (
    <div
      style={{
        marginLeft: '1.5em',
      }}
    >
      {virtualThoughts.map(({ depth, indexChild, indexDescendant, leaf, simplePath, thought }, i) => {
        const next = virtualThoughts[i + 1]
        const prev = virtualThoughts[i - 1]
        // cliff is the number of levels that drop off after the last thought at a given depth. Increase in depth is ignored.
        // This is used to determine how many SubthoughtsDropEnd to insert before the next thought (one for each level dropped).
        const cliff = prev ? Math.min(0, depth - prev.depth) : 0
        return (
          <>
            {cliff < 0 &&
              Array(-cliff)
                .fill(0)
                .map((x, i) => {
                  const simplePathEnd = prev.simplePath.slice(0, cliff + i) as SimplePath
                  const depthEnd = depth - cliff + i - 1
                  return (
                    <div
                      key={i}
                      className='z-index-subthoughts-drop-end'
                      style={{
                        left: depthEnd * fontSize * 1.2,
                        transition: 'left 0.15s ease-out',
                        position: 'relative',
                      }}
                    >
                      <SubthoughtsDropEnd
                        depth={depthEnd}
                        indexChild={indexChild}
                        indexDescendant={indexDescendant}
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

            <div
              key={thought.id}
              style={{
                position: 'relative',
                // Cannot use transform because it creates a new stacking context, which causes later siblings' SubthoughtsDropEmpty to be covered by previous siblings'.
                // Unfortunately left causes layout recalculation, so we may want to hoist SubthoughtsDropEmpty into a parent and manually control the position.
                left: depth * fontSize * 1.2,
                transition: 'left 0.15s ease-out',
              }}
            >
              <VirtualThought
                depth={depth}
                indexChild={indexChild}
                indexDescendant={indexDescendant}
                leaf={leaf}
                prevChildId={indexChild !== 0 ? prev?.thought.id : undefined}
                nextChildId={next?.depth < depth ? next?.thought.id : undefined}
                simplePath={simplePath}
              />
            </div>
          </>
        )
      })}

      <RootDropEnd />
    </div>
  )
}

export default LayoutTree
