import classNames from 'classnames'
import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'
import { connect, useDispatch, useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import alert from '../action-creators/alert'
import dragHold from '../action-creators/dragHold'
import dragInProgress from '../action-creators/dragInProgress'
import expandContextThought from '../action-creators/expandContextThought'
import toggleTopControlsAndBreadcrumbs from '../action-creators/toggleTopControlsAndBreadcrumbs'
import { isTouch } from '../browser'
import { DropTarget, MAX_DISTANCE_FROM_CURSOR, TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'
import globals from '../globals'
import useLongPress from '../hooks/useLongPress'
import useSubthoughtHovering from '../hooks/useSubthoughtHovering'
import attribute from '../selectors/attribute'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts, getChildren, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getSortPreference from '../selectors/getSortPreference'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import themeColors from '../selectors/themeColors'
import { store } from '../store'
import alpha from '../util/alpha'
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
  autofocus?: 'show' | 'dim' | 'hide' | 'hide-parent'
  childrenForced?: ThoughtId[]
  contextBinding?: Path
  cursor?: Path | null
  depth?: number
  env?: string
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
  prevChildId?: ThoughtId
  publish?: boolean
  rank: number
  showContexts?: boolean
  simplePath: SimplePath
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  view?: string | null
}

export interface ThoughtProps {
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
  onEdit?: (args: { newValue: string; oldValue: string }) => void
  path: Path
  rank: number
  showContextBreadcrumbs?: boolean
  showContexts?: boolean
  simplePath: SimplePath
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  view?: string | null
}

export type ConnectedThoughtContainerProps = ThoughtContainerProps & ReturnType<typeof mapStateToProps>

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
    editing,
    expandedContextThought,
    isCursorGrandparent,
    isCursorParent,
    isEditing,
    isExpanded,
    isLeaf,
    isPublishChild: !search && publishMode() && simplePath.length === 2,
    parentView: attribute(state, head(parentOf(simplePath)), '=view'),
    publish: !search && publishMode(),
    view: attribute(state, head(simplePath), '=view'),
  }
}

/** Set state.dragHold on longPress. */
const useLongPressHighlight = ({ isDragging, simplePath }: { isDragging: boolean; simplePath: SimplePath }) => {
  // Set .pressed so that user-select: none can be applied to disable long press to select on iOS. If user-select: none is added after touchstart, it does not prevent magnifying glass text selection (unresolved). -webkit-touch-callout does not help. It seems the only way to disable it fully is to preventDefault on touchstart. However, this would break navigation in edit mode.
  // See: https://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
  const [isPressed, setIsPressed] = useState(false)
  const dispatch = useDispatch()

  /** Highlight bullet and show alert on long press on Thought. */
  const onLongPressStart = useCallback(() => {
    setIsPressed(true)
    dispatch(dragHold({ value: true, simplePath }))
  }, [])

  /** Cancel highlighting of bullet and dismiss alert when long press finished. */
  const onLongPressEnd = useCallback(() => {
    setIsPressed(false)
    dispatch((dispatch, getState) => {
      if (getState().dragHold) {
        dispatch([dragHold({ value: false }), alert(null)])
      }
    })
  }, [])

  // react-dnd stops propagation so onLongPressEnd sometimes does't get called
  // so disable pressed as soon as we are dragging
  useEffect(() => {
    if (isDragging) {
      setIsPressed(false)
    }
  }, [isDragging])

  const props = useLongPress(onLongPressStart, onLongPressEnd, TIMEOUT_LONG_PRESS_THOUGHT)

  return {
    isPressed,
    props,
  }
}

/**********************************************************************
 * Components
 **********************************************************************/

/** A thought container with bullet, thought annotation, thought, and subthoughts.
 *
  @param allowSingleContext  Pass through to Subthoughts since the SearchSubthoughts component does not have direct access to the Subthoughts of the Subthoughts of the search. Default: false.
 */
const ThoughtContainer = ({
  allowSingleContext,
  autofocus,
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
  parentView,
  path,
  prevChildId,
  publish,
  rank,
  showContexts,
  simplePath,
  style: styleProp,
  styleContainer: styleContainerProp,
  view,
}: ConnectedDraggableThoughtContainerProps) => {
  const envParsed = JSON.parse(env || '{}') as LazyEnv
  const dispatch = useDispatch()

  const thoughtId = head(simplePath)
  const children = useSelector(
    (state: State) =>
      childrenForced ? childIdsToThoughts(state, childrenForced) : getChildrenRanked(state, head(simplePath)),
    _.isEqual,
  )
  const prevChild = useSelector((state: State) => (prevChildId ? getThoughtById(state, prevChildId) : null))

  // when Thoughts is hovered over during drag, update the hoveringPath and hoverId
  // check dragInProgress to ensure the drag has not been aborted (e.g. by shaking)
  useEffect(() => {
    if (isBeingHoveredOver && store.getState().dragInProgress) {
      store.dispatch((dispatch, getState) => {
        dispatch(
          dragInProgress({
            value: true,
            draggingThought: getState().draggingThought,
            hoveringPath: path,
            hoverId: DropTarget.ThoughtDrop,
          }),
        )
      })
    }
  }, [isBeingHoveredOver])

  const hideBullet = useHideBullet({ children, env: envParsed, hideBulletProp, isEditing, simplePath, thoughtId })
  const colors = useSelector(themeColors)
  const style = useStyle({ children, env: envParsed, styleProp, thoughtId })
  const styleAnnotation = useSelector((state: State) =>
    getStyle(state, head(simplePath), { attributeName: '=styleAnnotation' }),
  )
  const styleContainer = useStyleContainer({ children, env: envParsed, styleContainerProp, thoughtId, path })
  const thought = useSelector((state: State) => getThoughtById(state, thoughtId))
  const grandparent = useSelector((state: State) => rootedParentOf(state, rootedParentOf(state, simplePath)))
  const isSubthoughtHovering = useSubthoughtHovering(simplePath, isHovering, isDeepHovering)

  // must use isContextViewActive to read from live state rather than showContexts which is a static propr from the Subthoughts component. showContext is not updated when the context view is toggled, since the Thought should not be re-rendered.
  const isTable = useSelector((state: State) => view === 'Table' && !isContextViewActive(state, path))

  const longPress = useLongPressHighlight({ isDragging, simplePath })

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

  // true if a thought is being dragged over this drop hover
  const shouldDisplayDropHover = useSelector((state: State) => {
    /** Checks if any descendents of the direct siblings is being hovered. */
    const isAnySiblingDescendantHovering = () =>
      !isHovering &&
      state.hoveringPath &&
      isDescendantPath(state.hoveringPath, parentOf(path)) &&
      (state.hoveringPath.length !== path.length || state.hoverId === DropTarget.SubthoughtsDrop)

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
          (!prevChild || compareReasonable(draggingThoughtValue, prevChild.value) === 1)
      : // if alphabetical sort is disabled just check if current thought is hovering
        globals.simulateDropHover || isHovering
  })

  /** True if a dragged thought is hovering over a visible child of the current thought (ThoughtDrop or SubthoughtsDrop). */
  // TODO: it would be nice if we could reuse canDrop
  const isChildHovering = useSelector(
    (state: State) =>
      isVisible &&
      state.hoveringPath &&
      // SubthoughtsDrop
      // can drop on SubthoughtsDrop if this thought is being hovered over
      ((state.hoverId === DropTarget.SubthoughtsDrop && equalPath(simplePath, state.hoveringPath)) ||
        // ThoughtDrop
        // can drop on ThoughtDrop if this thought is a parent of the hovered thought, and not a descendant of the dragging thought
        (equalPath(rootedParentOf(state, state.hoveringPath!), simplePath) &&
          state.hoverId === DropTarget.ThoughtDrop &&
          !isDescendantPath(simplePath, state.draggingThought!))),
  )

  // when the thought is edited on desktop, hide the top controls and breadcrumbs for distraction-free typing
  const onEdit = useCallback(({ newValue, oldValue }: { newValue: string; oldValue: string }) => {
    // only hide when typing, not when deleting
    if (newValue.length > oldValue.length) {
      dispatch(toggleTopControlsAndBreadcrumbs(false))
    }
  }, [])

  if (!thought) return null

  const value = thought.value

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: Subthoughts render

  const showContextBreadcrumbs =
    showContexts && (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  // add transparency to the foreground color based on autofocus
  const color = alpha(colors.fg, autofocus === 'show' ? 1 : autofocus === 'dim' ? 0.5 : 0)

  return dropTarget(
    dragSource(
      <li
        {...longPress.props}
        aria-label='thought-container'
        style={{
          color,
          ...styleContainer,
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
          // if editing and expansion is suppressed, mark as a leaf so that bullet does not show expanded
          // this is a bit of a hack since the bullet transform checks leaf instead of expanded
          // TODO: Consolidate with isLeaf if possible
          leaf: isLeaf || (isEditing && globals.suppressExpansion),
          pressed: longPress.isPressed,
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
              isDragging={isDragging}
              isEditing={isEditing}
              isVisible={isVisible}
              leaf={isLeaf}
              path={path}
              publish={publish}
              simplePath={simplePath}
              thoughtId={thoughtId}
            />
          )}

          <span
            className='drop-hover'
            style={{
              display: shouldDisplayDropHover ? 'inline' : 'none',
            }}
          ></span>

          <ThoughtAnnotation
            env={env}
            minContexts={allowSingleContext ? 0 : 2}
            path={path}
            showContextBreadcrumbs={showContextBreadcrumbs}
            simplePath={showContexts ? parentOf(simplePath) : simplePath}
            style={{
              ...style,
              // highlight the parent of the current drop target to make it easier to drop in the intended place
              ...(isChildHovering ? { color: 'lightblue', fontWeight: 'bold' } : null),
            }}
            styleAnnotation={styleAnnotation || undefined}
          />

          <StaticThought
            cursorOffset={cursorOffset}
            editing={editing}
            isContextPending={isContextPending}
            isEditing={isEditing}
            isPublishChild={isPublishChild}
            isVisible={isVisible}
            onEdit={!isTouch ? onEdit : undefined}
            path={path}
            rank={rank}
            showContextBreadcrumbs={showContextBreadcrumbs && value !== '__PENDING__'}
            simplePath={simplePath}
            style={{
              ...style,
              // highlight the parent of the current drop target to make it easier to drop in the intended place
              ...(isChildHovering ? { color: 'lightblue', fontWeight: 'bold' } : null),
            }}
            view={view}
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
                isParentHovering={isSubthoughtHovering}
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
            isParentHovering={isSubthoughtHovering}
            path={path}
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
const ThoughtComponent = connect(mapStateToProps)(DragAndDropThought(ThoughtContainer))

export default ThoughtComponent
