import classNames from 'classnames'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { token } from '../../styled-system/tokens'
import Autofocus from '../@types/Autofocus'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { expandContextThoughtActionCreator as expandContextThought } from '../actions/expandContextThought'
import { isTouch } from '../browser'
import { AlertType, MAX_DISTANCE_FROM_CURSOR, REGEX_TAGS } from '../constants'
import testFlags from '../e2e/testFlags'
import globals from '../globals'
import useChangeRef from '../hooks/useChangeRef'
import useDragAndDropThought from '../hooks/useDragAndDropThought'
import useDragHold from '../hooks/useDragHold'
import useHideBullet from '../hooks/useHideBullet'
import useHoveringPath from '../hooks/useHoveringPath'
import useThoughtStyle from '../hooks/useThoughtStyle'
import useThoughtStyleContainer from '../hooks/useThoughtStyleContainer'
import attribute from '../selectors/attribute'
import attributeEquals from '../selectors/attributeEquals'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import findDescendant from '../selectors/findDescendant'
import findFirstEnvContextWithZoom from '../selectors/findFirstEnvContextWithZoom'
import { findAnyChild } from '../selectors/getChildren'
import { getAllChildrenAsThoughts, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import themeColors from '../selectors/themeColors'
import store from '../stores/app'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import equalPath from '../util/equalPath'
import equalThoughtRanked from '../util/equalThoughtRanked'
import fastClick from '../util/fastClick'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'
import isURL from '../util/isURL'
import once from '../util/once'
import parentOf from '../util/parentOf'
import publishMode from '../util/publishMode'
import safeRefMerge from '../util/safeRefMerge'
import Bullet from './Bullet'
import Byline from './Byline'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import DropHover from './DropHover'
import NoOtherContexts from './NoOtherContexts'
import Note from './Note'
import StaticThought from './StaticThought'

/**********************************************************************
 * Redux
 **********************************************************************/

export interface ThoughtProps {
  allowSingleContext?: boolean
  childrenForced?: ThoughtId[]
  cursor?: Path | null
  // used by testFlags.simulateDrop
  debugIndex?: number
  depth?: number
  env?: LazyEnv
  expandedContextThought?: Path
  hideBullet?: boolean
  // See: ThoughtProps['isContextPending']
  isContextPending?: boolean
  isCursorParent?: boolean
  isDeepHovering?: boolean
  isDragging?: boolean
  isEditing?: boolean
  isEditingPath?: boolean
  isExpanded?: boolean
  // isHeader?: boolean
  isHovering?: boolean
  isMultiColumnTable?: boolean
  isPublishChild?: boolean
  // See: ThoughtProps['isVisible']
  isVisible?: boolean
  leaf?: boolean
  path: Path
  prevChildId?: ThoughtId
  publish?: boolean
  rank: number
  showContexts?: boolean
  simplePath: SimplePath
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  updateSize?: () => void
}

/** Returns true if two lists of children are equal. Deeply compares id, value, and rank. */
const equalChildren = (a: Thought[], b: Thought[]) =>
  a === b ||
  (a && b && a.length === b.length && a.every((thought, i) => equalThoughtRanked(a[i], b[i]) && a[i].id === b[i].id))

/**********************************************************************
 * Components
 **********************************************************************/

/** A thought container with bullet, thought annotation, thought, and subthoughts.
 *
  @param allowSingleContext  Pass through to Subthoughts since the SearchSubthoughts component does not have direct access to the Subthoughts of the Subthoughts of the search. Default: false.
 */
const ThoughtComponent = ({
  allowSingleContext,
  childrenForced,
  cursor,
  debugIndex,
  depth = 0,
  env,
  hideBullet: hideBulletProp,
  // isHeader,
  isMultiColumnTable,
  isContextPending,
  isVisible,
  leaf,
  path,
  prevChildId,
  rank,
  showContexts,
  simplePath,
  style: styleProp,
  styleContainer: styleContainerProp,
  updateSize,
}: ThoughtProps) => {
  const dispatch = useDispatch()
  const thoughtId = head(simplePath)
  const children = useSelector<Thought[]>(
    state => (childrenForced ? childIdsToThoughts(state, childrenForced) : getChildrenRanked(state, head(simplePath))),
    // only compare id, value, and rank for re-renders
    equalChildren,
  )
  // const contextBinding = useSelector(
  //   state => parseJsonSafe(attribute(state, head(simplePath), '=bindContext') ?? '') as SimplePath | undefined,
  // )
  // const parentView = useSelector(state => attribute(state, head(parentOf(simplePath)), '=view'))
  const expandedContextThought = useSelector(state => state.expandedContextThought)
  const view = useSelector(state => attribute(state, head(simplePath), '=view'))
  const isExpanded = useSelector(state => !!state.expanded[hashPath(path)])

  // Note: An active expand hover top thought cannot be a cursor's grandparent as it is already treated as cursor's parent.
  const isCursorGrandparent = useSelector(state => {
    const isExpandedHoverTopPath = state.expandHoverUpPath && equalPath(path, state.expandHoverUpPath)
    const cursorParent = state.cursor && parentOf(state.cursor)
    const cursorGrandparent = cursorParent && rootedParentOf(state, cursorParent)
    return !isExpandedHoverTopPath && !!cursor && equalPath(cursorGrandparent, path)
  })

  // Note: If the thought is the active expand hover top path then it should be treated as a cursor parent. It is because the current implementation allows tree to unfold visually starting from cursor parent.
  const isCursorParent = useSelector(state => {
    const isExpandedHoverTopPath = state.expandHoverUpPath && equalPath(path, state.expandHoverUpPath)
    if (isExpandedHoverTopPath) return true
    if (!state.cursor) return false

    const distance = cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth!)) : 0
    const cursorParent = state.cursor && parentOf(state.cursor)
    const cursorGrandparent = cursorParent && rootedParentOf(state, cursorParent)

    return distance === 2
      ? // grandparent
        equalPath(cursorGrandparent, path) && !hasChildren(state, head(state.cursor))
      : // parent
        equalPath(cursorParent, path)
  })

  const { isDragging, dragSource, isHovering, isBeingHoveredOver, dropTarget } = useDragAndDropThought({
    path,
    simplePath,
    isVisible,
    isCursorParent,
  })

  useHoveringPath(path, isBeingHoveredOver, DropThoughtZone.ThoughtDrop)
  // check if the cursor is editing a thought directly
  const isEditing = useSelector(state => equalPath(state.cursor, path))

  const isPublishChild = useSelector(state => !state.search && publishMode() && simplePath.length === 2)
  const publish = useSelector(state => !state.search && publishMode())
  const isTableCol2 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table'),
  )

  const hideBullet = useHideBullet({ children, env, hideBulletProp, isEditing, simplePath, thoughtId })
  const style = useThoughtStyle({ children, env, styleProp, thoughtId })
  const colors = useSelector(themeColors)
  const styleAnnotation = useSelector(
    state =>
      safeRefMerge(
        // apply normal style color to the annotation style
        style?.color ? { color: style.color } : null,
        // apply annotation style (mainly used for background color)
        getStyle(state, head(simplePath), { attributeName: '=styleAnnotation' }),
      ),
    shallowEqual,
  )
  const styleContainer = useThoughtStyleContainer({ children, env, styleContainerProp, thoughtId, path })
  const value = useSelector(state => getThoughtById(state, thoughtId)?.value)

  // must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component. showContext is not updated when the context view is toggled, since the Thought should not be re-rendered.
  const isTable = useSelector(state => view === 'Table' && !isContextViewActive(state, path))

  const dragHoldResult = useDragHold({
    isDragging,
    simplePath,
    sourceZone: DragThoughtZone.Thoughts,
  })

  const homeContext = useSelector(state => {
    const pathParent = rootedParentOf(state, path)
    const showContexts = isContextViewActive(state, path)
    return showContexts && isRoot(pathParent)
  })

  // true if the thought has an invalid option
  const invalidOption = useSelector(state => {
    const thought = getThoughtById(state, thoughtId)
    if (!thought) return false

    const parentId = head(rootedParentOf(state, simplePath))
    const optionsId = findDescendant(state, parentId, '=options')
    const childrenOptions = getAllChildrenAsThoughts(state, optionsId)

    const options =
      !isAttribute(thought.value) && childrenOptions.length > 0
        ? childrenOptions.map(thought => thought.value.toLowerCase())
        : null
    const invalidOption = options ? !options.includes(value.toLowerCase()) : false

    return invalidOption
  })

  /** True if a dragged thought is hovering over a visible child of the current thought (ThoughtDrop or SubthoughtsDrop). This determines if the parent should be highlighted. */
  // TODO: It would be nice if we could reuse canDrop.
  const isChildHovering = useSelector(
    state =>
      !!isVisible &&
      !!state.hoveringPath &&
      // Do not highlight parent of dragging thought (i.e. when simply reordering but not moving to a new parent).
      // Reordering is a less destructive action that does not need to bring attention to the parent.
      state.draggingThought &&
      !equalPath(rootedParentOf(state, state.draggingThought), simplePath) &&
      !isContextViewActive(state, path) &&
      // SubthoughtsDrop
      // Can drop on SubthoughtsDrop if this thought is being hovered over.
      ((state.hoverZone === DropThoughtZone.SubthoughtsDrop && equalPath(simplePath, state.hoveringPath)) ||
        // ThoughtDrop
        // Can drop on ThoughtDrop if this thought is a parent of the hovered thought, and not a descendant of the dragging thought.
        (state.hoverZone === DropThoughtZone.ThoughtDrop &&
          equalPath(rootedParentOf(state, state.hoveringPath), simplePath) &&
          !isDescendantPath(simplePath, state.draggingThought))) &&
      state.alert?.alertType !== AlertType.DeleteDropHint &&
      state.alert?.alertType !== AlertType.CopyOneDropHint,
  )

  // when the thought is edited on desktop, hide the top controls and breadcrumbs for distraction-free typing
  const onEdit = useCallback(({ newValue, oldValue }: { newValue: string; oldValue: string }) => {
    // only hide when typing, not when deleting
    // strip HTML tags, otherwise Formatting shortcuts will trigger distractionFreeTyping
    if (newValue.replace(REGEX_TAGS, '').length > oldValue.replace(REGEX_TAGS, '').length) {
      distractionFreeTypingStore.updateThrottled(true)
    }
  }, [])

  // Styles applied to the .thought-annotation and .editable
  // Highlight the parent of the current drop target to make it easier to drop in the intended place.
  // Use -webkit-text-stroke-width instead of font-weight:bold, as bold changes the width of the text and can cause the thought to become multiline during a drag. This can even create an oscillation effect as the increased Thought height triggers a different hoveringPath ad infinitum (often resulting in a Shaker cancel false positive).
  // See: https://stackoverflow.com/a/46452396/480608
  const styleThought = useMemo(
    (): React.CSSProperties => ({
      /** Animation to apply to a parent when one of its children is being hovered over. Disabled in puppeteer tests. */
      ...(isChildHovering
        ? {
            WebkitTextStrokeWidth: '0.05em',
            animation: `pulse-light ${token('durations.highlightPulseDuration')} linear infinite alternate`,
            color: colors.highlight,
          }
        : null),
      // textDecoration does not inherit from inline-block elements, so we apply it here instead of .child
      textDecoration: style?.textDecoration,
    }),
    [colors.highlight, isChildHovering, style?.textDecoration],
  )

  // useWhyDidYouUpdate('<Thought> ' + prettyPath(store.getState(), simplePath), {
  //   allowSingleContext,
  //   childrenForced,
  //   contextBinding,
  //   cursor,
  //   debugIndex,
  //   depth,
  //   dragPreview,
  //   dragSource,
  //   dropTarget,
  //   env,
  //   expandedContextThought,
  //   hideBulletProp,
  //   isBeingHoveredOver,
  //   isCursorGrandparent,
  //   isCursorParent,
  //   isDeepHovering,
  //   isDragging,
  //   isEditing,
  //   isExpanded,
  //   isHeader,
  //   isHovering,
  //   isMultiColumnTable,
  //   isContextPending,
  //   isPublishChild,
  //   isVisible,
  //   leaf,
  //   parentView,
  //   path,
  //   prevChildId,
  //   publish,
  //   rank,
  //   showContexts,
  //   simplePath,
  //   styleProp,
  //   styleContainerProp,
  //   view,
  //   // hooks
  //   children,
  //   hideBullet,
  //   style,
  //   styleAnnotation,
  //   styleContainer,
  //   thought,
  //   grandparent,
  //   homeContext,
  //   isTable,
  //   invalidOption,
  //   isChildHovering,
  //   placeholder,
  //   styleHover,
  //   ...dragHoldResult.props,
  // })

  // thought does not exist
  if (value == null) return null

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: Subthoughts render

  const showContextBreadcrumbs =
    showContexts && (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  return (
    <div
      {...dragHoldResult.props}
      ref={node => dragSource(dropTarget(node))}
      aria-label='child'
      style={{
        // so that .thought can be sized at 100% and .thought .bullet-cursor-overlay bullet can be positioned correctly.
        position: 'relative',
        transition: `transform ${token('durations.layoutSlowShiftDuration')} ease-out, opacity ${token('durations.layoutSlowShiftDuration')} ease-out`,
        ...style,
        ...styleContainer,
        // extend the click area to the left (except if table column 2)
        marginLeft: `calc(${style?.marginLeft || 0}${!isTableCol2 ? ' - 100px' : ''})`,
        paddingLeft: `calc(${style?.paddingLeft || 0}${!isTableCol2 ? ' - 100px' : ''})`,
        ...(testFlags.simulateDrop
          ? {
              backgroundColor: `hsl(150, 50%, ${20 + 5 * ((depth + (debugIndex || 0)) % 2)}%)`,
            }
          : null),
      }}
      className={classNames({
        child: true,
        'child-divider': isDivider(value),
        'cursor-parent': isCursorParent,
        'cursor-grandparent': isCursorGrandparent,
        // used so that the autofocus can properly highlight the immediate parent of the cursor
        editing: isEditing,
        expanded: isExpanded,
        'has-only-child': children.length === 1,
        'invalid-option': invalidOption,
        'is-multi-column': isMultiColumnTable,
        leaf: leaf || (isEditing && globals.suppressExpansion),
        pressed: dragHoldResult.isPressed,
        // prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
        prose: view === 'Prose',
        'show-contexts': showContexts,
        'show-contexts-no-breadcrumbs': simplePath.length === 2,
        'table-view': isTable,
      })}
    >
      {showContexts && simplePath.length > 1 ? (
        <ContextBreadcrumbs path={parentOf(simplePath)} homeContext={homeContext} />
      ) : showContexts && simplePath.length > 2 ? (
        <span className='ellipsis'>
          <a
            tabIndex={-1}
            {...fastClick(() => {
              dispatch(expandContextThought(path))
            })}
          >
            ...{' '}
          </a>
        </span>
      ) : null}

      <div
        className={classNames({
          'thought-container': true,
          'single-line': !isEditing && isURL(value),
        })}
        data-testid={'thought-' + hashPath(path)}
        style={{
          // ensure that ThoughtAnnotation is positioned correctly
          position: 'relative',
          ...(hideBullet ? { marginLeft: -12 } : null),
        }}
      >
        {!(publish && simplePath.length === 0) && (!leaf || !isPublishChild) && !hideBullet && (
          <Bullet
            isContextPending={isContextPending}
            isDragging={isDragging}
            isEditing={isEditing}
            leaf={leaf}
            path={path}
            publish={publish}
            simplePath={simplePath}
            thoughtId={thoughtId}
            // debugIndex={debugIndex}
            // depth={depth}
          />
        )}

        <DropHover isHovering={isHovering} prevChildId={prevChildId} simplePath={simplePath} />

        <StaticThought
          allowSingleContext={allowSingleContext}
          env={env}
          isContextPending={isContextPending}
          isEditing={isEditing}
          ellipsizedUrl={!isEditing && isURL(value)}
          isPublishChild={isPublishChild}
          isVisible={isVisible}
          onEdit={!isTouch ? onEdit : undefined}
          path={path}
          rank={rank}
          showContextBreadcrumbs={showContextBreadcrumbs && value !== '__PENDING__'}
          simplePath={simplePath}
          style={styleThought}
          styleAnnotation={styleAnnotation || undefined}
          styleThought={styleThought}
          updateSize={updateSize}
          view={view}
        />

        <Note path={simplePath} />
      </div>

      {publish && simplePath.length === 0 && <Byline id={head(parentOf(simplePath))} />}

      {/* In a multi column view, a table's grandchildren are rendered as additional columns. Since the Subthoughts component is styled as a table-cell, we render a separate Subthoughts component for each column. We use childPath instead of path in order to skip the repeated grandchild which serves as the column name and rendered separately as a header row.
      {isMultiColumnTable ? (
        children.map((child, i) => {
          const childPath = appendToPath(path, child.id)
          const childSimplePath = appendToPath(simplePath, child.id)
          return (
            <Subthoughts
              key={child.id}
              allowSingleContext={allowSingleContext}
              env={env}
              path={isHeader ? path : childPath}
              depth={depth}
              isHeader={isHeader}
              showContexts={allowSingleContext}
              simplePath={isHeader ? simplePath : childSimplePath}
            />
          )
        })
      ) : (
        <Subthoughts
          allowSingleContext={allowSingleContext}
          childrenForced={childrenForced}
          depth={depth}
          env={env}
          path={path}
          showContexts={allowSingleContext}
          simplePath={simplePath}
        />
      )} */}
    </div>
  )
}

ThoughtComponent.displayName = 'Thought'
const ThoughtMemo = React.memo(ThoughtComponent)

/** Renders a thought with style. */
// TODO: These selectors can be optimized by calculating them once for all children, since they are the same among siblings. However siblings are not rendered contiguously (virtualTree), so they need to be calculated higher up.
const ThoughtContainer = ({
  autofocus,
  debugIndex,
  depth,
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
}: {
  autofocus: Autofocus
  debugIndex?: number
  depth: number
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
  const noOtherContexts = useSelector(
    state => isContextViewActive(state, simplePath) && getContexts(state, thought.value).length <= 1,
  )
  const parentId = thought.parentId
  const grandparentId = simplePath[simplePath.length - 3]
  const isVisible = zoomCursor || autofocus === 'show' || autofocus === 'dim'
  const autofocusChanged = useChangeRef(autofocus)

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

  // When autofocus changes, use a slow (750ms) ease-out to provide a gentle transition to non-focal thoughts.
  // If autofocus has not changed, it means that the thought is being rendered for the first time, such as the children of a thought that was just expanded. In this case, match the tree-node top animation (150ms) to ensure that the newly rendered thoughts fade in to fill the space that is being opened up from the next uncle animating down.
  // Note that ease-in is used in contrast to the tree-node's ease-out. This gives a little more time for the next uncle to animate down and clear space before the newly rendered thought fades in. Otherwise they overlap too much during the transition.
  const opacity = autofocus === 'show' ? '1' : autofocus === 'dim' ? '0.5' : '0'
  const opacityTransition = autofocusChanged
    ? `opacity ${token('durations.layoutSlowShiftDuration')} ease-out`
    : `opacity ${token('durations.layoutNodeAnimationDuration')} ease-in`
  useEffect(() => {
    if (!ref.current) return
    // start opacity at 0 and set to actual opacity in useEffect
    ref.current.style.opacity = opacity
  })

  // Short circuit if thought has already been removed.
  // This can occur in a re-render even when thought is defined in the parent component.
  if (!thought) return null

  return (
    <>
      <div
        ref={ref}
        style={{
          // Start opacity at 0 and set to actual opacity in useEffect.
          // Do not fade in empty thoughts. An instant snap in feels better here.
          // opacity creates a new stacking context, so it must only be applied to Thought, not to the outer VirtualThought which contains DropChild. Otherwise subsequent DropChild will be obscured.
          opacity: thought.value === '' ? opacity : '0',
          transition: opacityTransition,
          pointerEvents: !isVisible ? 'none' : undefined,
          // Safari has a known issue with subpixel calculations, especially during animations and with SVGs.
          // This caused the thought to jerk slightly to the left at the end of the horizontal shift animation.
          // By setting "will-change: transform;", we hint to the browser that the transform property will change in the future,
          // allowing the browser to optimize the animation.
          willChange: 'opacity',
        }}
      >
        <ThoughtMemo
          debugIndex={debugIndex}
          depth={depth + 1}
          env={env}
          hideBullet={hideBullet}
          isContextPending={thought.value === '__PENDING__'}
          leaf={leaf}
          // isHeader={isHeader}
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

export default ThoughtContainer
