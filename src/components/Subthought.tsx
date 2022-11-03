import _ from 'lodash'
import React, { useMemo } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import globals from '../globals'
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
import equalPath from '../util/equalPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import once from '../util/once'
import SubthoughtsDropEmpty from './Subthoughts/SubthoughtsDropEmpty'
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

/** Wraps a Thought component and calculates the child Path, style, etc. */
const Subthought = ({
  debugIndex,
  depth,
  env,
  indexDescendant,
  isMultiColumnTable,
  leaf,
  prevChildId,
  nextChildId,
  simplePath,
  zoomCursor,
}: {
  debugIndex?: number
  depth: number
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
  const { cursor } = state
  const thought = useSelector((state: State) => getThoughtById(state, head(simplePath)), _.isEqual)
  const path = useSelector((state: State) => rootedParentOf(state, simplePath), shallowEqual)

  // TODO
  const showContexts = false

  /***************************
   * Subthought properties

   * TODO: These can be optimized by calculating them once for all children, since they are the same among siblings. However siblings are not rendered contiguously (virtualTree), so they need to be calculated higher up.
   ***************************/
  const parentPath = useSelector((state: State) => rootedParentOf(state, simplePath), shallowEqual)

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
  const hideBullet = useSelector((state: State) => {
    const hideBulletsChildren = attribute(state, childrenAttributeId, '=bullet') === 'None'
    if (hideBulletsChildren) return true
    const hideBulletsGrandchildren =
      thought.value !== '=bullet' && attribute(state, grandchildrenAttributeId, '=bullet') === 'None'
    if (hideBulletsGrandchildren) return true
    return false
  })

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
  const isEditingChildPath = once(() => isDescendantPath(state.cursor, childPath))

  const style = useMemo(() => {
    const styleMerged: React.CSSProperties = {
      ...(thought.value !== '=children' ? styleChildren : null),
      ...(thought.value !== '=style' ? styleGrandchildren : null),
      ...(isEditingChildPath() ? getStyle(state, childEnvZoomId()) : null),
    }
    return styleMerged
  }, [styleGrandchildren, styleChildren, thought.value !== '=children', isEditingChildPath()])

  // TODO: ROOT gets appended when isContextPending
  // What should appendedChildPath be?
  const appendedChildPath = appendChildPath(state, childPath, path)
  const isChildCursor = cursor && equalPath(appendedChildPath, cursor)

  // console.log('One <Subthought>', prettyPath(childPath))
  // useWhyDidYouUpdate('One <Subthought> ' + prettyPath(state, childPath), {
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
  //   showContexts,
  //   styleChildren,
  //   styleGrandchildren,
  //   styleContainer,
  //   // hooks
  //   childPathUnstable,
  //   childPath,
  // })

  // Short circuit if thought has already been removed.
  // This can occur in a re-render even when thought is defined in the parent component.
  if (!thought) return null

  return (
    <div
      style={{
        opacity: autofocus === 'show' ? 1 : autofocus === 'dim' ? 0.5 : 0,
        pointerEvents: autofocus !== 'show' && autofocus !== 'dim' ? 'none' : undefined,
        transition: 'opacity 0.75s ease-out',
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
        isVisible={
          // if thought is a zoomed cursor then it is visible
          (isChildCursor && zoomCursor) || autofocus === 'show' || autofocus === 'dim'
        }
        key={thought.id}
        path={appendedChildPath}
        prevChildId={prevChildId}
        rank={thought.rank}
        // showContexts={showContexts}
        showContexts={false}
        simplePath={childPath}
        style={style}
        styleContainer={styleContainer}
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

const SubthoughtMemo = React.memo(Subthought)
SubthoughtMemo.displayName = 'Subthought'

export default SubthoughtMemo
