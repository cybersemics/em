import React, { useMemo, useRef } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Autofocus from '../@types/Autofocus'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import attributeEquals from '../selectors/attributeEquals'
import findFirstEnvContextWithZoom from '../selectors/findFirstEnvContextWithZoom'
import { findAnyChild } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import store from '../stores/app'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import once from '../util/once'
import NoOtherContexts from './NoOtherContexts'
import Thought from './Thought'

/** Renders a thought with style. */
// TODO: These selectors can be optimized by calculating them once for all children, since they are the same among siblings. However siblings are not rendered contiguously (virtualTree), so they need to be calculated higher up.
const Subthought = ({
  autofocus,
  debugIndex,
  depth,
  dropUncle,
  env,
  indexDescendant,
  isMultiColumnTable,
  leaf,
  updateSize,
  path,
  prevChildId,
  showContexts,
  simplePath,
  style,
  zoomCursor,
  marginRight,
}: {
  autofocus: Autofocus
  debugIndex?: number
  depth: number
  dropUncle?: boolean
  env?: LazyEnv
  indexDescendant: number
  isMultiColumnTable?: boolean
  leaf?: boolean
  updateSize?: () => void
  path: Path
  prevChildId?: ThoughtId
  showContexts?: boolean
  simplePath: SimplePath
  style?: React.CSSProperties
  zoomCursor?: boolean
  marginRight: number
}) => {
  const state = store.getState()
  const ref = useRef<HTMLDivElement>(null)
  const thought = useSelector(state => getThoughtById(state, head(simplePath)), shallowEqual)
  const noOtherContexts = useSelector(
    state => isContextViewActive(state, simplePath) && getContexts(state, thought.value).length <= 1,
  )
  const parentId = thought.parentId
  const grandparentId = simplePath[simplePath.length - 3]
  const isVisible = zoomCursor || autofocus === 'show' || autofocus === 'dim'

  const childrenAttributeId = useSelector(
    state =>
      (thought.value !== '=children' && findAnyChild(state, parentId, child => child.value === '=children')?.id) ||
      null,
  )
  const grandchildrenAttributeId = useSelector(
    state =>
      (thought.value !== '=style' &&
        findAnyChild(state, grandparentId, child => child.value === '=grandchildren')?.id) ||
      null,
  )
  const hideBullet = useSelector(state => {
    const hideBulletsChildren = attributeEquals(state, childrenAttributeId, '=bullet', 'None')
    if (hideBulletsChildren) return true
    const hideBulletsGrandchildren =
      thought.value !== '=bullet' && attributeEquals(state, grandchildrenAttributeId, '=bullet', 'None')
    if (hideBulletsGrandchildren) return true
    return false
  })

  /****************************/
  const childEnvZoomId = once(() => findFirstEnvContextWithZoom(state, { id: thought.id, env }))

  /** Returns true if the cursor is contained within the thought path, i.e. the thought is a descendant of the cursor. */
  const isEditingChildPath = isDescendantPath(state.cursor, path)

  const styleSelf = useMemo(
    () => ({
      ...(isEditingChildPath ? getStyle(state, childEnvZoomId()) : null),
      ...style,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditingChildPath, style],
  )

  // Short circuit if thought has already been removed.
  // This can occur in a re-render even when thought is defined in the parent component.
  if (!thought) return null

  return (
    <>
      <div ref={ref}>
        <Thought
          debugIndex={debugIndex}
          depth={depth + 1}
          env={env}
          hideBullet={hideBullet}
          isContextPending={thought.value === '__PENDING__'}
          leaf={leaf}
          // isHeader={isHeader}
          isHeader={false}
          isMultiColumnTable={isMultiColumnTable}
          isVisible={isVisible}
          updateSize={updateSize}
          path={path}
          prevChildId={prevChildId}
          rank={thought.rank}
          showContexts={showContexts}
          simplePath={simplePath}
          style={styleSelf}
          marginRight={marginRight}
        />
      </div>

      {noOtherContexts && <NoOtherContexts simplePath={simplePath} />}
    </>
  )
}

export default Subthought
