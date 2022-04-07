/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect } from 'react'
import { ThunkDispatch } from 'redux-thunk'
import { connect } from 'react-redux'
import { store } from '../store'
import globals from '../globals'
import { alert, dragHold, dragInProgress, setCursor, toggleTopControlsAndBreadcrumbs } from '../action-creators'
import { DROP_TARGET, GLOBAL_STYLE_ENV, MAX_DISTANCE_FROM_CURSOR, TIMEOUT_BEFORE_DRAG, VIEW_MODE } from '../constants'
import { compareReasonable } from '../util/compareThought'
import { ThoughtId, Context, Index, Path, SimplePath, State, ThoughtContext } from '../@types'

// components
import Bullet from './Bullet'
import Byline from './Byline'
import Note from './Note'
import StaticThought from './StaticThought'
import Subthoughts from './Subthoughts.native'
import DragAndDropThought, { ConnectedDraggableThoughtContainerProps } from './DragAndDropThought'

// hooks
import useIsChildHovering from '../hooks/useIsChildHovering'
import useLongPress from '../hooks/useLongPress'

// util
import {
  equalArrays,
  equalPath,
  hashContext,
  hashPath,
  head,
  headId,
  headValue,
  isDescendantPath,
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
  childIdsToThoughts,
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
import { StyleSheet } from 'react-native'
import ThoughtAnnotation from './ThoughtAnnotation'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

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
  env?: Index<Context>
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
  isHovering?: boolean
  isParentHovering?: boolean
  isVisible?: boolean
  prevChild?: ThoughtId | ThoughtContext
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
  isDragging?: boolean
  isPublishChild?: boolean
  isEditing?: boolean
  isLeaf?: boolean
  isVisible?: boolean
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
  const contextLive = pathToContext(state, simplePathLive)

  const distance = cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth!)) : 0

  const isExpandedHoverTopPath = expandHoverTopPath && equalPath(path, expandHoverTopPath)

  // Note: If the thought is the active expand hover top path then it should be treated as a cursor parent. It is because the current implementation allows tree to unfold visually starting from cursor parent.
  const isCursorParent =
    isExpandedHoverTopPath ||
    (!!cursor &&
      (distance === 2
        ? // grandparent
          equalPath(rootedParentOf(state, parentOf(cursor)), path) &&
          getChildren(state, pathToContext(state, cursor)).length === 0
        : // parent
          equalPath(parentOf(cursor), path)))

  const contextBinding = parseJsonSafe(attribute(state, contextLive, '=bindContext') ?? '') as SimplePath | undefined

  // Note: An active expand hover top thought cannot be a cusor's grandparent as it is already treated as cursor's parent.
  const isCursorGrandparent =
    !isExpandedHoverTopPath && !!cursor && equalPath(rootedParentOf(state, parentOf(cursor)), path)

  const isExpanded = !!expanded[hashPath(path)]
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
    contextLive,
  }
}

const { directionRow, alignItemsCenter, marginBottom } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: ThunkDispatch<State, unknown, any>, props: ThoughtContainerProps) => ({
  toggleTopControlsAndBreadcrumbs: () => dispatch(toggleTopControlsAndBreadcrumbs(false)),
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
  path,
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
  isDragging,
  isEditing,
  isEditingPath,
  isBeingHoveredOver,
  isExpanded,
  isHovering,
  isLeaf,
  isParentHovering,
  isVisible,
  prevChild,
  publish,
  rank,
  showContexts,
  style,
  simplePath,
  simplePathLive,
  view,
  toggleTopControlsAndBreadcrumbs,
}: ConnectedDraggableThoughtContainerProps) => {
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

  const value = headValue(state, simplePathLive!)

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(rootedParentOf(state, simplePath))])

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render

  const children = childrenForced
    ? childIdsToThoughts(state, childrenForced) ?? []
    : getChildrenRanked(state, pathToContext(state, contextBinding || simplePathLive))

  const showContextBreadcrumbs =
    showContexts && (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  const thoughts = pathToContext(state, simplePath)
  const context = parentOf(thoughts)
  const childrenOptions = getAllChildrenAsThoughts(state, [...context, '=options'])
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

  const draggingThoughtValue = state.draggingThought ? head(pathToContext(state, state.draggingThought)) : null

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
      (!prevChild || compareReasonable(draggingThoughtValue, prevChild.value) === 1)
    : // if alphabetical sort is disabled just check if current thought is hovering
      globals.simulateDropHover || isHovering

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

  const isProseView = hideBullet

  return (
    <View style={marginBottom}>
      <View style={[directionRow, alignItemsCenter]}>
        {!(publish && context.length === 0) && (!isLeaf || !isPublishChild) && !hideBullet && (
          <Bullet
            isEditing={isEditing}
            context={pathToContext(state, simplePath)}
            leaf={isLeaf}
            onClick={() => {
              if (!isEditing || children.length === 0) {
                store.dispatch(setCursor({ path: simplePath }))
              }
            }}
            simplePath={simplePath}
            hideBullet={hideBullet}
            publish={publish}
          />
        )}

        {isProseView && <View style={styles(isEditing).proseView} />}

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
          path={path}
          cursorOffset={cursorOffset}
          homeContext={homeContext}
          isVisible={isVisible}
          isPublishChild={isPublishChild}
          isEditing={isEditing}
          rank={rank}
          showContextBreadcrumbs={showContextBreadcrumbs}
          showContexts={showContexts}
          style={styleNew}
          simplePath={simplePath}
          toggleTopControlsAndBreadcrumbs={toggleTopControlsAndBreadcrumbs}
          view={view}
        />
      </View>
      <Note path={simplePathLive} />

      {publish && context.length === 0 && <Byline context={thoughts} />}

      <Subthoughts
        allowSingleContext={allowSingleContext}
        childrenForced={childrenForced}
        env={env}
        path={path}
        depth={depth}
        isParentHovering={isAnyChildHovering}
        showContexts={allowSingleContext}
        simplePath={simplePath}
        view={view}
      />
    </View>
  )
}

/** Styles. */
const styles = (isEditing?: boolean) =>
  StyleSheet.create({
    proseView: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'white',
      opacity: isEditing ? 0.2 : 0,
      marginRight: 15,
    },
  })

ThoughtContainer.displayName = 'ThoughtContainer'

// export connected, drag and drop higher order thought component
const ThoughtComponent = connect(mapStateToProps, mapDispatchToProps)(ThoughtContainer)

export default ThoughtComponent
