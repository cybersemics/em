import classNames from 'classnames'
import React, { useCallback, useMemo } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
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
import globals from '../globals'
import useDragHold from '../hooks/useDragHold'
import useHideBullet from '../hooks/useHideBullet'
import useHoveringPath from '../hooks/useHoveringPath'
import useThoughtStyle from '../hooks/useThoughtStyle'
import useThoughtStyleContainer from '../hooks/useThoughtStyleContainer'
import attribute from '../selectors/attribute'
import attributeEquals from '../selectors/attributeEquals'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import themeColors from '../selectors/themeColors'
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
import parentOf from '../util/parentOf'
import publishMode from '../util/publishMode'
import safeRefMerge from '../util/safeRefMerge'
import Bullet from './Bullet'
import Byline from './Byline'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import DragAndDropThought, { DraggableThoughtContainerProps } from './DragAndDropThought'
import DropHover from './DropHover'
import Note from './Note'
import StaticThought from './StaticThought'

/**********************************************************************
 * Redux
 **********************************************************************/

export interface ThoughtContainerProps {
  allowSingleContext?: boolean
  childrenForced?: ThoughtId[]
  cursor?: Path | null
  // used by globals.simulateDrop
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
  isHeader?: boolean
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
const ThoughtContainer = ({
  allowSingleContext,
  childrenForced,
  cursor,
  debugIndex,
  depth = 0,
  dragPreview,
  dragSource,
  dropTarget,
  env,
  hideBullet: hideBulletProp,
  isBeingHoveredOver,
  isDeepHovering,
  isDragging,
  isHeader,
  isHovering,
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
}: DraggableThoughtContainerProps) => {
  const dispatch = useDispatch()
  const thoughtId = head(simplePath)
  const children = useSelector(
    state => (childrenForced ? childIdsToThoughts(state, childrenForced) : getChildrenRanked(state, head(simplePath))),
    // only compare id, value, and rank for re-renders
    equalChildren,
  )
  useHoveringPath(path, isBeingHoveredOver, DropThoughtZone.ThoughtDrop)
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
      ...(isChildHovering ? { color: colors.highlight, WebkitTextStrokeWidth: '0.05em' } : null),
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

  return dropTarget(
    dragSource(
      <div
        {...dragHoldResult.props}
        aria-label='child'
        style={{
          // so that .thought can be sized at 100% and .thought .bullet-cursor-overlay bullet can be positioned correctly.
          position: 'relative',
          // match Editable padding
          marginTop: '0.501em',
          transition: 'transform 0.75s ease-out, opacity 0.75s ease-out',
          ...style,
          ...styleContainer,
          // extend the click area to the left (except if table column 2)
          marginLeft: `calc(${style?.marginLeft || 0}${!isTableCol2 ? ' - 100px' : ''})`,
          paddingLeft: `calc(${style?.paddingLeft || 0}${!isTableCol2 ? ' - 100px' : ''})`,
          ...(globals.simulateDrop
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
          function: isAttribute(value), // eslint-disable-line quote-props
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
        ref={el => {
          if (el) {
            dragPreview()
          }
        }}
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
          className='thought-container'
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
            />
          )}

          <DropHover isHovering={isHovering} prevChildId={prevChildId} simplePath={simplePath} />

          <StaticThought
            allowSingleContext={allowSingleContext}
            env={env}
            isContextPending={isContextPending}
            isEditing={isEditing}
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
      </div>,
    ),
  )
}

ThoughtContainer.displayName = 'ThoughtContainer'

// export drag and drop higher order thought component
const ThoughtComponent = DragAndDropThought(ThoughtContainer)
const ThoughtComponentMemo = React.memo(ThoughtComponent)
ThoughtComponentMemo.displayName = 'ThoughtComponent'

export default ThoughtComponentMemo
