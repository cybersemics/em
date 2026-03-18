import React, { useEffect, useMemo, useRef } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Autofocus from '../@types/Autofocus'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import useCachedThoughtHtml from '../hooks/useCachedThoughtHtml'
import useChangeRef from '../hooks/useChangeRef'
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
  env,
  isMultiColumnTable,
  leaf,
  updateSize,
  path,
  prevChildId,
  showContexts,
  simplePath,
  style,
  zoomCursor,
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
}) => {
  const state = store.getState()
  const ref = useRef<HTMLDivElement>(null)
  const thought = useSelector(state => getThoughtById(state, head(simplePath)), shallowEqual)
  // Cache the thought HTML before it is deleted so that we can animate on unmount
  const cachedThoughtHtmlRef = useCachedThoughtHtml({ thought, elementRef: ref })
  const noOtherContexts = useSelector(
    state => thought && isContextViewActive(state, simplePath) && getContexts(state, thought.value).length <= 1,
  )
  const grandparentId = simplePath[simplePath.length - 3]
  const isVisible = zoomCursor || autofocus === 'show' || autofocus === 'dim'
  const autofocusChanged = useChangeRef(autofocus)

  const childrenAttributeId = useSelector(
    state =>
      (thought &&
        thought.value !== '=children' &&
        findAnyChild(state, thought.parentId, child => child.value === '=children')?.id) ||
      null,
  )
  const grandchildrenAttributeId = useSelector(
    state =>
      (thought &&
        thought.value !== '=style' &&
        findAnyChild(state, grandparentId, child => child.value === '=grandchildren')?.id) ||
      null,
  )
  const isSplitThought = useSelector(
    state => state.lastUndoableActionType === 'splitThought' && state.cursor && head(state.cursor) === head(simplePath),
  )
  const hideBullet = useSelector(state => {
    const hideBulletsChildren = attributeEquals(state, childrenAttributeId, '=bullet', 'None')
    if (hideBulletsChildren) return true
    const hideBulletsGrandchildren =
      thought && thought.value !== '=bullet' && attributeEquals(state, grandchildrenAttributeId, '=bullet', 'None')
    if (hideBulletsGrandchildren) return true
    return false
  })

  /****************************/
  const childEnvZoomId = once(() => (thought ? findFirstEnvContextWithZoom(state, { id: thought.id, env }) : null))

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

  // Start opacity at 0 on initial render and set to actual opacity in useEffect to fade in.
  const opacity = autofocus === 'show' ? '1' : autofocus === 'dim' ? '0.5' : '0'
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.opacity = opacity
  })

  // If the thought has unmounted, return the cached static HTML from the ref so that it can animate out.
  if (!thought) {
    return cachedThoughtHtmlRef.current ? (
      <div dangerouslySetInnerHTML={{ __html: cachedThoughtHtmlRef.current }} />
    ) : null
  }

  return (
    <>
      <div
        ref={ref}
        className={css({
          // Start opacity at 0 on initial render and set to actual opacity in useEffect to fade in. See useEffect above.
          // Do not fade in during integration tests. The useEffect can be flaky and cause the test to fail on GitHub Actions.
          //   See: https://github.com/cybersemics/em/actions/runs/14115358795?pr=2872
          // Do not fade in empty thoughts. An instant snap in feels better here.
          // opacity creates a new stacking context, so it must only be applied to Thought, not to the outer VirtualThought which contains DropChild. Otherwise subsequent DropChild will be obscured.
          // Do not fade in when a split creates a new thought; it should snap in instantly.
          opacity: thought.value === '' || navigator.webdriver || isSplitThought ? opacity : '0',
          // When autofocus changes, use a slow (750ms) ease-out to provide a gentle transition to non-focal thoughts.
          // If autofocus has not changed, it means that the thought is being rendered for the first time, such as the children of a thought that was just expanded. In this case, match the tree-node top animation (150ms) to ensure that the newly rendered thoughts fade in to fill the space that is being opened up from the next uncle animating down.
          // Note that ease-in is used in contrast to the tree-node's ease-out. This gives a little more time for the next uncle to animate down and clear space before the newly rendered thought fades in. Otherwise they overlap too much during the transition.
          transition: autofocusChanged
            ? `opacity {durations.layoutSlowShift} ease-out`
            : `opacity {durations.layoutNodeAnimation} ease-in`,
          pointerEvents: !isVisible ? 'none' : undefined,
          // Safari has a known issue with subpixel calculations, especially during animations and with SVGs.
          // This caused the thought to jerk slightly to the left at the end of the horizontal shift animation.
          // By setting "will-change: transform;", we hint to the browser that the transform property will change in the future,
          // allowing the browser to optimize the animation.
          willChange: 'opacity',
        })}
      >
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
        />
      </div>

      {noOtherContexts && <NoOtherContexts simplePath={simplePath} />}
    </>
  )
}

export default Subthought
