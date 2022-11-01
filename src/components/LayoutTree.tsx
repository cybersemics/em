import _ from 'lodash'
import React, { useMemo } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import VirtualThoughtProps from '../@types/VirtualThoughtProps'
import { isTouch } from '../browser'
import { HOME_PATH, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import globals from '../globals'
import attribute from '../selectors/attribute'
import calculateAutofocus from '../selectors/calculateAutofocus'
import { childrenFilterPredicate, getAllChildrenAsThoughts, getAllChildrenSorted } from '../selectors/getChildren'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import { appendToPathMemo } from '../util/appendToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parseLet from '../util/parseLet'
import Subthought from './Subthought'
import SubthoughtsDropEmpty from './Subthoughts/SubthoughtsDropEmpty'
import SubthoughtsDropEnd from './Subthoughts/SubthoughtsDropEnd'

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
  if (!isRoot(simplePath) && !state.expanded[hashPath(simplePath)]) return []

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

/** A thought that is rendered in a flat list but positioned like a node in a tree. */
const VirtualThought = ({
  debugIndex,
  depth,
  env,
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
   * - show fully visible
   * - dim dimmed
   * - hide shifted left and hidden
   * - hide-parent shifted left and hidden
   * Note: This doesn't fully account for the visibility. There are other additional classes that can affect opacity. For example cursor and its expanded descendants are always visible with full opacity.
   */
  const autofocus = useSelector(calculateAutofocus(simplePath))
  const parentId = thought.parentId
  const grandparentId = simplePath[simplePath.length - 3]

  const childrenAttributeId = useSelector(
    (state: State) =>
      (thought.value !== '=children' &&
        getAllChildrenAsThoughts(state, parentId).find(child => child.value === '=children')?.id) ||
      null,
  )
  const grandchildrenAttributeId = useSelector(
    (state: State) =>
      (thought.value !== '=style' &&
        getAllChildrenAsThoughts(state, grandparentId).find(child => child.value === '=grandchildren')?.id) ||
      null,
  )
  const hideBulletsChildren = useSelector((state: State) => attribute(state, childrenAttributeId, '=bullet') === 'None')
  const hideBulletsGrandchildren = useSelector(
    (state: State) => thought.value !== '=bullet' && attribute(state, grandchildrenAttributeId, '=bullet') === 'None',
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

  const styleContainer: React.CSSProperties = useMemo(
    () => ({
      ...styleContainerChildren,
      ...styleContainerGrandchildren,
    }),
    [styleContainerChildren, styleContainerGrandchildren],
  )

  return (
    <div
      style={{
        opacity: autofocus === 'show' ? 1 : autofocus === 'dim' ? 0.5 : 0,
        pointerEvents: autofocus !== 'show' && autofocus !== 'dim' ? 'none' : undefined,
        transition: 'opacity 0.75s ease-out',
      }}
    >
      <Subthought
        // allowSingleContext={allowSingleContextParent}
        allowSingleContext={false}
        child={thought}
        debugIndex={debugIndex}
        depth={depth}
        distance={distance}
        env={env}
        hideBullet={hideBulletsChildren || hideBulletsGrandchildren}
        // isHeader={isHeader}
        isHeader={false}
        // isMultiColumnTable={isMultiColumnTable}
        isMultiColumnTable={false}
        isVisible={autofocus === 'show' || autofocus === 'dim'}
        parentPath={parentPath}
        path={parentPath}
        prevChildId={prevChildId}
        // showContexts={showContexts}
        showContexts={false}
        styleChildren={styleChildren || undefined}
        styleContainer={styleContainer}
        styleGrandchildren={styleGrandchildren || undefined}
        // zoomCursor={zoomCursor}
      />
      {leaf && (autofocus === 'show' || autofocus === 'dim' || globals.simulateDrag || globals.simulateDrop) && (
        <SubthoughtsDropEmpty
          depth={depth}
          indexDescendant={indexDescendant}
          leaf={leaf}
          prevChildId={prevChildId}
          nextChildId={nextChildId}
          simplePath={simplePath}
        />
      )}
    </div>
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
  const cursorDistance = useSelector((state: State) =>
    state.cursor && state.cursor.length > 1 ? state.cursor.length - 1 : 0,
  )

  return (
    <div
      style={{
        // Use translateX instead of marginLeft to prevent multiline thoughts from continuously recalculating layout as their width changes during the transition.
        // Add a negative marginRight by the same amount to ensure the thought takes up the full width. Not animated for a more stable visual experience.
        transform: `translateX(${1.5 - cursorDistance}em)`,
        transition: 'transform 0.75s ease-out',
        marginRight: `${-cursorDistance + (isTouch ? 2 : -1)}em`,
      }}
    >
      {virtualThoughts.map(({ depth, env, indexChild, indexDescendant, leaf, simplePath, thought }, i) => {
        const next = virtualThoughts[i + 1]
        const prev = virtualThoughts[i - 1]
        // cliff is the number of levels that drop off after the last thought at a given depth. Increase in depth is ignored.
        // This is used to determine how many SubthoughtsDropEnd to insert before the next thought (one for each level dropped).
        const cliff = next ? Math.min(0, next.depth - depth) : -depth
        return (
          <React.Fragment key={thought.id}>
            <div
              style={{
                position: 'relative',
                // Cannot use transform because it creates a new stacking context, which causes later siblings' SubthoughtsDropEmpty to be covered by previous siblings'.
                // Unfortunately left causes layout recalculation, so we may want to hoist SubthoughtsDropEmpty into a parent and manually control the position.
                left: `${depth}em`,
                marginRight: `${depth}em`,
                transition: 'left 0.15s ease-out',
              }}
            >
              <VirtualThought
                debugIndex={globals.simulateDrop ? indexChild : undefined}
                depth={depth}
                env={env}
                indexDescendant={indexDescendant}
                leaf={leaf}
                prevChildId={indexChild !== 0 ? prev?.thought.id : undefined}
                nextChildId={next?.depth < depth ? next?.thought.id : undefined}
                simplePath={simplePath}
              />
            </div>

            {cliff < 0 &&
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
                        left: simplePathEnd.length * fontSize * 1.2,
                        transition: 'left 0.15s ease-out',
                      }}
                    >
                      <SubthoughtsDropEnd
                        depth={simplePathEnd.length}
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
          </React.Fragment>
        )
      })}

      <RootDropEnd />
    </div>
  )
}

export default LayoutTree
