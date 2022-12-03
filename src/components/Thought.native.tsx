import { View } from 'moti'
import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { connect, useSelector } from 'react-redux'
import Context from '../@types/Context'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import dragInProgress from '../action-creators/dragInProgress'
import setCursor from '../action-creators/setCursor'
import { MAX_DISTANCE_FROM_CURSOR } from '../constants'
import globals from '../globals'
import useDragHold from '../hooks/useDragHold'
import useHideBullet from '../hooks/useHideBullet'
import useThoughtStyle from '../hooks/useThoughtStyle'
import attribute from '../selectors/attribute'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import { getChildren, getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import store from '../stores/app'
import { commonStyles } from '../style/commonStyles'
import equalPath from '../util/equalPath'
import equalThoughtRanked from '../util/equalThoughtRanked'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
import parentOf from '../util/parentOf'
import parseJsonSafe from '../util/parseJsonSafe'
import publishMode from '../util/publishMode'
import Bullet from './Bullet'
import Byline from './Byline'
import { ConnectedDraggableThoughtContainerProps } from './DragAndDropThought'
import Note from './Note'
import StaticThought from './StaticThought'

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
  isHovering?: boolean
  isVisible?: boolean
  leaf?: boolean
  prevChildId?: ThoughtId
  publish?: boolean
  rank: number
  showContexts?: boolean
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  simplePath: SimplePath
  view?: string | null
}

interface ThoughtProps {
  env?: Index<Context>
  hideBullet?: boolean
  isDragging?: boolean
  isPublishChild?: boolean
  isEditing?: boolean
  isVisible?: boolean
  leaf?: boolean
  path: Path
  publish?: boolean
  rank: number
  showContextBreadcrumbs?: boolean
  showContexts?: boolean
  style?: React.CSSProperties
  styleContainer?: React.CSSProperties
  simplePath: SimplePath
  view?: string | null
}

export type ConnectedThoughtProps = ThoughtProps

export type ConnectedThoughtContainerProps = ThoughtContainerProps & ReturnType<typeof mapStateToProps>

// placeholder since mobile Thought component does not have mapDispatchToProps
export type ConnectedThoughtDispatchProps = Record<string, never>

/** Returns true if two lists of children are equal. Deeply compares id, value, and rank. */
const equalChildren = (a: Thought[], b: Thought[]) =>
  a === b ||
  (a && b && a.length === b.length && a.every((thought, i) => equalThoughtRanked(a[i], b[i]) && a[i].id === b[i].id))

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ThoughtContainerProps) => {
  const { cursor, expanded, expandedContextThought, search, expandHoverUpPath } = state

  const { path, simplePath, depth } = props

  // check if the cursor path includes the current thought
  const isEditingPath = isDescendantPath(cursor, path)

  // check if the cursor is editing a thought directly
  const isEditing = equalPath(cursor, path)

  const distance = cursor ? Math.max(0, Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth!)) : 0

  const isExpandedHoverTopPath = expandHoverUpPath && equalPath(path, expandHoverUpPath)

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

  return {
    contextBinding,
    distance,
    expandedContextThought,
    isCursorGrandparent,
    isCursorParent,
    isEditing,
    isEditingPath,
    isExpanded,
    isPublishChild: !search && publishMode() && simplePath.length === 2,
    publish: !search && publishMode(),
    simplePath,
    view: attribute(state, head(simplePath), '=view'),
  }
}

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
  cursor,
  depth = 0,
  dragPreview,
  dragSource,
  dropTarget,
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
  isHovering,
  isPublishChild,
  isVisible,
  leaf,
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
  const state = store.getState()
  const value = useSelector((state: State) => getThoughtById(state, thoughtId)?.value)
  const thoughtId = head(simplePath)

  const children = useSelector(
    (state: State) =>
      childrenForced ? childIdsToThoughts(state, childrenForced) : getChildrenRanked(state, head(simplePath)),
    // only compare id, value, and rank for re-renders
    equalChildren,
  )

  useEffect(() => {
    if (isBeingHoveredOver) {
      store.dispatch(
        dragInProgress({
          value: true,
          draggingThought: state.draggingThought,
          hoveringPath: path,
          hoverZone: DropThoughtZone.ThoughtDrop,
          sourceZone: DragThoughtZone.Thoughts,
        }),
      )
    }
  }, [isBeingHoveredOver])

  const hideBullet = useHideBullet({ children, env, hideBulletProp, isEditing, simplePath, thoughtId })
  const style = useThoughtStyle({ children, env, styleProp, thoughtId })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const dragHoldResult = useDragHold({ isDragging, simplePath, sourceZone: DragThoughtZone.Thoughts })

  // thought does not exist
  if (value == null) return null

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render

  const showContextBreadcrumbs =
    showContexts && (!globals.ellipsizeContextThoughts || equalPath(path, expandedContextThought as Path | null))

  // const optionsId = findDescendant(state, parentId, '=options')
  // const childrenOptions = getAllChildrenAsThoughts(state, optionsId)
  // const options =
  //   !isAttribute(value) && childrenOptions.length > 0 ? childrenOptions.map(child => child.value.toLowerCase()) : null

  const isProseView = hideBullet

  return (
    <View style={marginBottom}>
      <View style={[directionRow, alignItemsCenter]}>
        {!(publish && simplePath.length === 0) && (!leaf || !isPublishChild) && !hideBullet && (
          <Bullet
            isEditing={isEditing}
            thoughtId={thoughtId}
            leaf={leaf}
            onClick={() => {
              if (!isEditing || children.length === 0) {
                store.dispatch(setCursor({ path: simplePath }))
              }
            }}
            path={path}
            simplePath={simplePath}
            publish={publish}
          />
        )}

        {isProseView && <View style={styles(isEditing).proseView} />}

        {/* // Todo: still need to decide the best approach to implement the annotations.
        <ThoughtAnnotation
          env={env}
          path={path}
          minContexts={allowSingleContext ? 0 : 2}
          showContextBreadcrumbs={showContextBreadcrumbs}
          showContexts={showContexts}
          style={styleNew}
          simplePath={showContexts ? parentOf(simplePath) : simplePath}
        /> */}

        <StaticThought
          path={path}
          isVisible={isVisible}
          isPublishChild={isPublishChild}
          isEditing={isEditing}
          rank={rank}
          showContextBreadcrumbs={showContextBreadcrumbs}
          style={style}
          simplePath={simplePath}
          view={view}
        />
      </View>
      <Note path={simplePath} />

      {publish && simplePath.length === 0 && <Byline id={head(parentOf(simplePath))} />}

      {/* <Subthoughts
        allowSingleContext={allowSingleContext}
        childrenForced={childrenForced}
        env={env}
        path={path}
        depth={depth}
        showContexts={allowSingleContext}
        simplePath={simplePath}
        view={view}
      /> */}
    </View>
  )
}

/** Styles. */
const styles = (isEditing?: boolean) =>
  StyleSheet.create({
    proseView: {
      backgroundColor: 'white',
      borderRadius: 10,
      height: 20,
      marginRight: 15,
      opacity: isEditing ? 0.2 : 0,
      width: 20,
    },
  })

ThoughtContainer.displayName = 'ThoughtContainer'

// export connected, drag and drop higher order thought component
const ThoughtComponent = connect(mapStateToProps)(ThoughtContainer)

export default ThoughtComponent
