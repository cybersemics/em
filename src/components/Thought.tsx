import classNames from 'classnames'
import React, { useEffect } from 'react'
import { connect, useSelector } from 'react-redux'
import { ThunkDispatch } from 'redux-thunk'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import alert from '../action-creators/alert'
import dragHold from '../action-creators/dragHold'
import dragInProgress from '../action-creators/dragInProgress'
import expandContextThought from '../action-creators/expandContextThought'
import toggleTopControlsAndBreadcrumbs from '../action-creators/toggleTopControlsAndBreadcrumbs'
import { isTouch } from '../browser'
import { DROP_TARGET, MAX_DISTANCE_FROM_CURSOR, TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'
import globals from '../globals'
import useIsChildHovering from '../hooks/useIsChildHovering'
import useLongPress from '../hooks/useLongPress'
import attribute from '../selectors/attribute'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts, getChildren, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import { store } from '../store'
import appendToPath from '../util/appendToPath'
import { compareReasonable } from '../util/compareThought'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import headId from '../util/headId'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import parseJsonSafe from '../util/parseJsonSafe'
import publishMode from '../util/publishMode'
import Bullet from './Bullet'
import Byline from './Byline'
import { ContextBreadcrumbs } from './ContextBreadcrumbs'
import DragAndDropThought, { ConnectedDraggableThoughtContainerProps } from './DragAndDropThought'
import Note from './Note'
import StaticThought from './StaticThought'
import Subthoughts from './Subthoughts'
import useHideBullet from './Thought.useHideBullet'
import useStyle from './Thought.useStyle'
import useStyleContainer from './Thought.useStyleContainer'
import ThoughtAnnotation from './ThoughtAnnotation'

/**********************************************************************
 * Redux
 **********************************************************************/

export interface ThoughtContainerProps {
  allowSingleContext?: boolean
  childrenForced?: ThoughtId[]
  contextBinding?: Path
  cursor?: Path | null
  depth?: number
  env?: Index<ThoughtId>
  expandedContextThought?: Path
  hideBullet?: boolean
  // See: ThoughtProps['isContextPending']
  isContextPending?: boolean
  isCursorGrandparent?: boolean
  isCursorParent?: boolean
  isDeepHovering?: boolean
  isDragging?: boolean
  isEditing?: boolean
  isEditingPath?: boolean
  isExpanded?: boolean
  isHeader?: boolean
  isHovering?: boolean
  isMultiColumnTable?: boolean
  isParentHovering?: boolean
  isPublishChild?: boolean
  // See: ThoughtProps['isVisible']
  isVisible?: boolean
  path: Path
  prevChild?: Thought
  publish?: boolean
  rank: number
  showContexts?: boolean
  simplePath: SimplePath
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  view?: string | null
}

interface ThoughtProps {
  cursorOffset?: number | null
  editing?: boolean | null
  // When context view is activated, some contexts may be pending
  // however since they were not loaded hierarchically there is not a pending thought in the thoughtIndex
  // getContexts will return ids that do not exist in the thoughtIndex
  // Subthoughts gets the special __PENDING__ value from getContexts and passes it through to Thought and Static Thought
  isContextPending?: boolean
  isEditing?: boolean
  isPublishChild?: boolean
  // true if the thought is not hidden by autofocus, i.e. actualDistance < 2
  // currently this does not control visibility, but merely tracks it
  isVisible?: boolean
  path: Path
  rank: number
  showContextBreadcrumbs?: boolean
  showContexts?: boolean
  simplePath: SimplePath
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  view?: string | null
}

export type ConnectedThoughtProps = ThoughtProps & Partial<ReturnType<typeof mapDispatchToProps>>

export type ConnectedThoughtContainerProps = ThoughtContainerProps & ReturnType<typeof mapStateToProps>

export type ConnectedThoughtDispatchProps = ReturnType<typeof mapDispatchToProps>

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ThoughtContainerProps) => {
  const { cursor, cursorOffset, expanded, expandedContextThought, search, expandHoverTopPath, editing } = state

  const { path, simplePath, depth } = props

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
  onEdit: ({ oldValue, newValue }: { oldValue: string; newValue: string }) => {
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
  isExpanded,
  isHeader,
  isHovering,
  isLeaf,
  isMultiColumnTable,
  isParentHovering,
  isContextPending,
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
  style: styleProp,
  styleContainer: styleContainerProp,
  view,
}: ConnectedDraggableThoughtContainerProps) => {
  const thoughtId = head(simplePath)
  const children = useSelector((state: State) =>
    childrenForced ? childIdsToThoughts(state, childrenForced) : getChildrenRanked(state, head(simplePath)),
  )

  useEffect(() => {
    if (isBeingHoveredOver) {
      store.dispatch((dispatch, getState) =>
        dispatch(
          dragInProgress({
            value: true,
            draggingThought: getState().draggingThought,
            hoveringPath: path,
            hoverId: DROP_TARGET.ThoughtDrop,
          }),
        ),
      )
    }
  }, [isBeingHoveredOver])

  const hideBullet = useHideBullet({ children, env, hideBulletProp, isEditing, simplePath, thoughtId })
  const isAnyChildHovering = useIsChildHovering(simplePath, isHovering, isDeepHovering)
  const style = useStyle({ children, env, styleProp, thoughtId })
  const styleContainer = useStyleContainer({ children, env, styleContainerProp, thoughtId, path })
  const thought = useSelector((state: State) => getThoughtById(state, thoughtId))
  const grandparent = useSelector((state: State) => rootedParentOf(state, rootedParentOf(state, simplePath)))

  // must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component. showContext is not updated when the context view is toggled, since the Thought should not be re-rendered.
  const isTable = useSelector((state: State) => view === 'Table' && !isContextViewActive(state, path))

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = () => {
    if (!store.getState().dragHold) {
      store.dispatch([
        dragHold({ value: true, simplePath }),
        alert('Drag and drop to move thought', { alertType: 'dragAndDrop', showCloseLink: false }),
      ])
    }
  }

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = () => {
    if (store.getState().dragHold) {
      store.dispatch([dragHold({ value: false }), alert(null)])
    }
  }

  const longPressHandlerProps = useLongPress(onLongPressStart, onLongPressEnd, TIMEOUT_LONG_PRESS_THOUGHT)

  const homeContext = useSelector((state: State) => {
    const pathParent = rootedParentOf(state, path)
    const showContexts = isContextViewActive(state, path)
    return showContexts && isRoot(pathParent)
  })

  // true if the thought has an invalid option
  const invalidOption = useSelector((state: State) => {
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

  const shouldDisplayHover = useSelector((state: State) => {
    /** Checks if any descendents of the direct siblings is being hovered. */
    const isAnySiblingDescendantHovering = () =>
      !isHovering &&
      state.hoveringPath &&
      isDescendantPath(state.hoveringPath, parentOf(path)) &&
      (state.hoveringPath.length !== path.length || state.hoverId === DROP_TARGET.EmptyDrop)

    const cursorOnAlphabeticalSort = cursor && getSortPreference(state, thoughtId).type === 'Alphabetical'

    const draggingThoughtValue = state.draggingThought
      ? getThoughtById(state, headId(state.draggingThought))?.value
      : null

    return cursorOnAlphabeticalSort
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
  })

  if (!thought) return null

  const value = thought.value

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: Subthoughts render

  const showContextBreadcrumbs =
    showContexts && (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  return dropTarget(
    dragSource(
      <li
        aria-label='thought-container'
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
          // if editing and expansion is suppressed, mark as a leaf so that bullet does not show expanded
          // this is a bit of a hack since the bullet transform checks leaf instead of expanded
          // TODO: Consolidate with isLeaf if possible
          leaf: isLeaf || (isEditing && globals.suppressExpansion),
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
        {...longPressHandlerProps}
        style={{ ...styleContainer, ...longPressHandlerProps.style }}
      >
        <div
          className='thought-container'
          style={{
            // ensure that ThoughtAnnotation is positioned correctly
            position: 'relative',
            ...(hideBullet ? { marginLeft: -12 } : null),
          }}
        >
          {showContexts && simplePath.length > 1 ? (
            <ContextBreadcrumbs simplePath={grandparent} homeContext={homeContext} />
          ) : showContexts && simplePath.length > 2 ? (
            <span className='ellipsis'>
              <a
                tabIndex={-1}
                onClick={() => {
                  store.dispatch(expandContextThought(path))
                }}
              >
                ...{' '}
              </a>
            </span>
          ) : null}

          {!(publish && simplePath.length === 0) && (!isLeaf || !isPublishChild) && !hideBullet && (
            <Bullet
              isContextPending={isContextPending}
              isEditing={isEditing}
              leaf={isLeaf}
              path={path}
              simplePath={simplePath}
              thoughtId={thoughtId}
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

          <ThoughtAnnotation
            env={env}
            path={path}
            minContexts={allowSingleContext ? 0 : 2}
            showContextBreadcrumbs={showContextBreadcrumbs}
            style={style}
            simplePath={showContexts ? parentOf(simplePath) : simplePath}
          />

          <StaticThought
            path={path}
            cursorOffset={cursorOffset}
            isContextPending={isContextPending}
            isPublishChild={isPublishChild}
            isEditing={isEditing}
            isVisible={isVisible}
            rank={rank}
            showContextBreadcrumbs={showContextBreadcrumbs && value !== '__PENDING__'}
            style={style}
            simplePath={simplePath}
            onEdit={!isTouch ? onEdit : undefined}
            view={view}
            editing={editing}
          />

          <Note path={simplePath} />
        </div>

        {publish && simplePath.length === 0 && <Byline id={head(parentOf(simplePath))} />}

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
