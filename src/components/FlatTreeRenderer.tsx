import React, { useCallback, useEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { Interpolation, SpringValue, useSpring, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'
import { store } from '../store.js'

// util
import { checkIfPathShareSubcontext, contextOf, treeToFlatArray } from '../util'
import { isMobile } from '../browser'

// components
import ThoughtNewComponent from './ThoughtNew'

// types
import { FlatArrayNode } from '../util/treeToFlatArray'
import { State } from '../util/initialState.js'
import { Path } from '../types.js'
import { Nullable } from '../utilTypes.js'
import { RANKED_ROOT } from '../constants'

interface FlatArrayKey {
  [key: string]: FlatArrayNode,
}

interface SpringProps {
  [key: string]: SpringValue | Interpolation | string | number,
}

export interface DropEndObject {
  key: string,
  xOffset: number,
  thoughtsRanked: Path,
  showContexts: boolean,
}

interface TreeNode {
  styleProps: SpringProps,
  item: FlatArrayNode,
  phase: string,
  visibleStartDepth: number,
  heightObject: {
    [key: string]: number,
  },
  flatArray: FlatArrayNode[],
  flatArrayKey: FlatArrayKey,
  oldItem: FlatArrayNode,
  xOffset: string,
  heightChangeCallback: ({ height, key }: { height: number, key: string }) => void,
}

interface HeightObject { [key: string]: number }

// height update delay in ms
const HEIGHT_UPDATE_DELAY = 100

// opacity for distant thought
const DISTANT_THOUGHT_OPACITY = 0.5

// React spring config
const SPRING_CONFIG_GROUP = { clamp: true }

// rem unit by which first column of table view slides to right
const TABLE_FIRST_COLUMN_OFFSET = 1.5

// width of first column in rem unit
const TABLE_FIRST_COLUMN_WIDTH = 8

// rem unit by which second column of table view slides to right
const TABLE_SECOND_COLUMN_OFFSET = 1.5

// rem unit by which x offset should be increase with each depth
const DEPTH_OFFSET = 1

/** Calculate Drop End Object. */
const calculateDropEndObject = (dropEndArray: string[], itemXOffset: number, flatArrayKey: FlatArrayKey, visibleStartDepth: number): DropEndObject[] => {
  return dropEndArray.map(key => {
    const node = flatArrayKey[key]
    const xOffset = calculateXOffset(node, visibleStartDepth)
    return {
      key,
      xOffset: xOffset - itemXOffset,
      // @ts-ignore
      thoughtsRanked: node.thoughtsRanked.length > 1 ? contextOf(node.thoughtsRanked) : RANKED_ROOT as Child[],
      showContexts: node.viewInfo.context.active
    }
  })
}

/**
 * Tree Node component.
 */
const TreeNode = ({
  styleProps,
  item,
  phase,
  heightObject,
  flatArray,
  flatArrayKey,
  visibleStartDepth,
  oldItem,
  xOffset,
  heightChangeCallback
}: TreeNode) => {

  // @ts-ignore
  const [measureBind, { height: measuredHeight }] = useMeasure()
  const viewHeight: number = measuredHeight
  const viewHeightRef = useRef<number>(viewHeight)
  const wrapperDivRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    viewHeightRef.current = viewHeight
    heightChangeCallback({ key: item.key, height: viewHeight })
  }, [viewHeight])

  const isFirstColumn = item.viewInfo.table.column === 1

  const isOldItemFirstColumn = oldItem && oldItem.viewInfo.table.column === 1

  const prevItem = flatArray[item.index - 1]

  // we need to caculate y offset for the nodes which is not a first column but is just after a table row
  const shouldCalculateYOffset = prevItem && prevItem.viewInfo.table.column === 2 && prevItem.thoughtsResolved.length > item.thoughtsResolved.length

  /** Returns the difference between the height of the given node and all its descendants, or 0 if it has a greater height than its descendants. With the height of column 1 items is set to 0, this provides the necessary vertical offset for each row based on the maximum height of the content between the two columns. */
  const firstColumnYOffset = (firstColumnNode: string | null | undefined) => {
    if (!firstColumnNode) return 0
    const i = flatArray.findIndex(item2 => item2.key === firstColumnNode)
    const descendantItems = flatArray.slice(i + 1, item.index)
    if (descendantItems.length === 0) return 0
    const descendantsHeight = descendantItems
      .map(item => heightObject[item.key] || 15)
      .reduce((a, b) => a + b, 0)
    const prevSiblingHeight = heightObject[firstColumnNode] || 15
    const firstColumnYOffset = Math.max(0, prevSiblingHeight - descendantsHeight)
    return firstColumnYOffset
  }

  const yOffset = isFirstColumn || shouldCalculateYOffset
    ? firstColumnYOffset(isFirstColumn ? item.keyPrevSibling : prevItem.viewInfo.table.firstColumnNode)
    : 0

  /*
    1. First column node should have height zero to vertically align columns in table view.
    2. If first column has active table view or has no children then do not make height zero.
  */
  const shouldMakeHeightZero = !item.viewInfo.table.isActive && isFirstColumn && item.hasChildren
  const shouldMakeHeightZeroPrev = oldItem && !oldItem.viewInfo.table.isActive && isOldItemFirstColumn && oldItem.hasChildren

  const { height, marginTop, pseudoHeight } = useSpring({
    height: phase === 'leave' || shouldMakeHeightZero ? 0 : viewHeight,
    pseudoHeight: phase === 'leave' ? 0 : viewHeight,
    marginTop: yOffset,
    config: { clamp: true },
    onRest: () => {
      // after height animation is complete make the wrapper overflow visible to allow drag end component to be clickable
      if (wrapperDivRef.current) wrapperDivRef.current.style.overflow = 'visible'
    }
  })

  // check if it was node was previously a first column and now isn't
  const isFirstColumnToggle = isOldItemFirstColumn && !isFirstColumn

  const { x, opacity } = styleProps

  // @ts-ignore
  const width = isFirstColumn ? `${TABLE_FIRST_COLUMN_WIDTH}rem` : `calc(100% - ${xOffset})`

  const wrapperStyle = {
    // @ts-ignore
    ...x ? { transform: x.interpolate(_x => `translateX(${_x})`) } : {},
    position: 'relative',
    top: 0,
    zIndex: flatArray.length - item.index,
    width,
    overflow: phase === 'update' || isFirstColumnToggle || shouldMakeHeightZero || (shouldMakeHeightZeroPrev && !shouldMakeHeightZero) ? 'visible' : 'hidden',
    height,
    marginTop,
  }

  const innerDivStyle = {
    opacity,
    // for first column height is made zero which takes away height animation. so using same height animation inside another nested div when height of the outer div is made zero.
    ...shouldMakeHeightZero ? { height: pseudoHeight, overflow: 'hidden' } : {}
  }

  // eslint-disable-next-line
  const itemXOffset = () => calculateXOffset(item, visibleStartDepth)

  const dropEndArray = phase !== 'leave' && item.dropEnd && item.dropEnd.length > 0 ? calculateDropEndObject(item.dropEnd, itemXOffset(), flatArrayKey, visibleStartDepth) : []
  const updatedItem = { ...item, dropEndArray }

  return (
    <ThoughtNewComponent
      innerDivStyle={innerDivStyle}
      measureBind={measureBind}
      wrapperStyle={wrapperStyle}
      wrapperDivRef={wrapperDivRef}
      nodeItem={updatedItem}
    />
  )
}

/**
 * Calculate x offset.
 */
const calculateXOffset = (item: FlatArrayNode, visibleStartDepth: number) => {
  const isFirstColumn = item.viewInfo.table.column === 1
  const isSecondColumn = item.viewInfo.table.column === 2

  const depth = item.thoughtsResolved.length - visibleStartDepth

  const xOffsetCount =
          depth * DEPTH_OFFSET +
            (isFirstColumn ? TABLE_FIRST_COLUMN_OFFSET : 0) +
            // for table view second column
            (isSecondColumn
              ? TABLE_SECOND_COLUMN_OFFSET
              : 0) +
            (item.viewInfo.table.tableFirstColumnsAbove * (TABLE_FIRST_COLUMN_OFFSET + TABLE_FIRST_COLUMN_WIDTH)) +
            (item.viewInfo.table.tableSecondColumnsAbove * TABLE_SECOND_COLUMN_OFFSET)

  return xOffsetCount
}

/**
 * Component that handles flat tree group animations.
 */
const TreeAnimation = ({
  flatArray,
  flatArrayKey,
  oldFlatArrayKey,
  visibleStartDepth,
}:
{ flatArray: FlatArrayNode[],
  flatArrayKey: FlatArrayKey,
  oldFlatArrayKey: FlatArrayKey,
  visibleStartDepth: number,
}) => {

  const [heightObject, setHeightObject] = useState<HeightObject>({})
  const heightObjectRef = useRef<HeightObject>({})

  /** Transition for enter and update phases. */
  const enterAndUpdate = (i: FlatArrayNode) => {
    // Note: react-spring gives old item in update :(. So accessing the latest item using the key

    const item = flatArrayKey[i.key]
    const xOffset = calculateXOffset(item, visibleStartDepth)

    return {
      opacity: item.isDistantThought ? DISTANT_THOUGHT_OPACITY : 1,
      x: `${xOffset}rem`,
    }
  }

  /** Sort nodes by commparing two paths and dertermining which comes before vertically in the tree. */
  const sortByPath = (a: FlatArrayNode, b: FlatArrayNode) => {
    const index = checkIfPathShareSubcontext(a.thoughtsResolved, b.thoughtsResolved)

    if (a.thoughtsResolved.length === index + 1) return -1
    else if (b.thoughtsResolved.length === index + 1) return 1
    else {
      const isAleaving = !flatArrayKey[a.key]
      const isBleaving = !flatArrayKey[a.key]

      const itemA = (isAleaving ? oldFlatArrayKey : flatArrayKey)[a.key]
      const itemB = (isBleaving ? oldFlatArrayKey : flatArrayKey)[b.key]

      return !itemA || !itemB ? 1 : itemA.index > itemB.index ? 1 : -1
    }
  }

  const transitions = useTransition(
    flatArray,
    {
      key: node => node.key,
      sort: sortByPath,
      from: { opacity: 0 },
      config: SPRING_CONFIG_GROUP,
      enter: enterAndUpdate,
      leave: () => ({ opacity: 0 }),
      update: enterAndUpdate,
    }
  )

  const debouncedHeightUpdate = useCallback(_.debounce(() => {
    setHeightObject(heightObject => ({ ...heightObject, ...heightObjectRef.current }))
    heightObjectRef.current = {}
  }, HEIGHT_UPDATE_DELAY), [])

  const nodeHeightChangeHandler = useCallback(({ height, key }) => {
    heightObjectRef.current = { ...heightObjectRef.current, [key]: height }
    debouncedHeightUpdate()
  }, [])

  return (
    <div className='flat-renderer' style={{ marginTop: '5rem', padding: isMobile ? '0 1rem' : '0 5rem', height: '100%' }}>
      {transitions((props, item) => {
        // Note: react-spring has issues with accessing proper phase value inside useTransition. Also passing phase directly causes some issues
        const leave = !flatArrayKey[item.key]
        const update = !leave && oldFlatArrayKey[item.key]
        const xOffset = calculateXOffset(item, visibleStartDepth)

        return (
          <TreeNode
            key={item.key}
            item={flatArrayKey[item.key] || item}
            oldItem={oldFlatArrayKey[item.key]}
            styleProps={props}
            phase={leave ? 'leave' : update ? 'update' : ''}
            heightObject={heightObject}
            flatArray={flatArray}
            heightChangeCallback={nodeHeightChangeHandler}
            flatArrayKey={flatArrayKey}
            xOffset={`${xOffset}rem`}
            visibleStartDepth={visibleStartDepth}
          />
        )
      })}
    </div>
  )
}

/**
 * Map state to props.
 */
const mapStateToProps = ({ cursor, thoughts, contextViews, showHiddenThoughts }: State) => ({
  cursor,
  thoughts,
  contextViews,
  showHiddenThoughts
})

/**
 * HOC that handles calculation of flatArray and passes updated state to tree animation.
 */
const FlatTreeRenderer = ({ cursor }: { cursor: Nullable<Path>}) => {
  const state = store.getState()
  const flatArray = treeToFlatArray(state, cursor).map((item, i) => ({ ...item, index: i }))
  const flatArrayKey: FlatArrayKey = _.keyBy(flatArray, 'key')

  const oldFlatArrayRef = useRef<FlatArrayNode[]>([])
  const oldFlatArrayKeyRef = useRef<FlatArrayKey>({})

  // the starting depth that determines the initial x offset of all thoughts
  const visibleStartDepth = flatArray.length > 0 ? flatArray[0].path.length : 0

  React.useEffect(() => {
    oldFlatArrayRef.current = flatArray
    oldFlatArrayKeyRef.current = flatArrayKey
  }, [flatArray])

  return (
    <TreeAnimation
      flatArray={flatArray}
      flatArrayKey={flatArrayKey}
      visibleStartDepth={visibleStartDepth}
      oldFlatArrayKey={oldFlatArrayKeyRef.current}
    />
  )
}

export default connect(mapStateToProps)(FlatTreeRenderer)
