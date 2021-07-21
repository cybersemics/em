/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect } from 'react'
import { ThunkDispatch } from 'redux-thunk'
import { connect } from 'react-redux'
import { store } from '../store'
import globals from '../globals'
import { alert, dragHold, dragInProgress, setCursor, toggleTopControlsAndBreadcrumbs } from '../action-creators'
import { DROP_TARGET, GLOBAL_STYLE_ENV, MAX_DISTANCE_FROM_CURSOR, TIMEOUT_BEFORE_DRAG } from '../constants'
import { compareReasonable } from '../util/compareThought'
import { Child, Context, Index, Path, SimplePath, State, ThoughtContext } from '../@types'

// components
import Bullet from './Bullet'
import Byline from './Byline'
import Note from './Note'
import StaticThought from './StaticThought'
import Subthoughts from './Subthoughts'
import DragAndDropThought, { ConnectedDraggableThoughtContainerProps } from './DragAndDropThought'

// hooks
import useIsChildHovering from '../hooks/useIsChildHovering'
import useLongPress from '../hooks/useLongPress'

// util
import {
  equalArrays,
  equalPath,
  hashContext,
  head,
  headValue,
  isDescendantPath,
  isDivider,
  isFunction,
  isRoot,
  parentOf,
  parseJsonSafe,
  pathToContext,
  publishMode,
} from '../util'

// selectors
import {
  attribute,
  getAllChildren,
  getChildren,
  getChildrenRanked,
  getSortPreference,
  getStyle,
  hasChildren,
  isContextViewActive,
  rootedParentOf,
} from '../selectors'
import { View } from 'moti'
import { commonStyles } from '../style/commonStyles'
import ThoughtAnnotation from './ThoughtAnnotation'

/**********************************************************************
 * Redux
 **********************************************************************/

export interface ThoughtContainerProps {
  allowSingleContext?: boolean
  childrenForced?: Child[]
  contextBinding?: Path
  path: Path
  count?: number
  cursor?: Path | null
  depth?: number
  env?: Index<Context>
  expandedContextThought?: Path
  hideBullet?: boolean
  isDeepHovering?: boolean
  isPublishChild?: boolean
  isCursorGrandparent?: boolean
  isCursorParent?: boolean
  isDraggable?: boolean
  isDragging?: boolean
  isEditing?: boolean
  isEditingPath?: boolean
  isExpanded?: boolean
  isHovering?: boolean
  isParentHovering?: boolean
  prevChild?: Child | ThoughtContext
  publish?: boolean
  rank: number
  showContexts?: boolean
  style?: React.CSSProperties
  simplePath: SimplePath
  simplePathLive?: SimplePath
  view?: string | null
}

interface ThoughtProps {
  cursorOffset?: number | null
  env?: Index<Context>
  hideBullet?: boolean
  homeContext?: boolean
  isDraggable?: boolean
  isDragging?: boolean
  isPublishChild?: boolean
  isEditing?: boolean
  isLeaf?: boolean
  path: Path
  publish?: boolean
  rank: number
  showContextBreadcrumbs?: boolean
  showContexts?: boolean
  style?: React.CSSProperties
  simplePath: SimplePath
  view?: string | null
}

export type ConnectedThoughtProps = ThoughtProps &
  Pick<ReturnType<typeof mapDispatchToProps>, 'toggleTopControlsAndBreadcrumbs'>

export type ConnectedThoughtContainerProps = ThoughtContainerProps & ReturnType<typeof mapStateToProps>

export type ConnectedThoughtDispatchProps = ReturnType<typeof mapDispatchToProps>

const EMPTY_OBJECT = {}

/** Gets a globally defined style. */
const getGlobalStyle = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.style

/** Gets a globally defined bullet. */
const getGlobalBullet = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.bullet

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ThoughtContainerProps) => {
  const { cursor, cursorOffset, expanded, expandedContextThought, search, expandHoverTopPath } = state

  const { path, simplePath, showContexts, depth } = props

  // check if the cursor path includes the current thought
  const isEditingPath = isDescendantPath(cursor, path)

  // check if the cursor is editing a thought directly
  const isEditing = equalPath(cursor, path)

  const simplePathLive = isEditing
    ? (parentOf(simplePath).concat(head(showContexts ? parentOf(cursor!) : cursor!)) as SimplePath)
    : simplePath
  const contextLive = pathToContext(simplePathLive)

  const distance = cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth!)) : 0

  const isExpandedHoverTopPath = expandHoverTopPath && equalPath(path, expandHoverTopPath)

  // Note: If the thought is the active expand hover top path then it should be treated as a cursor parent. It is because the current implementation allows tree to unfold visually starting from cursor parent.
  const isCursorParent =
    isExpandedHoverTopPath ||
    (distance === 2
      ? // grandparent
        equalPath(rootedParentOf(state, parentOf(cursor || [])), path) &&
        getChildren(state, pathToContext(cursor || [])).length === 0
      : // parent
        equalPath(parentOf(cursor || []), path))

  const contextBinding = parseJsonSafe(attribute(state, contextLive, '=bindContext') ?? '') as SimplePath | undefined

  // Note: An active expand hover top thought cannot be a cusor's grandparent as it is already treated as cursor's parent.
  const isCursorGrandparent = !isExpandedHoverTopPath && equalPath(rootedParentOf(state, parentOf(cursor || [])), path)

  const isExpanded = !!expanded[hashContext(pathToContext(path))]
  const isLeaf = !hasChildren(state, contextLive)

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
    simplePathLive,
    view: attribute(state, contextLive, '=view'),
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: ThunkDispatch<State, unknown, any>) => ({
  toggleTopControlsAndBreadcrumbs: () => dispatch(toggleTopControlsAndBreadcrumbs(false)),
  setCursorOnNote:
    ({ path }: { path: Path }) =>
    () =>
      dispatch(
        setCursor({
          path,
          cursorHistoryClear: true,
          editing: true,
          noteFocus: true,
        }),
      ),
})

const { directionRow, alignItemsCenter, marginBottom } = commonStyles

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
  path,
  count = 0,
  cursor,
  cursorOffset,
  depth = 0,
  dragPreview,
  dragSource,
  dropTarget,
  env,
  expandedContextThought,
  hideBullet: hideBulletProp,
  isDeepHovering,
  isPublishChild,
  isCursorGrandparent,
  isCursorParent,
  isDraggable,
  isDragging,
  isEditing,
  isEditingPath,
  isBeingHoveredOver,
  isExpanded,
  isHovering,
  isLeaf,
  isParentHovering,
  prevChild,
  publish,
  rank,
  setCursorOnNote,
  showContexts,
  style,
  simplePath,
  simplePathLive,
  view,
  toggleTopControlsAndBreadcrumbs,
}: ConnectedDraggableThoughtContainerProps) => {
  cursor = cursor || []

  const state = store.getState()

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
        dragHold({ value: true, simplePath: simplePathLive }),
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

  const value = headValue(simplePathLive!)

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(rootedParentOf(state, simplePath))])

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render

  const children = childrenForced || getChildrenRanked(state, pathToContext(contextBinding || simplePathLive))

  const showContextBreadcrumbs =
    showContexts && (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  const thoughts = pathToContext(simplePath)
  const thoughtsLive = pathToContext(simplePathLive!)
  const context = parentOf(thoughts)
  const childrenOptions = getAllChildren(state, [...context, '=options'])
  const options =
    !isFunction(value) && childrenOptions.length > 0 ? childrenOptions.map(child => child.value.toLowerCase()) : null

  /** Load styles from child expressions that are found in the environment. */
  const styleEnv = children
    .filter(
      child =>
        child.value in GLOBAL_STYLE_ENV ||
        // children that have an entry in the environment
        (child.value in { ...env } &&
          // do not apply to =let itself i.e. =let/x/=style should not apply to =let
          !equalArrays([...thoughts, child.value], env![child.value])),
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

  /** Load =bullet from child expressions that are found in the environment. */
  const bulletEnv = () =>
    children
      .filter(
        child =>
          child.value in GLOBAL_STYLE_ENV ||
          // children that have an entry in the environment
          (child.value in { ...env } &&
            // do not apply to =let itself i.e. =let/x/=style should not apply to =let
            !equalArrays([...thoughts, child.value], env![child.value])),
      )
      .map(child =>
        child.value in { ...env } ? attribute(state, env![child.value], '=bullet') : getGlobalBullet(child.value),
      )

  const hideBullet = hideBulletProp || bulletEnv().some(envChildBullet => envChildBullet === 'None')

  const styleSelf = getStyle(state, thoughts)
  const styleContainer = getStyle(state, thoughts, { container: true })
  const styleContainerZoom = isEditingPath
    ? getStyle(state, thoughts.concat('=focus', 'Zoom'), { container: true })
    : null

  const cursorOnAlphabeticalSort = cursor && getSortPreference(state, context).type === 'Alphabetical'

  const draggingThoughtValue = state.draggingThought ? head(pathToContext(state.draggingThought)) : null

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
      (!prevChild || compareReasonable(draggingThoughtValue, (prevChild as Child).value) === 1)
    : // if alphabetical sort is disabled just check if current thought is hovering
      globals.simulateDropHover || isHovering

  const { direction: sortDirection, type: sortType } = getSortPreference(
    store.getState(),
    pathToContext(simplePathLive!),
  )

  // avoid re-renders from object reference change
  const styleNew =
    Object.keys(styleSelf || {}).length > 0 ||
    (Object.keys(styleEnv || {}).length > 0 && Object.keys(style || {}).length > 0)
      ? {
          ...style,
          ...styleEnv,
          ...styleSelf,
        }
      : Object.keys(styleEnv || {}).length > 0
      ? styleEnv
      : style

  return (
    <>
      <View style={[directionRow, alignItemsCenter, marginBottom]}>
        {!(publish && context.length === 0) && (!isLeaf || !isPublishChild) && !hideBullet && (
          <Bullet
            isEditing={isEditing}
            context={pathToContext(simplePath)}
            leaf={isLeaf}
            onClick={(e: React.MouseEvent) => {
              if (!isEditing || children.length === 0) {
                e.stopPropagation()
                store.dispatch(setCursor({ path: simplePath }))
              }
            }}
          />
        )}

        {/* // Todo: still need to decide the best approach to implement the annotations.
        <ThoughtAnnotation
          env={env}
          path={path}
          homeContext={homeContext}
          minContexts={allowSingleContext ? 0 : 2}
          showContextBreadcrumbs={showContextBreadcrumbs}
          showContexts={showContexts}
          style={styleNew}
          simplePath={simplePath}
        /> */}

        <StaticThought
          env={env}
          path={path}
          cursorOffset={cursorOffset}
          hideBullet
          homeContext={homeContext}
          isDraggable={isDraggable}
          isDragging={isDragging}
          isPublishChild={isPublishChild}
          isEditing={isEditing}
          isLeaf={isLeaf}
          publish={publish}
          rank={rank}
          showContextBreadcrumbs={showContextBreadcrumbs}
          showContexts={showContexts}
          style={styleNew}
          simplePath={simplePath}
          toggleTopControlsAndBreadcrumbs={toggleTopControlsAndBreadcrumbs}
          view={view}
        />
        <Note context={thoughtsLive} onFocus={setCursorOnNote({ path: path })} />
      </View>

      {publish && context.length === 0 && <Byline context={thoughts} />}

      <Subthoughts
        allowSingleContext={allowSingleContext}
        childrenForced={childrenForced}
        env={env}
        path={path}
        count={count}
        depth={depth}
        isParentHovering={isAnyChildHovering}
        showContexts={allowSingleContext}
        simplePath={simplePath}
        sortType={sortType}
        sortDirection={sortDirection}
      />
    </>
  )
}

ThoughtContainer.displayName = 'ThoughtContainer'

// export connected, drag and drop higher order thought component
const ThoughtComponent = connect(mapStateToProps, mapDispatchToProps)(ThoughtContainer)

export default ThoughtComponent
