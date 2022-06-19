import React, { useEffect } from 'react'
import { ThunkDispatch } from 'redux-thunk'
import { connect, useSelector } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'
import globals from '../globals'
import { isTouch } from '../browser'
import alert from '../action-creators/alert'
import dragHold from '../action-creators/dragHold'
import dragInProgress from '../action-creators/dragInProgress'
import setCursor from '../action-creators/setCursor'
import toggleTopControlsAndBreadcrumbs from '../action-creators/toggleTopControlsAndBreadcrumbs'
import { DROP_TARGET, GLOBAL_STYLE_ENV, HOME_TOKEN, MAX_DISTANCE_FROM_CURSOR, TIMEOUT_BEFORE_DRAG } from '../constants'
import { compareReasonable } from '../util/compareThought'
import ThoughtId from '../@types/ThoughtId'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Thought from '../@types/Thought'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'

// components
import Bullet from './Bullet'
import Byline from './Byline'
import Note from './Note'
import StaticThought from './StaticThought'
import Subthoughts from './Subthoughts'
// import ThoughtAnnotation from './ThoughtAnnotation'
import DragAndDropThought, { ConnectedDraggableThoughtContainerProps } from './DragAndDropThought'

// hooks
import useIsChildHovering from '../hooks/useIsChildHovering'
import useLongPress from '../hooks/useLongPress'

// util
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headId from '../util/headId'
import isDescendantPath from '../util/isDescendantPath'
import isDivider from '../util/isDivider'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import parseJsonSafe from '../util/parseJsonSafe'
import pathToContext from '../util/pathToContext'
import publishMode from '../util/publishMode'
import safeRefMerge from '../util/safeRefMerge'

// selectors
import attribute from '../selectors/attribute'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import findDescendant from '../selectors/findDescendant'
import { getChildren, getChildrenRanked, getAllChildrenAsThoughts, hasChildren } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'

/**********************************************************************
 * Redux
 **********************************************************************/

export interface ThoughtContainerProps {
  allowSingleContext?: boolean
  childrenForced?: ThoughtId[]
  contextBinding?: Path
  path: Path
  cursor?: Path | null
  depth?: number
  env?: Index<ThoughtId>
  expandedContextThought?: Path
  hideBullet?: boolean
  isDeepHovering?: boolean
  isPublishChild?: boolean
  isCursorGrandparent?: boolean
  isCursorParent?: boolean
  isDragging?: boolean
  isEditing?: boolean
  isEditingPath?: boolean
  isExpanded?: boolean
  isHeader?: boolean
  isHovering?: boolean
  isMultiColumnTable?: boolean
  isParentHovering?: boolean
  // true if the thought is not hidden by autofocus, i.e. actualDistance < 2
  // currently this does not control visibility, but merely tracks it
  isVisible?: boolean
  prevChild?: Thought
  publish?: boolean
  rank: number
  showContexts?: boolean
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  simplePath: SimplePath
  view?: string | null
}

interface ThoughtProps {
  cursorOffset?: number | null
  homeContext?: boolean
  isPublishChild?: boolean
  isEditing?: boolean
  // true if the thought is not hidden by autofocus, i.e. actualDistance < 2
  // currently this does not control visibility, but merely tracks it
  isVisible?: boolean
  path: Path
  rank: number
  showContextBreadcrumbs?: boolean
  showContexts?: boolean
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  simplePath: SimplePath
  view?: string | null
  editing?: boolean | null
}

export type ConnectedThoughtProps = ThoughtProps & Partial<ReturnType<typeof mapDispatchToProps>>

export type ConnectedThoughtContainerProps = ThoughtContainerProps & ReturnType<typeof mapStateToProps>

export type ConnectedThoughtDispatchProps = ReturnType<typeof mapDispatchToProps>

const EMPTY_OBJECT = {}

/** Gets a globally defined style. */
const getGlobalStyle = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.style

/** Gets a globally defined bullet. */
const getGlobalBullet = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.bullet

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ThoughtContainerProps) => {
  const { cursor, cursorOffset, expanded, expandedContextThought, search, expandHoverTopPath, editing } = state

  const { path, simplePath, depth } = props

  // check if the cursor path includes the current thought
  const isEditingPath = isDescendantPath(cursor, path)

  // check if the cursor is editing a thought directly
  const isEditing = equalPath(cursor, path)

  const distance = cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth!)) : 0

  const isExpandedHoverTopPath = expandHoverTopPath && equalPath(path, expandHoverTopPath)

  // Note: If the thought is the active expand hover top path then it should be treated as a cursor parent. It is because the current implementation allows tree to unfold visually starting from cursor parent.
  const isCursorParent =
    isExpandedHoverTopPath ||
    (!!cursor &&
      (distance === 2
        ? // grandparent
          equalPath(rootedParentOf(state, parentOf(cursor)), path) && getChildren(state, head(cursor)).length === 0
        : // parent
          equalPath(parentOf(cursor), path)))

  const contextBinding = parseJsonSafe(attribute(state, head(simplePath), '=bindContext') ?? '') as
    | SimplePath
    | undefined

  // Note: An active expand hover top thought cannot be a cusor's grandparent as it is already treated as cursor's parent.
  const isCursorGrandparent =
    !isExpandedHoverTopPath && !!cursor && equalPath(rootedParentOf(state, parentOf(cursor)), path)

  const isExpanded = !!expanded[hashPath(path)]
  const isLeaf = !hasChildren(state, head(simplePath))

  return {
    contextBinding,
    cursorOffset,
    distance,
    isPublishChild: !search && publishMode() && simplePath.length === 2,
    isCursorParent,
    isCursorGrandparent,
    expandedContextThought,
    isEditing,
    isEditingPath,
    isExpanded,
    isLeaf,
    publish: !search && publishMode(),
    view: attribute(state, head(simplePath), '=view'),
    parentView: attribute(state, head(parentOf(simplePath)), '=view'),
    editing,
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: ThunkDispatch<State, unknown, any>, props: ThoughtContainerProps) => ({
  // when the thought is edited, hide the top controls and breadcrumbs for distraction-free typing
  onEdit: ({ context, oldValue, newValue }: { context: Context; oldValue: string; newValue: string }) => {
    // only hide when typing, not when deleting
    if (newValue.length > oldValue.length) {
      dispatch(toggleTopControlsAndBreadcrumbs(false))
    }
  },
})

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
  contextBinding,
  cursor,
  cursorOffset,
  depth = 0,
  dragPreview,
  dragSource,
  dropTarget,
  editing,
  env,
  expandedContextThought,
  hideBullet: hideBulletProp,
  isBeingHoveredOver,
  isCursorGrandparent,
  isCursorParent,
  isDeepHovering,
  isDragging,
  isEditing,
  isEditingPath,
  isExpanded,
  isHeader,
  isHovering,
  isLeaf,
  isMultiColumnTable,
  isParentHovering,
  isPublishChild,
  isVisible,
  onEdit,
  parentView,
  path,
  prevChild,
  publish,
  rank,
  showContexts,
  simplePath,
  style,
  styleContainer,
  view,
}: ConnectedDraggableThoughtContainerProps) => {
  const state = store.getState()
  const thoughtId = head(simplePath)
  let thoughts: Context
  try {
    thoughts = pathToContext(state, simplePath)
  } catch (e) {
    console.error(e)
    thoughts = [HOME_TOKEN]
  }
  const context = parentOf(thoughts)
  const parentId = head(rootedParentOf(state, simplePath))

  useEffect(() => {
    if (isBeingHoveredOver) {
      store.dispatch(
        dragInProgress({
          value: true,
          draggingThought: state.draggingThought,
          hoveringPath: path,
          hoverId: DROP_TARGET.ThoughtDrop,
        }),
      )
    }
  }, [isBeingHoveredOver])

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = () => {
    if (!store.getState().dragHold) {
      store.dispatch([
        dragHold({ value: true, simplePath }),
        alert('Drag and drop to move thought', { showCloseLink: false }),
      ])
    }
  }

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = () => {
    if (store.getState().dragHold) {
      store.dispatch([dragHold({ value: false }), alert(null)])
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const longPressHandlerProps = useLongPress(onLongPressStart, onLongPressEnd, TIMEOUT_BEFORE_DRAG)

  const value = head(thoughts)

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(rootedParentOf(state, simplePath))])

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render

  const children = childrenForced
    ? childIdsToThoughts(state, childrenForced)
    : getChildrenRanked(state, head(simplePath)) // TODO: contextBinding

  const showContextBreadcrumbs =
    showContexts && (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  const optionsId = findDescendant(state, parentId, '=options')
  const childrenOptions = getAllChildrenAsThoughts(state, optionsId)

  const options =
    !isAttribute(value) && childrenOptions.length > 0
      ? childrenOptions.map(thought => {
          return thought.value.toLowerCase()
        })
      : null

  /** Load styles from child expressions that are found in the environment. */
  const styleEnv = children
    .filter(
      child =>
        child.value in GLOBAL_STYLE_ENV ||
        // children that have an entry in the environment
        (child.value in { ...env } &&
          // do not apply to =let itself i.e. =let/x/=style should not apply to =let
          child.id !== env![child.value]),
    )
    .map(child => (child.value in { ...env } ? getStyle(state, env![child.value]) : getGlobalStyle(child.value) || {}))
    .reduce<React.CSSProperties>(
      (accum, style) => ({
        ...accum,
        ...style,
      }),
      // use stable object reference
      EMPTY_OBJECT,
    )

  const styleContainerEnv = children
    .filter(
      child =>
        child.value in GLOBAL_STYLE_ENV ||
        // children that have an entry in the environment
        (child.value in { ...env } &&
          // do not apply to =let itself i.e. =let/x/=style should not apply to =let
          child.id !== env![child.value]),
    )
    .map(child => (child.value in { ...env } ? getStyle(state, env![child.value], { container: true }) : {}))
    .reduce<React.CSSProperties>(
      (accum, style) => ({
        ...accum,
        ...style,
      }),
      // use stable object reference
      EMPTY_OBJECT,
    )

  /** Load =bullet from child expressions that are found in the environment. */
  const bulletEnv = () =>
    children
      .filter(
        child =>
          child.value in GLOBAL_STYLE_ENV ||
          // children that have an entry in the environment
          (child.value in { ...env } &&
            // do not apply to =let itself i.e. =let/x/=style should not apply to =let
            child.id !== env![child.value]),
      )
      .map(child =>
        child.value in { ...env } ? attribute(state, env![child.value], '=bullet') : getGlobalBullet(child.value),
      )

  const hideBullet = hideBulletProp || bulletEnv().some(envChildBullet => envChildBullet === 'None')

  const styleSelf = useSelector((state: State) => getStyle(state, thoughtId))
  const styleContainerSelf = getStyle(state, thoughtId, { container: true })
  const zoomId = findDescendant(state, thoughtId, ['=focus', 'Zoom'])
  const styleContainerZoom = isEditingPath ? getStyle(state, zoomId, { container: true }) : null

  const cursorOnAlphabeticalSort = cursor && getSortPreference(state, thoughtId).type === 'Alphabetical'

  const draggingThoughtValue = state.draggingThought
    ? getThoughtById(state, headId(state.draggingThought))?.value
    : null

  const isAnyChildHovering = useIsChildHovering(thoughts, isHovering, isDeepHovering)

  /** Checks if any descendents of the direct siblings is being hovered. */
  const isAnySiblingDescendantHovering = () =>
    !isHovering &&
    state.hoveringPath &&
    isDescendantPath(state.hoveringPath, parentOf(path)) &&
    (state.hoveringPath.length !== path.length || state.hoverId === DROP_TARGET.EmptyDrop)

  const shouldDisplayHover = cursorOnAlphabeticalSort
    ? // if alphabetical sort is enabled check if drag is in progress and parent element is hovering
      state.dragInProgress &&
      isParentHovering &&
      draggingThoughtValue &&
      !isAnySiblingDescendantHovering() &&
      // check if it's alphabetically previous to current thought
      compareReasonable(draggingThoughtValue, value) <= 0 &&
      // check if it's alphabetically next to previous thought if it exists
      // @MIGRATION_TODO: Convert prevChild to thought and get the value
      (!prevChild || compareReasonable(draggingThoughtValue, prevChild.value) === 1)
    : // if alphabetical sort is disabled just check if current thought is hovering
      globals.simulateDropHover || isHovering

  // avoid re-renders from object reference change
  const styleNew = safeRefMerge(style, styleEnv, styleSelf)
  const styleContainerNew = safeRefMerge(styleContainer, styleContainerEnv, styleContainerSelf)

  return dropTarget(
    dragSource(
      <li
        style={{
          ...styleContainerNew,
          ...styleContainerZoom,
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
          'invalid-option': options ? !options.includes(value.toLowerCase()) : null,
          'is-multi-column': isMultiColumnTable,
          // if editing and expansion is suppressed, mark as a leaf so that bullet does not show expanded
          // this is a bit of a hack since the bullet transform checks leaf instead of expanded
          // TODO: Consolidate with isLeaf if possible
          leaf: isLeaf || (isEditing && globals.suppressExpansion),
          // prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
          prose: view === 'Prose',
          'show-contexts': showContexts,
          'show-contexts-no-breadcrumbs': simplePath.length === 2,
          // must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component. showContext is not updated when the context view is toggled, since the Thought should not be re-rendered.
          'table-view': view === 'Table' && !isContextViewActive(state, path),
        })}
        ref={el => {
          if (el) {
            dragPreview()
          }
        }}
        // disable to test if this solves the app switch touch issue on mobile PWA
        // { ...longPressHandlerProps }
      >
        <div className='thought-container' style={hideBullet ? { marginLeft: -12 } : {}}>
          {!(publish && context.length === 0) && (!isLeaf || !isPublishChild) && !hideBullet && (
            <Bullet
              isEditing={isEditing}
              leaf={isLeaf}
              onClick={(e: React.MouseEvent) => {
                if (!isEditing || children.length === 0) {
                  e.stopPropagation()
                  store.dispatch(setCursor({ path: simplePath }))
                }
              }}
              simplePath={simplePath}
              thoughtId={thoughtId}
              hideBullet={hideBullet}
              publish={publish}
              isDragging={isDragging}
            />
          )}

          <span
            className='drop-hover'
            style={{
              display: shouldDisplayHover ? 'inline' : 'none',
            }}
          ></span>

          {/* <ThoughtAnnotation
            env={env}
            path={path}
            homeContext={homeContext}
            minContexts={allowSingleContext ? 0 : 2}
            showContextBreadcrumbs={showContextBreadcrumbs}
            showContexts={showContexts}
            style={styleNew || undefined}
            simplePath={simplePath}
          /> */}

          <StaticThought
            path={path}
            cursorOffset={cursorOffset}
            homeContext={homeContext}
            isPublishChild={isPublishChild}
            isEditing={isEditing}
            isVisible={isVisible}
            rank={rank}
            showContextBreadcrumbs={showContextBreadcrumbs}
            showContexts={showContexts}
            style={styleNew || undefined}
            simplePath={simplePath}
            onEdit={!isTouch ? onEdit : undefined}
            view={view}
            editing={editing}
          />

          <Note path={simplePath} />
        </div>

        {publish && context.length === 0 && <Byline context={thoughts} />}

        {/* In a multi column view, a table's grandchildren are rendered as additional columns. Since the Subthoughts component is styled as a table-cell, we render a separate Subthoughts component for each column. We use childPath instead of path in order to skip the repeated grandchild which serves as the column name and rendered separately as a header row. */}
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
                isParentHovering={isAnyChildHovering}
                showContexts={allowSingleContext}
                simplePath={isHeader ? simplePath : childSimplePath}
              />
            )
          })
        ) : (
          <Subthoughts
            allowSingleContext={allowSingleContext}
            childrenForced={childrenForced}
            env={env}
            path={path}
            depth={depth}
            isParentHovering={isAnyChildHovering}
            showContexts={allowSingleContext}
            simplePath={simplePath}
          />
        )}
      </li>,
    ),
  )
}

ThoughtContainer.displayName = 'ThoughtContainer'

// export connected, drag and drop higher order thought component
const ThoughtComponent = connect(mapStateToProps, mapDispatchToProps)(DragAndDropThought(ThoughtContainer))

export default ThoughtComponent
