import React, { useCallback, useEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { animated, useSpring, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'
import ContentEditable from 'react-contenteditable'
import { store } from '../store.js'

// util
import { checkIfPathShareSubcontext, treeToFlatArray } from '../util'

/** Wait for x ms. */
// eslint-disable-next-line
const wait = time => new Promise(
  res => setTimeout(() => res(), time)
)

const DISTANT_THOUGHT_OPACITY = 0.5
const TEXT_SELECTION_OPCAITY = 0.3

// React spring config
// const SPRING_CONFIG = { mass: 1, tension: 200, friction: 30, clamp: true }
const SPRING_CONFIG_GROUP = { clamp: true }

// factor by which second column of table view slides to right
const TABLE_SECOND_COLUMN_OFFSET = 0

// factor by which first column of table view slides to right
const TABLE_FIRST_COLUMN_OFFSET = 1.5

const TABLE_FIRST_COLUMN_WIDTH = 8

// factor by which x offset should be increase with each depth
const DEPTH_OFFSET = 1

/**
 *
 */
const TreeNode = ({
  styleProps,
  value,
  item,
  phase,
  heightObject,
  flatArray,
  oldItem,
  heightChangeCallback
}) => {
  const [bind, { height: viewHeight }] = useMeasure()
  const viewHeightRef = useRef(viewHeight)
  const wrapperRef = useRef()

  useEffect(() => {
    viewHeightRef.current = viewHeight
    heightChangeCallback({ key: item.key, height: viewHeight })
  }, [viewHeight])

  const isFirstColumn = item.viewInfo.table.column === 1

  const isOldItemFirstColumn = oldItem && oldItem.viewInfo.table.column === 1

  const prevItem = flatArray[item.index - 1]

  // we need to caculate y offset for the nodes which is not a first column but is just after a table row
  const shouldCalculateYOffset = prevItem && prevItem.viewInfo.table.column === 2 && prevItem.path.length > item.path.length

  /** Returns the difference between the height of the given node and all its descendants, or 0 if it has a greater height than its descendants. With the height of column 1 items is set to 0, this provides the necessary vertical offset for each row based on the maximum height of the content between the two columns. */
  const firstColumnYOffset = firstColumnNode => {
    if (!firstColumnNode) return 0
    const i = flatArray.findIndex(item2 => item2.key === firstColumnNode)
    const descendantItems = flatArray.slice(i + 1, item.index)
    if (descendantItems.length === 0) return 0
    const descendantsHeight = descendantItems
      .map(item => heightObject[item.key] || 0)
      .reduce((a, b) => a + b, 0)
    const prevSiblingHeight = heightObject[firstColumnNode] || 0
    const firstColumnYOffset = Math.max(0, prevSiblingHeight - descendantsHeight)
    return firstColumnYOffset
  }

  const yOffset = isFirstColumn || shouldCalculateYOffset
    ? firstColumnYOffset(isFirstColumn ? item.keyPrevSibling : prevItem.viewInfo.table.firstColumnNode)
    : 0

  const { height, marginTop, pseudoHeight } = useSpring({
    height: phase === 'leave' || (isFirstColumn && item.hasChildren) ? 0 : viewHeight,
    pseudoHeight: phase === 'leave' ? 0 : viewHeight,
    marginTop: yOffset,
  })

  /* ### Height Animation ###
    - viewHeight is 0 at mount and is later populated by the height observer hook.
    - prevent height animation when second column first item is leaving because
      y transform animation and overflow hidden with height animation looks weird and janky.
  */

  const width = isFirstColumn ? `${TABLE_FIRST_COLUMN_WIDTH}rem` : '70%'

  useEffect(() => {
    // mutating width using ref because changing width using inline style breaks resize observer :(
    if (wrapperRef.current) wrapperRef.current.style.width = width
  }, [width])

  const { x, selectionOpacity, rotation, opacity } = styleProps

  return (
    <animated.div
      style={{
        cursor: 'text',
        overflow: isOldItemFirstColumn || (isFirstColumn && item.hasChildren) ? 'visible' : 'hidden',
        height,
        marginTop
      }}
      onClick={() => {
        store.dispatch({
          type: 'setCursor',
          thoughtsRanked: item.path,
          cursorHistoryClear: true,
          editing: true,
        })
      }}
    >
      {/* wrapper div for conistent height observation during re-render because passing bind to animated div causes inconsistency */}
      <animated.div
        ref={wrapperRef}
        style={{
          opacity,
          ...x ? { transform: x.interpolate(_x => `translateX(${_x})`) } : {},
          // for first column height is made zero which takes away height anination. so using same height animation inside another nested div when height of the outer div is made zero.
          ...isFirstColumn && item.hasChildren ? { height: pseudoHeight, overflow: 'hidden' } : {}
        }}>
        <div {...bind}>
          <div
            style={{
              padding: '0.3rem',
              display: 'flex',
            }}
          >
            <animated.div
              style={{
                height: '0.86rem',
                width: '0.86rem',
                marginTop: '0.25rem',
                borderRadius: '50%',
                display: 'flex',
                marginRight: '0.4rem',
                justifyContent: 'center',
                alignItems: 'center',
                ...selectionOpacity ? {
                  background: selectionOpacity.interpolate(
                    o => `rgba(255,255,255,${o})`
                  ) } : {}
              }}
            >
              <animated.span
                style={{
                  ...rotation ? { transform: rotation.interpolate(r => `rotate(${r}deg)`) } : {},
                  fontSize: '0.94rem',
                }}
              >
                {item.hasChildren ? '▸' : '•'}
              </animated.span>
            </animated.div>
            <div style={{ flex: 1 }}>
              <ContentEditable
                style={{
                  height: '100%',
                  width: '100%',
                  wordWrap: 'break-word',
                  wordBreak: 'break-all',
                }}
                html={value}
                placeholder="Add a thought"
              />
            </div>
          </div>
        </div>
      </animated.div>
    </animated.div>
  )
}

/**
 *
 */
const calculateXOffset = (item, visibleStartDepth) => {
  const isFirstColumn = item.viewInfo.table.column === 1
  const isSecondColumn = item.viewInfo.table.column === 2

  const depth = item.path.length - visibleStartDepth

  const xOffsetCount =
          (depth * DEPTH_OFFSET +
            (isFirstColumn ? TABLE_FIRST_COLUMN_OFFSET : 0) +
            // for table view second column
            (isSecondColumn
              ? TABLE_SECOND_COLUMN_OFFSET + TABLE_FIRST_COLUMN_WIDTH
              : 0) +
            // deeper nodes adjust offset for the number of active first and second table columns above them
            item.viewInfo.table.tableSecondColumnsAbove *
              TABLE_FIRST_COLUMN_WIDTH) *
          1.2

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
}) => {

  const [heightObject, setHeightObject] = useState({})

  /** Transition for enter and update phases. */
  const enterAndUpdate = i => {
    // Note: react-spring gives old item in update :(. So accessing the latest item using the key
    const item = flatArrayKey[i.key]
    const xOffset = calculateXOffset(item, visibleStartDepth)

    return {
      opacity: item.isDistantThought ? DISTANT_THOUGHT_OPACITY : 1,
      rotation: item.expanded ? 90 : 0,
      selectionOpacity: item.isCursor ? TEXT_SELECTION_OPCAITY : 0,
      x: `${xOffset}rem`,
    }
  }

  /** Sort nodes by commparing two paths and dertermining which comes before vertically in the tree. */
  const sortByPath = (a, b) => {
    const index = checkIfPathShareSubcontext(a.path, b.path)
    if (a.path.length === index + 1) return -1
    else if (b.path.length === index + 1) return 1
    else if (a.path[index + 1].rank > b.path[index + 1].rank) return 1
    else return -1
  }

  const transitions = useTransition(
    flatArray,
    {
      key: node => node.key,
      sort: sortByPath,
      config: SPRING_CONFIG_GROUP,
      enter: enterAndUpdate,
      leave: item => ({ opacity: 0 }),
      update: enterAndUpdate,
    }
  )

  const nodeHeightChangeHandler = useCallback(({ height, key }) => {
    setHeightObject(heightObject => ({ ...heightObject, [key]: height }))
  }, [])

  return (
    <animated.div style={{ marginTop: '5rem', marginLeft: '5rem', height: '100%' }}>
      {transitions((props, item, { phase }) => {
        // Note: react-spring has issues with accessing proper phase value inside useTransition
        const leave = !flatArrayKey[item.key]
        return (
          <TreeNode
            key={item.key}
            item={flatArrayKey[item.key] || item}
            oldItem={oldFlatArrayKey[item.key]}
            styleProps={props}
            value={item.value}
            phase={leave ? 'leave' : ''}
            heightObject={heightObject}
            flatArray={flatArray}
            heightChangeCallback={nodeHeightChangeHandler}
          />
        )
      })}
    </animated.div>
  )
}

/**
 * Map state to props.
 */
const mapStateToProps = ({ cursor, showHiddenThoughts, thoughts }) => ({
  cursor: cursor,
  showHiddenThoughts,
  thoughts,
})

/**
 * HOC that handles caluation of flatArray and passes updated state to tree animation.
 */
const FlatTreeRenderer = ({ cursor, showHiddenThoughts }) => {
  const flatArray = treeToFlatArray(cursor, showHiddenThoughts).map((item, i) => ({ ...item, index: i }))
  const flatArrayKey = _.keyBy(flatArray, 'key')

  const oldFlatArrayRef = useRef([])
  const oldFlatArrayKeyRef = useRef({})

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
      oldFlatArray={oldFlatArrayRef.current}
      oldFlatArrayKey={oldFlatArrayKeyRef.current}
    />
  )
}

export default connect(mapStateToProps)(FlatTreeRenderer)
