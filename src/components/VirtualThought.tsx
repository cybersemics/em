import { isEqual } from 'lodash'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Autofocus from '../@types/Autofocus'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import useDelayedAutofocus from '../hooks/useDelayedAutofocus'
import useSelectorEffect from '../hooks/useSelectorEffect'
import { hasChildren } from '../selectors/getChildren'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import editingValueStore from '../stores/editingValue'
import viewportStore from '../stores/viewport'
import equalPath from '../util/equalPath'
import head from '../util/head'
import noteValue from '../util/noteValue'
import DropChild from './DropChild'
import DropUncle from './DropUncle'
import Subthought from './Subthought'

/** A resize handler that should be called whenever a thought's height has changed. */
export type OnResize = (args: {
  /** The real, measured height of the thought after a render. Set to null on unmount. */
  height: number | null
  // width may not be defined since it is measured from the ref's .editable
  width?: number | null
  id: ThoughtId
  /** Used by the LayoutTree to crop hidden thoughts below the cursor without disrupting the autofocus animation when parents fade in. */
  isVisible: boolean
  /** A key that uniquely identifies the thought across context views. */
  key: string
}) => void

/** Selects whether the context view is active for this thought. */
const selectShowContexts = (path: SimplePath) => (state: State) => isContextViewActive(state, path)

/** Selects the cursor from the state. */
const selectCursor = (state: State) => state.cursor

/** Renders a thought if it is not hidden by autofocus, otherwise renders a fixed height shim. */
const VirtualThought = ({
  debugIndex,
  depth,
  dropUncle,
  env,
  indexDescendant,
  isMultiColumnTable,
  leaf,
  onResize,
  path,
  prevChildId,
  showContexts,
  simplePath,
  singleLineHeight,
  style,
  crossContextualKey,
  zoomCursor,
  prevCliff,
  isLastVisible,
  autofocus,
  marginRight,
  isTableCol1,
}: {
  // contextChain is needed to uniquely identify thoughts across context views
  debugIndex?: number
  depth: number
  dropUncle?: boolean
  env?: LazyEnv
  indexDescendant: number
  isMultiColumnTable?: boolean
  leaf: boolean
  path: Path
  prevChildId?: ThoughtId
  onResize?: OnResize
  showContexts?: boolean
  simplePath: SimplePath
  singleLineHeight: number
  style?: React.CSSProperties
  /** A key that uniquely identifies the thought across context views. */
  crossContextualKey: string
  zoomCursor?: boolean
  prevCliff?: number
  isLastVisible?: boolean
  autofocus: Autofocus
  marginRight: number
  isTableCol1?: boolean
}) => {
  // TODO: Why re-render the thought when its height changes? This information should be passively passed up to LayoutTree.
  const [height, setHeight] = useState<number | null>(singleLineHeight)
  const id = head(simplePath)
  const isEditing = useSelector(state => equalPath(state.cursor, simplePath))
  const editingValue = editingValueStore.useSelector(state => (isEditing ? state : null))
  const isContextViewActive = useSelector(selectShowContexts(simplePath))
  const cursorLeaf = useSelector(state => !!state.cursor && !hasChildren(state, head(state.cursor)))
  const cursorDepth = useSelector(state => (state.cursor ? state.cursor.length : 0))
  const fontSize = useSelector(state => state.fontSize)
  const note = useSelector(state => noteValue(state, id))
  const ref = useRef<HTMLDivElement>(null)

  /***************************
   * VirtualThought properties
   ***************************/

  // Hidden thoughts can be removed completely as long as the container preserves its height (to avoid breaking the scroll position).
  // Wait until the fade out animation has completed before removing.
  // Only shim 'hide', not 'hide-parent', thoughts, otherwise hidden parents snap in instead of fading in when moving up the tree.
  const isVisible = zoomCursor || autofocus === 'show' || autofocus === 'dim'
  const shimHiddenThought = useDelayedAutofocus(autofocus, {
    delay: 750,
    selector: autofocusNew => autofocus === 'hide' && autofocusNew === 'hide' && !!height,
  })

  // console.info('<VirtualThought>', prettyPath(childPath))
  // useWhyDidYouUpdate('<VirtualThought> ' + prettyPath(state, childPath), {
  //   child,
  //   depth,
  //   env,
  //   index,
  //   isHeader,
  //   isMultiColumnTable,
  //   zoomCursor,
  //   path,
  //   prevChildId,
  //   shimHiddenThought
  //   showContexts,
  //   // hooks
  //   childPathUnstable,
  //   childPath,
  // })

  const updateSize = useCallback(() => {
    // Get the updated autofocus, otherwise isVisible will be stale.
    // Using the local autofocus and adding it as a dependency works when clicking on the cursor's parent but not when activating cursorBack from the keyboad for some reason.
    const isVisibleNew = autofocus === 'show' || autofocus === 'dim'
    if (!ref.current) return

    // Need to grab max height between .thought and .thought-annotation since the annotation height might be bigger (due to wrapping link icon).
    const heightNew = Math.max(
      ref.current.getBoundingClientRect().height,
      ref.current.querySelector('[aria-label="thought-annotation"]')?.getBoundingClientRect().height || 0,
    )
    const widthNew = ref.current.querySelector(`[data-editable]`)?.getBoundingClientRect().width

    // skip updating height when preventAutoscroll is enabled, as it modifies the element's height in order to trick Safari into not scrolling
    const editable = ref.current.querySelector(`[data-editable]`)
    if (editable?.hasAttribute('data-prevent-autoscroll')) return

    setHeight(heightNew)
    onResize?.({
      height: heightNew,
      width: widthNew,
      id,
      isVisible: isVisibleNew,
      key: crossContextualKey,
    })
  }, [crossContextualKey, onResize, id, autofocus])

  // Recalculate height when anything changes that could indirectly affect the height of the thought. (Height observers are slow.)
  // Autofocus changes when the cursor changes depth or moves between a leaf and non-leaf. This changes the left margin and can cause thoughts to wrap or unwrap.
  useLayoutEffect(updateSize, [
    cursorDepth,
    cursorLeaf,
    fontSize,
    isVisible,
    leaf,
    note,
    simplePath,
    style,
    isContextViewActive,
    editingValue,
    updateSize,
  ])

  // Recalculate height on cursor change since indentation can change line wrapping
  // shimHiddenThought will re-render as needed.
  useSelectorEffect(updateSize, selectCursor, isEqual)

  // Recalculate height on =style change, since styles such as font size can affect thought height.
  // Must wait one render since getStyle updates as soon as =style has loaded in the Redux store but before it has been applied to the DOM.
  useSelectorEffect(
    () => {
      requestAnimationFrame(updateSize)
    },
    state => getStyle(state, head(simplePath)),
    isEqual,
  )

  // Recalculate height when the screen is resized
  viewportStore.useSelectorEffect(updateSize, state => state.innerWidth)

  // Recalculate height after thought value changes.
  // Otherwise, the hight is not recalculated after splitThought.
  // TODO: useLayoutEffect does not work for some reason, causing the thought to briefly render at the incorrect height.
  const value = useSelector(state => {
    const thoughtId = head(simplePath)
    return thoughtId ? getThoughtById(state, thoughtId)?.value : null
  })
  useEffect(updateSize, [updateSize, value])

  // trigger onResize with null on unmount to allow subscribers to clean up
  useEffect(
    () => {
      return () => {
        onResize?.({ height: null, width: null, id: id, isVisible: true, key: crossContextualKey })
      }
    },
    // these should be memoized and not change for the life of the component, so this is effectively componentWillUnmount
    [crossContextualKey, onResize, id],
  )

  const [transientStyle, setTransientStyle] = useState<React.CSSProperties>({
    textAlign: isTableCol1 ? 'right' : undefined,
  })
  const translateXRef = useRef<number>(0)
  const duration = 600

  /** Calculates the horizontal translation needed to align the text to the right within its parent. */
  const calculateTranslateX = (): number => {
    const element = ref.current
    if (!element) {
      return 0
    }

    const editable = element?.querySelector('.editable')
    if (!editable) {
      return 0
    }

    const parentWidth = element.getBoundingClientRect().width
    const editableWidth = editable.getBoundingClientRect().width

    const result = Math.max(0, parentWidth - editableWidth)

    return result
  }

  /** Updates the transient style by merging the given styles with the existing ones. */
  const updateTransitionStyle = (updates: React.CSSProperties) => {
    setTransientStyle(prev => ({
      ...prev,
      ...updates,
    }))
  }

  return (
    <CSSTransition
      in={isTableCol1}
      timeout={duration}
      nodeRef={ref}
      onEnter={() => {
        // 1. Calculate how far we need to shift left (a positive offset).
        const offset = calculateTranslateX()
        translateXRef.current = offset

        // 2. Immediately place the text at -offset, but right‐aligned.
        updateTransitionStyle({
          transform: `translateX(-${offset}px)`,
          textAlign: 'right',
          transition: 'none',
        })

        // 3. Transition to 0 so it slides in from the left.
        //    setTimeout ensures the browser has time to apply the first style.
        setTimeout(() => {
          updateTransitionStyle({
            transform: 'translateX(0)',
            textAlign: 'right',
            transition: `transform ${duration}ms ease-out`,
          })
        }, 400)
      }}
      onEntered={() => {
        // Once the entry animation is complete, remove the transform.
        updateTransitionStyle({
          transform: undefined,
          transition: undefined,
          textAlign: 'right',
        })
      }}
      onExit={() => {
        // Reverse the animation: move from offset → 0.
        const offset = translateXRef.current || 0
        updateTransitionStyle({
          transform: `translateX(${offset}px)`,
          textAlign: undefined,
          transition: 'none',
        })

        requestAnimationFrame(() => {
          updateTransitionStyle({
            transform: 'translateX(0)',
            transition: `transform ${duration}ms ease-out`,
            textAlign: undefined,
          })
        })
      }}
      onExited={() => {
        // Clear transform at the end, and remove right‐alignment.
        updateTransitionStyle({
          transform: undefined,
          transition: undefined,
          textAlign: undefined,
        })
      }}
    >
      <div
        ref={ref}
        style={{
          // Fix the height of the container to the last measured height to ensure that there is no layout shift when the Thought is removed from the DOM.
          // Must include DropChild, or it will shift when the cursor moves.
          height: shimHiddenThought && height != null ? height : undefined,
          ...transientStyle,
        }}
      >
        {
          /* Since no drop target is rendered when thoughts are hidden/shimmed, we need to create a drop target after a hidden parent.
             e.g. Below, a is hidden and all of b's siblings are hidden, but we still want to be able to drop before e. Therefore we must insert DropUncle when e would not be rendered.
               - a
                - b
                  - c [cursor]
                    - x
                  - d
                - e
           */
          !isVisible && dropUncle && <DropUncle depth={depth} path={path} simplePath={simplePath} cliff={prevCliff} />
        }

        {!shimHiddenThought && (
          <Subthought
            autofocus={autofocus}
            debugIndex={debugIndex}
            depth={depth + 1}
            dropUncle={dropUncle}
            env={env}
            indexDescendant={indexDescendant}
            isMultiColumnTable={isMultiColumnTable}
            leaf={leaf}
            updateSize={updateSize}
            path={path}
            prevChildId={prevChildId}
            showContexts={showContexts}
            simplePath={simplePath}
            style={style}
            zoomCursor={zoomCursor}
            marginRight={marginRight}
          />
        )}

        {isVisible && (
          <DropChild
            depth={depth}
            // In context view, we need to pass the source simplePath in order to add dragged thoughts to the correct lexeme instance.
            // For example, when dropping a thought onto a/m~/b, drop should be triggered with the props of m/b.
            // TODO: DragAndDropSubthoughts should be able to handle this.
            path={path}
            simplePath={simplePath}
            isLastVisible={isLastVisible}
          />
        )}
      </div>
    </CSSTransition>
  )
}

type VirtualThoughtPropsKeys = keyof typeof VirtualThought

const VirtualThoughtMemo = React.memo(VirtualThought, (prevProps, nextProps) => {
  let isEqual = true

  for (const key in prevProps) {
    if (key === 'path' || key === 'simplePath') {
      isEqual = equalPath(prevProps[key], nextProps[key])
      if (!isEqual) break
    } else if (prevProps[key as VirtualThoughtPropsKeys] !== nextProps[key as VirtualThoughtPropsKeys]) {
      isEqual = false
      break
    }
  }

  return isEqual
})

VirtualThoughtMemo.displayName = 'VirtualThought'

export default VirtualThoughtMemo
