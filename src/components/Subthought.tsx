import React, { useMemo } from 'react'
import Autofocus from '../@types/Autofocus'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtType from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import globals from '../globals'
import appendChildPath from '../selectors/appendChildPath'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import getChildPath from '../selectors/getChildPath'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getStyle from '../selectors/getStyle'
import store from '../stores/app'
import equalPath from '../util/equalPath'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import once from '../util/once'
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
  allowSingleContext,
  autofocus,
  child,
  depth,
  distance,
  env,
  hideBullet,
  index,
  isHeader,
  isMultiColumnTable,
  zoomCursor,
  parentPath,
  path,
  prevChildId,
  showContexts,
  styleChildren,
  styleGrandchildren,
  styleContainer,
}: {
  allowSingleContext?: boolean
  autofocus?: Autofocus
  child: ThoughtType
  depth: number
  distance: number
  env?: LazyEnv
  hideBullet?: boolean
  index?: number
  isHeader?: boolean
  isMultiColumnTable?: boolean
  zoomCursor?: boolean
  parentPath: SimplePath
  path?: Path
  prevChildId?: ThoughtId
  showContexts: boolean
  styleChildren?: React.CSSProperties
  styleContainer?: React.CSSProperties
  styleGrandchildren?: React.CSSProperties
}) => {
  const state = store.getState()
  const { cursor } = state

  // getChildPath cannot be trivially memoized since it is not a pure function; its return value depends on which thoughts are loaded.
  // Memoizing it naively can result in not re-rendering contexts in the context view while they are loading.
  // There is no way to determine a priori whether a thought id's path to the root is fully loaded without traversing up the tree.
  // Instead we do a double memoization to minimize re-renders.
  const childPathUnstable = useMemo(
    // First, memoize the child path with, in addition to the parameters, the thought index (only if context view is activated, as full paths are guaranteed to be loaded in normal view).
    // This is O(depth) for each child, but is is only recalculated when the Subthoughts component is re-rendered; it won't trigger any additional re-renders of the child thought (due to the next memoization step).
    // However, childPathUnstable has a new object reference every time the thought index changes.
    () => getChildPath(state, child.id, parentPath, showContexts),
    [child.id, parentPath, showContexts, showContexts && state.thoughts.thoughtIndex],
  )
  // Second, therefore, memoize childPathUnstable based on its length, since we know that if thoughtToPath returns an array of the same length for the same id, then it is the same path.
  const childPath = useMemo(
    () => childPathUnstable,
    [child.id, parentPath, showContexts, showContexts && childPathUnstable.length],
  )

  const childEnvZoomId = once(() => findFirstEnvContextWithZoom(state, { id: child.id, env }))

  /** Returns true if the cursor is contained within the child path, i.e. the child is a descendant of the cursor. */
  const isEditingChildPath = once(() => isDescendantPath(state.cursor, childPath))

  const style = useMemo(() => {
    const styleMerged: React.CSSProperties = {
      ...(child.value !== '=children' ? styleChildren : null),
      ...(child.value !== '=style' ? styleGrandchildren : null),
      ...(isEditingChildPath() ? getStyle(state, childEnvZoomId()) : null),
    }
    return styleMerged
  }, [styleGrandchildren, styleChildren, child.value !== '=children', isEditingChildPath()])

  // TODO: ROOT gets appended when isContextPending
  // What should appendedChildPath be?
  const appendedChildPath = appendChildPath(state, childPath, path)
  const isChildCursor = cursor && equalPath(appendedChildPath, cursor)

  /*
              simply using index i as key will result in very sophisticated rerendering when new Empty thoughts are added.
              The main problem is that when a new Thought is added it will get key (index) of the previous thought,
              causing React DOM to think it as old component that needs re-render and thus the new thoughyt won't be able to mount itself as a new component.

              By using child's rank we have unique key for every new thought.
              Using unique rank will help React DOM to properly identify old components and the new one. Thus eliminating sophisticated
              re-renders.
            */

  // console.log('One <Subthought>', prettyPath(childPath))
  // useWhyDidYouUpdate('One <Subthought> ' + prettyPath(state, childPath), {
  //   actualDistance,
  //   allowSingleContext,
  //   autofocus,
  //   child,
  //   depth,
  //   distance,
  //   env,
  //   hideBullet,
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

  return child ? (
    <Thought
      autofocus={autofocus}
      debugIndex={globals.simulateDrop ? index : undefined}
      depth={depth + 1}
      env={env}
      hideBullet={hideBullet}
      isContextPending={child.value === '__PENDING__'}
      isHeader={isHeader}
      isMultiColumnTable={isMultiColumnTable}
      isVisible={
        // if thought is a zoomed cursor then it is visible
        (isChildCursor && zoomCursor) ||
        autofocus === 'show' ||
        autofocus === 'dim' ||
        (distance === 2 && isEditingChildPath())
      }
      key={child.id}
      path={appendedChildPath}
      prevChildId={prevChildId}
      rank={child.rank}
      showContexts={showContexts}
      simplePath={childPath}
      style={style}
      styleContainer={styleContainer}
    />
  ) : null
}

const SubthoughtMemo = React.memo(Subthought)
SubthoughtMemo.displayName = 'Subthought'

export default SubthoughtMemo
