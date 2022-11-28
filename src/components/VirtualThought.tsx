import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Autofocus from '../@types/Autofocus'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import useDelayedAutofocus from '../hooks/useDelayedAutofocus'
import useSelectorEffect from '../hooks/useSelectorEffect'
import appendChildPath from '../selectors/appendChildPath'
import attribute from '../selectors/attribute'
import calculateAutofocus from '../selectors/calculateAutofocus'
import findDescendant from '../selectors/findDescendant'
import getChildPath from '../selectors/getChildPath'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import store from '../stores/app'
import editingValueStore from '../stores/editingValue'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import once from '../util/once'
import DropBefore from './DropBefore'
import DropEmpty from './DropEmpty'
import Thought from './Thought'

/** Finds the the first env entry with =focus/Zoom. O(children). */
const findFirstEnvContextWithZoom = (state: State, { id, env }: { id: ThoughtId; env?: LazyEnv }): ThoughtId | null => {
  if (!env) return null
  const children = getAllChildrenAsThoughts(state, id)
  const child = children.find(
    child => isAttribute(child.value) && attribute(state, env[child.value], '=focus') === 'Zoom',
  )
  return child ? findDescendant(state, env[child.value], ['=focus', 'Zoom']) : null
}

/** Renders a thought if it is not hidden by autofocus, otherwise renders a fixed height shim. */
const VirtualThought = ({
  debugIndex,
  depth,
  dropBefore,
  env,
  indexDescendant,
  isMultiColumnTable,
  leaf,
  prevChildId,
  nextChildId,
  onResize,
  simplePath,
  zoomCursor,
}: {
  debugIndex?: number
  depth: number
  dropBefore?: boolean
  env?: LazyEnv
  indexDescendant: number
  isMultiColumnTable?: boolean
  leaf?: boolean
  prevChildId?: ThoughtId
  nextChildId?: ThoughtId
  onResize?: (id: ThoughtId, height: number | null) => void
  simplePath: SimplePath
  zoomCursor?: boolean
}) => {
  const thought = useSelector((state: State) => getThoughtById(state, head(simplePath)), shallowEqual)
  const isEditing = useSelector((state: State) => equalPath(state.cursor, simplePath))
  const heightRef = useRef<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  /***************************
   * VirtualThought properties

   ***************************/

  // Hidden thoughts can be removed completely as long as the container preserves its height (to avoid breaking the scroll position).
  // Wait until the fade out animation has completed before removing.
  // Only shim 'hide', not 'hide-parent', thoughts, otherwise hidden parents snap in instead of fading in when moving up the tree.
  const autofocus = useSelector(calculateAutofocus(simplePath))
  const shimHiddenThought = useDelayedAutofocus(autofocus, {
    delay: 750,
    selector: (autofocusAfterAnimation: Autofocus) =>
      autofocus === 'hide' && autofocusAfterAnimation === 'hide' && !!heightRef.current,
  })

  // console.info('<VirtualThought>', prettyPath(childPath))
  // useWhyDidYouUpdate('<VirtualThought> ' + prettyPath(state, childPath), {
  //   child,
  //   depth,
  //   env,
  //   index,
  //   isHeader,
  //   isMultiColumnTable,
  //   zoomCursor,
  //   parentPath,
  //   path,
  //   prevChildId,
  //   shimHiddenThought
  //   showContexts,
  //   // hooks
  //   childPathUnstable,
  //   childPath,
  // })

  const updateHeight = useCallback(() => {
    if (!ref.current) return
    const heightNew = ref.current.clientHeight
    if (heightNew === heightRef.current) return
    heightRef.current = ref.current.clientHeight
    onResize?.(thought.id, heightRef.current)
  }, [])

  // Read the element's height from the DOM on cursor change, but do not re-render.
  // shimHiddenThought will re-render as needed.
  useSelectorEffect((state: State) => state.cursor?.length, updateHeight, shallowEqual)
  useEffect(updateHeight)

  // Recalculate height on edit
  useEffect(() => {
    updateHeight()
    if (isEditing) {
      // update height when editingValue changes and return the unsubscribe function
      return editingValueStore.subscribe(updateHeight)
    }
  }, [isEditing])

  // trigger onResize with null to allow subscribes to clean up
  useEffect(() => {
    return () => {
      onResize?.(thought.id, null)
    }
  }, [])

  // Short circuit if thought has already been removed.
  // This can occur in a re-render even when thought is defined in the parent component.
  if (!thought) return null

  const isVisible = zoomCursor || autofocus === 'show' || autofocus === 'dim'

  return (
    <div
      ref={ref}
      style={{
        // Fix the height of the container to the last measured height to ensure that there is no layout shift when the Thought is removed from the DOM.
        // Must include DropEmpty, or it will shift when the cursor moves.
        height: shimHiddenThought ? heightRef.current! : undefined,
      }}
    >
      {
        /* Since no drop target is rendered when thoughts are hidden/shimmed, we need to create a drop target for after a hidden parent.
           e.g. Below, a is hidden and all of b's siblings are hidden, but we still want to be able to drop before e. Therefore we insert DropHiddenUncle when e would not be rendered.
             - a
              - b
                - c [cursor]
                  - x
                - d
              - e
         */
        !isVisible && dropBefore && <DropBefore depth={depth} prevChildId={prevChildId} simplePath={simplePath} />
      }

      {!shimHiddenThought && (
        <Subthought
          autofocus={autofocus}
          debugIndex={debugIndex}
          depth={depth + 1}
          dropBefore={dropBefore}
          env={env}
          indexDescendant={indexDescendant}
          isMultiColumnTable={isMultiColumnTable}
          key={thought.id}
          leaf={leaf}
          prevChildId={prevChildId}
          nextChildId={nextChildId}
          simplePath={simplePath}
          zoomCursor={zoomCursor}
        />
      )}

      {isVisible && leaf && (
        <DropEmpty
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

const VirtualThoughtMemo = React.memo(VirtualThought)
VirtualThoughtMemo.displayName = 'VirtualThought'

/** Renders a thought with style. */
// TODO: These selectors can be optimized by calculating them once for all children, since they are the same among siblings. However siblings are not rendered contiguously (virtualTree), so they need to be calculated higher up.
const Subthought = ({
  autofocus,
  debugIndex,
  depth,
  dropBefore,
  env,
  indexDescendant,
  isMultiColumnTable,
  leaf,
  prevChildId,
  nextChildId,
  simplePath,
  zoomCursor,
}: {
  autofocus: Autofocus
  debugIndex?: number
  depth: number
  dropBefore?: boolean
  env?: LazyEnv
  indexDescendant: number
  isMultiColumnTable?: boolean
  leaf?: boolean
  prevChildId?: ThoughtId
  nextChildId?: ThoughtId
  simplePath: SimplePath
  zoomCursor?: boolean
}) => {
  const state = store.getState()
  const thought = useSelector((state: State) => getThoughtById(state, head(simplePath)), shallowEqual)
  const parentId = thought.parentId
  const parentPath = useSelector((state: State) => rootedParentOf(state, simplePath), shallowEqual)
  const path = useSelector((state: State) => rootedParentOf(state, simplePath), shallowEqual)
  const grandparentId = simplePath[simplePath.length - 3]
  const isVisible = zoomCursor || autofocus === 'show' || autofocus === 'dim'

  // TODO
  const showContexts = false

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
  const hideBullet = useSelector((state: State) => {
    const hideBulletsChildren = attribute(state, childrenAttributeId, '=bullet') === 'None'
    if (hideBulletsChildren) return true
    const hideBulletsGrandchildren =
      thought.value !== '=bullet' && attribute(state, grandchildrenAttributeId, '=bullet') === 'None'
    if (hideBulletsGrandchildren) return true
    return false
  })

  /****************************/

  // getChildPath cannot be trivially memoized since it is not a pure function; its return value depends on which thoughts are loaded.
  // Memoizing it naively can result in not re-rendering contexts in the context view while they are loading.
  // There is no way to determine a priori whether a thought id's path to the root is fully loaded without traversing up the tree.
  // Instead we do a double memoization to minimize re-renders.
  const childPathUnstable = useMemo(
    // First, memoize the child path with, in addition to the parameters, the thought index (only if context view is activated, as full paths are guaranteed to be loaded in normal view).
    // This is O(depth) for each child, but is is only recalculated when the Subthoughts component is re-rendered; it won't trigger any additional re-renders of the child thought (due to the next memoization step).
    // However, childPathUnstable has a new object reference every time the thought index changes.
    () => getChildPath(state, thought.id, parentPath, showContexts),
    [thought.id, parentPath, showContexts, showContexts && state.thoughts.thoughtIndex],
  )
  // Second, therefore, memoize childPathUnstable based on its length, since we know that if thoughtToPath returns an array of the same length for the same id, then it is the same path.
  const childPath = useMemo(
    () => childPathUnstable,
    [thought.id, parentPath, showContexts, showContexts && childPathUnstable.length],
  )

  const childEnvZoomId = once(() => findFirstEnvContextWithZoom(state, { id: thought.id, env }))

  /** Returns true if the cursor is contained within the thought path, i.e. the thought is a descendant of the cursor. */
  const isEditingChildPath = isDescendantPath(state.cursor, childPath)

  const style = useMemo(
    () => ({
      ...(isEditingChildPath ? getStyle(state, childEnvZoomId()) : null),
    }),
    [isEditingChildPath],
  )

  // TODO: ROOT gets appended when isContextPending
  // What should appendedChildPath be?
  const appendedChildPath = appendChildPath(state, childPath, path)

  // Short circuit if thought has already been removed.
  // This can occur in a re-render even when thought is defined in the parent component.
  if (!thought) return null

  return (
    <div
      style={{
        // opacity creates a new stacking context, so it must only be applied to Thought, not to the outer div which contains DropEmpty.
        // Otherwise subsequent DropEmpty will be obscured.
        opacity: autofocus === 'show' ? 1 : autofocus === 'dim' ? 0.5 : 0,
        transition: 'opacity 0.75s ease-out',
        pointerEvents: !isVisible ? 'none' : undefined,
      }}
    >
      <Thought
        debugIndex={debugIndex}
        depth={depth + 1}
        env={env}
        hideBullet={hideBullet}
        isContextPending={thought.value === '__PENDING__'}
        // isHeader={isHeader}
        isHeader={false}
        isMultiColumnTable={isMultiColumnTable}
        isVisible={isVisible}
        path={appendedChildPath}
        prevChildId={prevChildId}
        rank={thought.rank}
        // showContexts={showContexts}
        showContexts={false}
        simplePath={childPath}
        style={style}
      />
    </div>
  )
}

export default VirtualThoughtMemo
