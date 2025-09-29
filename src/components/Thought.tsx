import { unescape } from 'html-escaper'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { childRecipe, invalidOptionRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { toggleMulticursorActionCreator as toggleMulticursor } from '../actions/toggleMulticursor'
import { isMac, isSafari, isTouch } from '../browser'
import { AlertType, REGEX_TAGS } from '../constants'
import { MIN_CONTENT_WIDTH_EM } from '../constants'
import testFlags from '../e2e/testFlags'
import useDragAndDropThought from '../hooks/useDragAndDropThought'
import useDragHold from '../hooks/useDragHold'
import useDragLeave from '../hooks/useDragLeave'
import useHideBullet from '../hooks/useHideBullet'
import useHoveringPath from '../hooks/useHoveringPath'
import useThoughtStyle from '../hooks/useThoughtStyle'
import useThoughtStyleContainer from '../hooks/useThoughtStyleContainer'
import attribute from '../selectors/attribute'
import attributeEquals from '../selectors/attributeEquals'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import findDescendant from '../selectors/findDescendant'
import getChildren, { getAllChildrenAsThoughts, getChildrenRanked } from '../selectors/getChildren'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import col1MaxWidthStore from '../stores/col1MaxWidthStore'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import containsURL from '../util/containsURL'
import durations from '../util/durations'
import equalPath from '../util/equalPath'
import equalThoughtRanked from '../util/equalThoughtRanked'
import getBulletWidth from '../util/getBulletWidth'
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
import DropHover from './DropHover'
import Note from './Note'
import StaticThought from './StaticThought'

/**********************************************************************
 * Redux
 **********************************************************************/

export interface ThoughtContainerProps {
  allowSingleContext?: boolean
  childrenForced?: ThoughtId[]
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

/** Returns the width of a given text string using the specified font. */
const getTextWidth = (text: string, font: string): number => {
  // 1. Decode entities
  const decoded = unescape(text)

  // 2. Split into runs of plain vs. <b>…</b> or <i>…</i> segments
  const parts = decoded.split(/(<(?:b|i)\b[^>]*>[\s\S]*?<\/(?:b|i)>)/gi)

  // 3. Measure each part with appropriate font settings
  let width = 0
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return 0

  for (const part of parts) {
    if (!part) continue

    // 3a. Detect whether this segment is bold and/or italic
    const isBold = /<b\b[^>]*>[\s\S]*?<\/b>/i.test(part)
    const isItalic = /<i\b[^>]*>[\s\S]*?<\/i>/i.test(part)

    // 3b. Strip all HTML tags to get plain text
    const stripped = part.replace(/<[^>]+>/g, '')

    // 4. Build canvas font string for this segment
    const styles: string[] = []
    if (isItalic) styles.push('italic')
    if (isBold) styles.push('bold')

    context.font = styles.length ? `${styles.join(' ')} ${font}` : font

    // 5. Measure and accumulate
    width += context.measureText(stripped).width
  }

  return width
}

interface UseCol1AlignParams {
  path: Path
  value: string | undefined
  isTableCol1: boolean
}

/** Custom hook that handles animating text alignment for Table View. */
const useCol1Alignment = ({ path, value, isTableCol1 }: UseCol1AlignParams) => {
  const prevIsTableCol1 = useRef<boolean>(isTableCol1)

  const col1MaxWidth = col1MaxWidthStore.useState()

  const fontSize = useSelector(state => state.fontSize)

  const isCursor = useSelector(state => equalPath(state.cursor, path))

  const isSiblingOfCursor = useSelector((state: State) => {
    if (!state.cursor) return false
    const cursorParentId = head(rootedParentOf(state, state.cursor))
    const thisParentId = head(rootedParentOf(state, path))
    return cursorParentId === thisParentId
  })

  /** Sibling thoughts for the current cursor. */
  const siblingThoughts = useSelector((state: State) => {
    if (!state.cursor || !isCursor) return []
    const cursorParentId = head(rootedParentOf(state, state.cursor))
    return cursorParentId ? getChildren(state, cursorParentId).map(t => t.value) : []
  }, shallowEqual)

  interface TransitionStyle {
    transform: string
    transition: string
  }

  const [alignmentTransition, setAlignmentTransition] = useState<{
    bullet: TransitionStyle
    editable: TransitionStyle
  }>({ bullet: { transform: '', transition: '' }, editable: { transform: '', transition: '' } })

  const duration = durations.get('layoutNodeAnimation')

  // Recalculate and update col1MaxWidthStore.
  useEffect(() => {
    if (isCursor) {
      const allWidths = siblingThoughts.map(thought => getTextWidth(thought, `${fontSize}px Helvetica`))
      col1MaxWidthStore.update(Math.max(...allWidths, 0))
    }
  }, [isTableCol1, siblingThoughts, fontSize, isCursor])

  /**
   * Animates transitioning text alignment from left to right (and back)
   * for the bullet and editable text when toggling Table View (`isTableCol1`).
   * Uses the maximum width of all cursor siblings to create a smooth shift
   * between Tree and Table views.
   */
  useLayoutEffect(() => {
    if (!isSiblingOfCursor) {
      prevIsTableCol1.current = isTableCol1
      return
    }

    if (prevIsTableCol1.current == isTableCol1) return

    // Measure text width
    const width = getTextWidth(value || '', `${fontSize}px Helvetica`)

    // Minimum width: 3em minus left (0.333em) and right (1.0em) padding
    const minWidth = fontSize * (MIN_CONTENT_WIDTH_EM - 1.333) - 1

    const offset = Math.max(minWidth, col1MaxWidth || 0) - width
    const bulletOffset = getBulletWidth(fontSize)

    // Move elements into their starting offset positions
    setAlignmentTransition({
      bullet: {
        transition: 'none',
        transform: `translateX(${isTableCol1 ? -bulletOffset : bulletOffset}px)`,
      },
      editable: {
        transition: 'none',
        transform: `translateX(${isTableCol1 ? -offset : offset}px)`,
      },
    })

    // On the next frame, slide both back to 0 with an ease-out transition
    requestAnimationFrame(() => {
      setAlignmentTransition({
        bullet: { transition: `transform ${duration}ms ease-out`, transform: 'translateX(0)' },
        editable: { transition: `transform ${duration}ms ease-out`, transform: 'translateX(0)' },
      })
    })

    prevIsTableCol1.current = isTableCol1
  }, [isTableCol1, col1MaxWidth, fontSize, value, duration, isSiblingOfCursor])

  return alignmentTransition
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
  childrenForced,
  debugIndex,
  depth = 0,
  env,
  hideBullet: hideBulletProp,
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
}: ThoughtContainerProps) => {
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
  const view = useSelector(state => attribute(state, head(simplePath), '=view'))

  // Note: If the thought is the active expand hover top path then it should be treated as a cursor parent. It is because the current implementation allows tree to unfold visually starting from cursor parent.
  const isCursorParent = useSelector(state => {
    const isExpandedHoverTopPath = state.expandHoverUpPath && equalPath(path, state.expandHoverUpPath)
    if (isExpandedHoverTopPath) return true
    if (!state.cursor) return false

    return equalPath(parentOf(state.cursor), path)
  })

  const { isDragging, dragSource, isHovering, isBeingHoveredOver, dropTarget, canDropThought, isDeepHovering } =
    useDragAndDropThought({
      path,
      simplePath,
      isVisible,
      isCursorParent,
    })

  useHoveringPath(path, isBeingHoveredOver, DropThoughtZone.ThoughtDrop)
  useDragLeave({ isDeepHovering, canDropThought })

  // check if the cursor is editing a thought directly
  const isEditing = useSelector(state => equalPath(state.cursor, path))

  const isPublishChild = useSelector(state => !state.search && publishMode() && simplePath.length === 2)
  const publish = useSelector(state => !state.search && publishMode())
  const isTableCol1 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
  )
  const isTableCol2 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, parentOf(simplePath))), '=view', 'Table'),
  )
  const isInContextView = useSelector(state => isContextViewActive(state, parentOf(path)))

  const hideBullet = useHideBullet({ children, env, hideBulletProp, isEditing, simplePath, isInContextView, thoughtId })
  const style = useThoughtStyle({ children, env, styleProp, thoughtId })
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

  const dragHoldResult = useDragHold({
    isDragging,
    simplePath,
    sourceZone: DragThoughtZone.Thoughts,
    toggleMulticursorOnLongPress: true,
  })

  const homeContext = useSelector(state => {
    const pathParent = rootedParentOf(state, path)
    const showContexts = isContextViewActive(state, path)
    return showContexts && isRoot(pathParent)
  })

  // true if the thought has an invalid option
  const invalidOption = useSelector(state => {
    const thought = getThoughtById(state, thoughtId)
    if (!thought || value === undefined) return false

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
  const isChildHovering = useSelector(state => {
    // Early return if essential conditions are not met
    if (!isVisible || !state.hoveringPath || !state.draggingThoughts.length) {
      return false
    }

    // Check if this is a table view once
    const isTableView = attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table')

    const isNotHighlightable = state.draggingThoughts.some(
      draggingThought =>
        // Make sure we're not hovering over a thought that cannot be dropped on
        (state.hoveringPath && isDescendantPath(state.hoveringPath, draggingThought)) ||
        // Do not highlight parent of any dragging thought (i.e. when simply reordering but not moving to a new parent).
        // The only exception is table view col1, which needs highlighting as the first thought of row1 abuts the first thought in row2.
        (equalPath(rootedParentOf(state, draggingThought), simplePath) && !isTableView),
    )

    if (isNotHighlightable) {
      return false
    }

    // Do not highlight in context view
    if (isContextViewActive(state, path)) {
      return false
    }

    // Do not highlight during delete or copy alerts
    if (state.alert?.alertType === AlertType.DeleteDropHint) {
      return false
    }

    // SubthoughtsDrop: Can drop on SubthoughtsDrop if this thought is being hovered over
    const isSubthoughtsDropTarget =
      state.hoverZone === DropThoughtZone.SubthoughtsDrop && equalPath(simplePath, state.hoveringPath)

    // ThoughtDrop: Can drop on ThoughtDrop if this thought is a parent of the hovered thought and not a descendant of any dragging thought.
    const isThoughtDropTarget =
      state.hoverZone === DropThoughtZone.ThoughtDrop &&
      equalPath(rootedParentOf(state, state.hoveringPath), simplePath) &&
      !state.draggingThoughts.some(draggingThought => isDescendantPath(simplePath, draggingThought))

    return isSubthoughtsDropTarget || isThoughtDropTarget
  })

  /** True if the the user is dragging the thought and hovering over the DeleteDrop QuickDrop icon. */
  const isQuickDropDeleteHovering = useSelector(
    state => isDragging && state.alert?.alertType === AlertType.DeleteDropHint,
  )

  // when the thought is edited on desktop, hide the top controls and breadcrumbs for distraction-free typing
  const onEdit = useCallback(({ newValue, oldValue }: { newValue: string; oldValue: string }) => {
    // only hide when typing, not when deleting
    // strip HTML tags, otherwise Formatting commands will trigger distractionFreeTyping
    if (newValue.replace(REGEX_TAGS, '').length > oldValue.replace(REGEX_TAGS, '').length) {
      distractionFreeTypingStore.updateThrottled(true)
    }
  }, [])

  const styleThought = useMemo(
    (): React.CSSProperties => ({
      // textDecoration does not inherit from inline-block elements, so we apply it here instead of .child
      textDecoration: style?.textDecoration,
    }),
    [style?.textDecoration],
  )

  // true when this thought is the parent of a recently dropped child, to continue a slower pulse briefly
  const isRecentlyDropped = useSelector(state => equalPath(state.droppedPath, simplePath))

  // Styles applied to the .thought-annotation and .editable
  // See: https://stackoverflow.com/a/46452396/480608
  // Use -webkit-text-stroke-width instead of font-weight:bold, as bold changes the width of the text and can cause the thought to become multiline during a drag. This can even create an oscillation effect as the increased Thought height triggers a different hoveringPath ad infinitum (often resulting in a Shaker cancel false positive).
  // Highlight the parent of the current drop target to make it easier to drop in the intended place.
  const cssRawThought = css.raw({
    /** Animation to apply to a parent when one of its children is being hovered over. Disabled in puppeteer tests. */
    ...(isChildHovering
      ? {
          WebkitTextStrokeWidth: '0.05em',
          animation: `pulseLight {durations.slowPulse} linear infinite alternate`,
          color: 'highlight',
        }
      : /** Continue a slower pulse on the parent briefly after a drop completes. */
        isRecentlyDropped
        ? {
            WebkitTextStrokeWidth: '0.05em',
            animation: `pulseLight {durations.verySlowPulse} linear infinite alternate`,
            color: 'highlight',
          }
        : isQuickDropDeleteHovering
          ? {
              WebkitTextStrokeWidth: '0.05em',
              animation: `pulseLight {durations.mediumPulse} linear infinite alternate`,
              color: 'gray',
              textDecoration: 'line-through',
            }
          : null),
  })

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

  /** Handles multicursor activation. */
  const handleMultiselect = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isTouch && (isMac ? (e as React.MouseEvent).metaKey : (e as React.MouseEvent).ctrlKey)) {
        e.preventDefault()
        dispatch(toggleMulticursor({ path }))
      }
    },
    [dispatch, path],
  )

  // Use custom hook for col1 alignment
  const alignmentTransition = useCol1Alignment({
    path,
    value,
    isTableCol1,
  })

  // thought does not exist
  if (value == null) return null

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: Subthoughts render

  return (
    <div
      {...dragHoldResult.props}
      ref={node => dragSource(dropTarget(node))}
      aria-label='child'
      data-divider={isDivider(value)}
      data-editing={isEditing}
      // HTML5Backend will override this to be "true" on platforms that use it.
      // iOS Safari needs it to be true to disable native long press behavior. (#2953, #2931, #2964)
      // Android works better if draggable is false.
      draggable={isTouch && isSafari()}
      onClick={isTouch ? undefined : handleMultiselect}
      style={{
        transition: `transform ${token('durations.layoutSlowShift')} ease-out, opacity ${token('durations.layoutSlowShift')} ease-out`,
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
      className={cx(
        childRecipe(),
        invalidOption && invalidOptionRecipe(),
        css({
          // so that .thought can be sized at 100% and BulletCursorOverlay bullet can be positioned correctly.
          position: 'relative',
          textAlign: isTableCol1 ? 'right' : undefined,
        }),
      )}
    >
      {showContexts && simplePath.length > 1 && (
        <ContextBreadcrumbs
          cssRaw={css.raw({
            /* Tighten up the space between the context-breadcrumbs and the thought (similar to the space above a note). */
            marginBottom: '-0.25em',
            /* Use padding-top instead of margin-top to ensure this gets included in the dynamic height of each thought.
              Otherwise the accumulated y value will not be correct. */
            paddingTop: '0.5em',
          })}
          path={parentOf(simplePath)}
          homeContext={homeContext}
        />
      )}

      <div
        aria-label='thought-container'
        data-testid={'thought-' + hashPath(path)}
        className={css({
          /* Use line-height to vertically center the text and bullet. We cannot use padding since it messes up the selection. This needs to be overwritten on multiline elements. See ".child .editable" below. */
          /* must match value used in Editable useMultiline */
          lineHeight: '2',
          // ensure that ThoughtAnnotation is positioned correctly
          position: 'relative',
          ...(hideBullet ? { marginLeft: -12 } : null),
        })}
      >
        {!(publish && simplePath.length === 0) && (!leaf || !isPublishChild) && !hideBullet && (
          <div style={alignmentTransition.bullet}>
            <Bullet
              isContextPending={isContextPending}
              isDragging={isDragging}
              isEditing={isEditing}
              leaf={leaf}
              path={path}
              publish={publish}
              simplePath={simplePath}
              thoughtId={thoughtId}
              isInContextView={isInContextView}
              // debugIndex={debugIndex}
              // depth={depth}
            />
          </div>
        )}

        <DropHover isHovering={isHovering} prevChildId={prevChildId} simplePath={simplePath} />

        <div style={alignmentTransition.editable}>
          <StaticThought
            allowSingleContext={allowSingleContext}
            env={env}
            isContextPending={isContextPending}
            isEditing={isEditing}
            ellipsizedUrl={!isEditing && containsURL(value)}
            isPublishChild={isPublishChild}
            isVisible={isVisible}
            onEdit={!isTouch ? onEdit : undefined}
            path={path}
            rank={rank}
            showContextBreadcrumbs={showContexts && value !== '__PENDING__'}
            simplePath={simplePath}
            cssRaw={cssRawThought}
            cssRawThought={cssRawThought}
            style={styleThought}
            styleAnnotation={styleAnnotation || undefined}
            styleThought={styleThought}
            updateSize={updateSize}
            view={view}
          />
        </div>
        <Note path={path} disabled={!isVisible} />
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

ThoughtContainer.displayName = 'ThoughtContainer'
const ThoughtComponentMemo = React.memo(ThoughtContainer)
ThoughtComponentMemo.displayName = 'Thought'

export default ThoughtComponentMemo
