import React, { useCallback, useEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { animated, useSpring, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'
import { store } from '../store.js'
import ContentEditable from 'react-contenteditable'

// util
import { treeToFlatArray } from '../util'

const DISTANT_THOUGHT_OPACITY = 0.45

const TEXT_SELECTION_OPCAITY = 0.3

// React spring config
const SPRING_CONFIG = { mass: 1, tension: 200, friction: 30, clamp: true }
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
  heightChangeCallback,
}) => {
  const [bind, { height: viewHeight }] = useMeasure()
  const viewHeightRef = useRef(viewHeight)
  const wrapperRef = useRef()

  useEffect(() => {
    heightChangeCallback({ height: viewHeight, key: item.key })
    viewHeightRef.current = viewHeight
  }, [viewHeight])

  const isFirstColumn = item.viewInfo.table.column === 1

  /* ### Height Animation ###
    - viewHeight is 0 at mount and is later populated by the height observer hook.
    - prevent height animation when second column first item is leaving because
      y transform animation and overflow hidden with height animation looks weird and janky.
  */
  const heightValue = phase === 'leave' ? 0 : viewHeight

  const width = isFirstColumn ? `${TABLE_FIRST_COLUMN_WIDTH}rem` : '100%'

  React.useEffect(() => {
    // mutating width using ref because changing width using inline style breaks resize observer :(
    if (wrapperRef.current) wrapperRef.current.style.width = width
  }, [width])

  // ### Animation Handler ###
  const { height } = useSpring({
    to: {
      height: heightValue,
    },
    config: SPRING_CONFIG,
  })

  const { xy, selectionOpacity, rotation, opacity } = styleProps

  return (
    <animated.div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        cursor: 'text',
        height,
        overflow: 'hidden',
        transform: xy.interpolate((x, y) => `translate(${x}rem, ${y}px)`),
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
      <div {...bind}>
        <animated.div style={{ opacity }}>
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
                background: selectionOpacity.to(
                  o => `rgba(255,255,255,${o})`
                ),
              }}
            >
              <animated.span
                style={{
                  transform: rotation.to(r => `rotate(${r}deg)`),
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
        </animated.div>
      </div>
    </animated.div>
  )
}

/**
 *
 */
const calculateHeight = (heightKey, flatTree, fk) => {
  const { yOffsetObject } = flatTree.reduce(
    (acc, item) => {
      const depth = item.path.length
      const isFirstColumn = item.viewInfo.table.column === 1
      const isSecondColumn = item.viewInfo.table.column === 2
      const isSecondColumnFirstItem = isSecondColumn && item.viewInfo.table.index === 0

      const closestFirstColumn = acc.depthTableArray[acc.depthTableArray.length - 1]

      const firstColumnsAbove = acc.depthTableArray.filter(node => depth <= node.depth)
      const maxHeightAbove = firstColumnsAbove.reduce((a, b) => Math.max(a.heightAbove, b.heightAbove), {
        heightAbove: 0
      })
      const updatedHeightAbove = acc.heightAbove < maxHeightAbove && firstColumnsAbove.length > 0 ? maxHeightAbove : acc.heightAbove

      const heightToDeduct =
        isSecondColumnFirstItem && closestFirstColumn
          ? heightKey[closestFirstColumn.key]
          : 0

      const offset = updatedHeightAbove - heightToDeduct
      const heightAbove = offset + heightKey[item.key]

      /**
       *
       */
      const updatedDepthTableArray = () => acc.depthTableArray.filter(node => {
        return !firstColumnsAbove.find(_node => _node.key === node.key)
      })

      return {
        heightAbove,
        depthTableArray: [...firstColumnsAbove > 0 ? updatedDepthTableArray() : acc.depthTableArray].concat(isFirstColumn ? [{ depth: item.path.length, key: item.key, heightAbove }] : []),
        yOffsetObject: {
          ...acc.yOffsetObject,
          [item.key]: offset,
        },
      }
    },
    { depthTableArray: [], heightAbove: 0, yOffsetObject: {} }
  )

  return yOffsetObject
}

/**
 *
 */
const calculateXOffset = (item, visibleStartDepth) => {
  const isFirstColumn = item.viewInfo.table.column === 1
  const isSecondColumn = item.viewInfo.table.column === 2

  const depth = item.path.length - visibleStartDepth

  // // check if table view second column is mounting to initiate from to X tranform animation
  // const shouldProvideFromXOffset = phase === 'enter' && isSecondColumn

  // const fromXOffsetValue = xOffsetCount - 6

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
 *
 */
const TreeAnimation = ({
  flatArray,
  flatArrayKey,
  visibleStartDepth,
  oldFlatArrayKey,
}) => {
  const [heightObject, setHeightObject] = useState({})
  const yOffsetObject = calculateHeight(heightObject, flatArray, flatArrayKey)

  const transitions = useTransition(
    Object.values(flatArrayKey),
    node => node.key,
    {
      unique: true,
      config: SPRING_CONFIG_GROUP,
      enter: i => {
        const item = flatArrayKey[i.key] || i
        const heightAbove = yOffsetObject[i.key]
        const xOffset = calculateXOffset(item, visibleStartDepth)
        return {
          opacity: item.isDistantThought ? DISTANT_THOUGHT_OPACITY : 1,
          rotation: item.expanded ? 90 : 0,
          selectionOpacity: item.isCursor ? TEXT_SELECTION_OPCAITY : 0,
          xy: [xOffset, heightAbove || 0],
        }
      },
      leave: i => ({ opacity: 0 }),
      update: i => {
        const item = flatArrayKey[i.key] || i
        const heightAbove = yOffsetObject[i.key]
        const xOffset = calculateXOffset(item, visibleStartDepth)

        return {
          opacity: item.isDistantThought ? DISTANT_THOUGHT_OPACITY : 1,
          rotation: item.expanded ? 90 : 0,
          selectionOpacity: item.isCursor ? TEXT_SELECTION_OPCAITY : 0,
          ...isNaN(heightAbove) ? {} : { xy: [xOffset, heightAbove] },
        }
      },
    }
  )

  const nodeHeightChangeHandler = useCallback(({ height, key }) => {
    setHeightObject(heightObject => ({ ...heightObject, [key]: height }))
  }, [])

  return (
    <animated.div style={{ marginTop: '5rem', marginLeft: '5rem' }}>
      {transitions.map(({ item, key, props, phase }) => {
        return (
          <TreeNode
            key={key}
            springKey={key}
            item={flatArrayKey[key] || item}
            oldItem={oldFlatArrayKey[key]}
            visibleStartDepth={visibleStartDepth}
            styleProps={props}
            value={item.value}
            phase={phase}
            heightChangeCallback={nodeHeightChangeHandler}
          />
        )
      })}
    </animated.div>
  )
}

// todo: use cursorBeforeEdit instead of cursor to avoid re-rendering on every edit
// currently using usual cursor for development

/**
 *
 */
const mapStateToProps = ({ cursor, showHiddenThoughts, thoughts }) => ({
  cursor: cursor,
  showHiddenThoughts,
  thoughts,
})

/**
 *
 */
const FlatTreeRenderer = ({ cursor, showHiddenThoughts }) => {
  const flatArray = treeToFlatArray(cursor, showHiddenThoughts)
  const flatArrayKey = _.keyBy(flatArray, 'key')

  const oldFlatArrayKeyRef = useRef({})

  // the starting depth that determines the initial x offset of all thoughts
  const visibleStartDepth = flatArray.length > 0 ? flatArray[0].path.length : 0

  React.useEffect(() => {
    oldFlatArrayKeyRef.current = flatArrayKey
  })

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
