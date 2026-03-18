import { useCallback, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransitionProps } from 'react-transition-group/CSSTransition'
import { css } from '../../styled-system/css'
import ActionType from '../@types/ActionType'
import TreeThoughtPositioned from '../@types/TreeThoughtPositioned'
import testFlags from '../e2e/testFlags'
import useFauxCaretNodeProvider from '../hooks/useFauxCaretCssVars'
import isContextViewActive from '../selectors/isContextViewActive'
import isDescendantPath from '../util/isDescendantPath'
import DropCliff from './DropCliff'
import FadeTransition from './FadeTransition'
import FauxCaret from './FauxCaret'
import TreeNodePositioner from './TreeNodePositioner'
import VirtualThought, { OnResize, SetSize } from './VirtualThought'

/** Renders a thought component for mapped treeThoughtsPositioned. */
const TreeNode = ({
  belowCursor,
  cliff,
  depth,
  env,
  height,
  indexChild,
  indexDescendant,
  isCursor,
  isEmpty,
  isTableCol1,
  isTableCol2,
  thoughtKey,
  leaf,
  path,
  prevChild,
  showContexts,
  isLastVisible,
  simplePath,
  singleLineHeightWithCliff,
  style,
  thoughtId,
  width,
  autofocus,
  x,
  y,
  index,
  viewportBottom,
  treeThoughtsPositioned,
  bulletWidth,
  cursorUncleId,
  setSize,
  cliffPaddingStyle,
  dragInProgress,
  autofocusDepth,
  editing,
  ...transitionGroupsProps
}: TreeThoughtPositioned & {
  thoughtKey: string
  index: number
  viewportBottom: number
  treeThoughtsPositioned: TreeThoughtPositioned[]
  bulletWidth: number
  cursorUncleId: string | null
  setSize: SetSize
  cliffPaddingStyle: { paddingBottom: number }
  dragInProgress: boolean
  autofocusDepth: number
  editing: boolean
} & Pick<CSSTransitionProps, 'in'>) => {
  // Since the thoughts slide up & down, the faux caret needs to be a child of the TreeNode
  // rather than one universal caret in the parent.
  const fadeThoughtRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(true)

  const { styles: fauxCaretNodeProviderStyles, hide: hideFauxCaret } = useFauxCaretNodeProvider({
    editing,
    fadeThoughtElement: fadeThoughtRef.current,
    isCursor,
    isTableCol1,
    path,
  })

  // true if the last action is any of archive/delete/collapse
  const isLastActionDelete = useSelector(state => {
    const deleteActions: ActionType[] = ['archiveThought', 'uncategorize', 'deleteThought', 'deleteThoughtWithCursor']
    const lastPatches = state.undoPatches[state.undoPatches.length - 1]
    return lastPatches?.some(patch => deleteActions.includes(patch.actions[0]))
  })

  // /** The transition animation for descendants of the context view after toggleContextView. Returns null otherwise. */
  const contextAnimation: 'disappearingLowerLeft' | 'disappearingUpperRight' | null = useSelector(state => {
    const isLastActionContextView = state.undoPatches[state.undoPatches.length - 1]?.some(
      patch => patch.actions[0] === 'toggleContextView',
    )
    if (!isLastActionContextView) return null

    // Determine the animation direction for disappearing text
    let animation: 'disappearingLowerLeft' | 'disappearingUpperRight' = 'disappearingLowerLeft'

    if (isDescendantPath(path, state.cursor)) {
      const isAppearing = transitionGroupsProps.in
      const isCursorInContextView = isLastActionContextView
        ? !!state.cursor && isContextViewActive(state, state.cursor)
        : false
      if (isCursorInContextView) {
        // Context View ON
        // New contextual child appearing (fade IN from RIGHT)
        // Old original child disappearing (fade OUT to LEFT)
        animation = isAppearing ? 'disappearingUpperRight' : 'disappearingLowerLeft'
      } else {
        // Context View OFF
        // Original child re-appearing (fade IN from LEFT)
        // Contextual child disappearing (fade OUT to RIGHT)
        animation = isAppearing ? 'disappearingLowerLeft' : 'disappearingUpperRight'
      }
    }

    return animation
  })

  const onResize: OnResize = useCallback(props => setSize({ ...props, cliff }), [cliff, setSize])

  // List Virtualization
  // Do not render thoughts that are below the viewport.
  // Exception: The cursor thought and its previous siblings may temporarily be out of the viewport, such as if when New Subthought is activated on a long context. In this case, the new thought will be created below the viewport and needs to be rendered in order for scrollCursorIntoView to be activated.
  // Render virtualized thoughts with their estimated height so that document height is relatively stable.
  // Perform this check here instead of in virtualThoughtsPositioned since it changes with the scroll position (though currently `sizes` will change as new thoughts are rendered, causing virtualThoughtsPositioned to re-render anyway).
  if (belowCursor && !isCursor && y > viewportBottom + height) {
    return null
  }

  const type = isEmpty ? 'nodeFadeIn' : isLastActionDelete ? 'nodeDissolve' : (contextAnimation ?? 'nodeFadeOut')

  return (
    <FadeTransition
      id={thoughtKey}
      // The FadeTransition is only responsible for fade in on new thought and fade out on unmount. See autofocusChanged for autofocus opacity transition during navigation.
      // Archive, delete, and uncategorize get a special dissolve animation.
      // Context view children get special disappearing text animations
      type={type}
      nodeRef={fadeThoughtRef}
      in={transitionGroupsProps.in}
      onEnter={() => setIsMounted(true)}
      onExit={() => setIsMounted(false)}
      unmountOnExit
    >
      <TreeNodePositioner
        x={x}
        y={y}
        path={path}
        width={width}
        isTableCol1={isTableCol1}
        thoughtId={thoughtId}
        contextAnimation={contextAnimation}
        isMounted={isMounted}
        style={{
          ...style,
          ...fauxCaretNodeProviderStyles,
        }}
      >
        <div
          ref={fadeThoughtRef}
          // It's possible for both the positioned faux caret and the start/end faux caret to be active at once, so hide the start/end
          // caret after a tap activates the positioned faux caret. https://github.com/cybersemics/em/pull/3757
          onClick={hideFauxCaret}
        >
          <VirtualThought
            debugIndex={testFlags.simulateDrop ? indexChild : undefined}
            depth={depth}
            dropUncle={thoughtId === cursorUncleId}
            env={env}
            indexDescendant={indexDescendant}
            isMultiColumnTable={false}
            leaf={leaf}
            onResize={onResize}
            path={path}
            prevChildId={prevChild?.id}
            showContexts={showContexts}
            simplePath={simplePath}
            singleLineHeight={singleLineHeightWithCliff}
            // Add a bit of space after a cliff to give nested lists some breathing room.
            // Do this as padding instead of y, otherwise there will be a gap between drop targets.
            // In Table View, we need to set the cliff padding on col1 so it matches col2 padding, otherwise there will be a gap during drag-and-drop.
            style={cliff < 0 || isTableCol1 ? cliffPaddingStyle : undefined}
            crossContextualKey={thoughtKey}
            cliff={cliff}
            prevCliff={treeThoughtsPositioned[index - 1]?.cliff}
            isLastVisible={isLastVisible}
            autofocus={autofocus}
          />
        </div>
        {dragInProgress &&
          // do not render hidden cliffs
          // rough autofocus estimate
          autofocusDepth - depth < 2 && (
            <DropCliff
              cliff={cliff}
              depth={depth}
              path={path}
              isTableCol2={isTableCol2}
              isLastVisible={isLastVisible}
              prevWidth={treeThoughtsPositioned[index - 1]?.width}
            />
          )}
        <span className={css({ position: 'absolute', margin: '-0.1875em 0 0 -0.05em', top: 0, left: 0 })}>
          <FauxCaret caretType='positioned' path={path} wrapperElement={fadeThoughtRef.current} />
        </span>
      </TreeNodePositioner>
    </FadeTransition>
  )
}

export default TreeNode
