import React, { useCallback, useEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { animated, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'
import ContentEditable from 'react-contenteditable'
import { store } from '../store.js'

// util
import { contextOf, isDescendant, pathToContext, treeToFlatArray } from '../util'

/** Wait for x ms. */
// eslint-disable-next-line
const wait = time => new Promise(
  res => setTimeout(() => res(), time)
)

const DISTANT_THOUGHT_OPACITY = 0.45
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

  const width = isFirstColumn ? `${TABLE_FIRST_COLUMN_WIDTH}rem` : '70%'

  useEffect(() => {
    // mutating width using ref because changing width using inline style breaks resize observer :(
    if (wrapperRef.current) wrapperRef.current.style.width = width
  }, [width])

  useEffect(() => () => heightChangeCallback({ height: null, key: item.key }), [])

  const { x, y, selectionOpacity, rotation, opacity } = styleProps

  return (
    <animated.div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        cursor: 'text',
        height: 0,
        ...y ? { transform: y.interpolate(_y => `translateY(${_y})`) } : {},
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
      <animated.div style={{
        opacity,
        ...x ? { transform: x.interpolate(_x => `translateX(${_x})`) } : {},
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
 * Given height object and flat tree this function calculates yOffset for all the visible nodes.
 */
const calculateYoffset = (heightKey, flatTree) => {
  const { yOffsetObject } = flatTree.reduce(
    (acc, item) => {

      // here offsetAbove and array of firstColumnsAbove is used to decide the accurate offset of the node
      const depth = item.path.length
      const isFirstColumn = item.viewInfo.table.column === 1
      const isSecondColumn = item.viewInfo.table.column === 2
      const isSecondColumnFirstItem = isSecondColumn && item.viewInfo.table.index === 0

      // closest first column above this node
      const closestFirstColumn = acc.depthTableArray[acc.depthTableArray.length - 1]

      // the principle is that current node y offset is affected by first column nodes that are above and are at equal or deeper depth
      // so filtering out nodes that are at lower depths and calculating the max height above which is basically offset
      // Note: not filtering this out of depthTableArray becuase it may be required for other
      const firstColumnsAbove = acc.depthTableArray.filter(node => depth <= node.depth)
      const maxOffsetAbove = firstColumnsAbove.reduce((acc, b) => Math.max(acc, b.offsetAbove), 0)

      // check if first columns above gives more y offset or the regular flow
      const updatedOffsetAbove = acc.offsetAbove < maxOffsetAbove && firstColumnsAbove.length > 0 ? maxOffsetAbove : acc.offsetAbove

      // deduct y offset equal to the closest first column if node is second column first item
      const heightToDeduct =
        isSecondColumnFirstItem && closestFirstColumn
          ? heightKey[closestFirstColumn.key] || 0
          : 0

      // actual offset of the node
      const offset = updatedOffsetAbove - heightToDeduct

      // regular offset that will be used by consecutive node
      const offsetAbove = offset + (heightKey[item.key] || 0)

      /**
       * Delete all first columns from depthTableArray after node has calculated heightAbove.
       */
      const updatedDepthTableArray = () => acc.depthTableArray.filter(node => !firstColumnsAbove.find(_node => _node.key === node.key))

      return {
        offsetAbove,
        // depthTableArray keeps track of table first columns node as we iterate the flat tree
        depthTableArray: [...firstColumnsAbove.length > 0 ? updatedDepthTableArray() : acc.depthTableArray].concat(isFirstColumn ? [{ depth: item.path.length, key: item.key, offsetAbove }] : []),
        yOffsetObject: {
          ...acc.yOffsetObject,
          [item.key]: offset,
        },
      }
    },
    { depthTableArray: [], offsetAbove: 0, yOffsetObject: {} }
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
 * Takes flat array and returns y offset and a function that updates height.
 * On setting updated height object using the `setHeightObject` calculates new yoffset and returns updated yOffset.
 */
const useYoffsetHandler = flatArray => {

  // only re-render for change in yOffsetObject
  const heightObjectRef = useRef({})
  const flatArrayRef = useRef(flatArray)

  // we don't want setHeightObject to rebuild and cause re-render. so using ref to pass updated dependency
  flatArrayRef.current = flatArray
  const [yOffsetObject, setYO] = useState({})

  // side-effect to update y offset when flatArray changes
  useEffect(() => {
    setHeightObject({})
  }, [flatArray])

  /** This height takes updated height obj and calculates y offset obj. */
  const setHeightObject = useCallback(updatedHeightObject => {
    heightObjectRef.current = { ...heightObjectRef.current, ...updatedHeightObject }
    const updatedOffsetObj = calculateYoffset(heightObjectRef.current, flatArrayRef.current)
    setYO(updatedOffsetObj)
  }, [])

  return { yOffsetObject, heightObj: heightObjectRef, setHeightObject }
}

/**
 * Component that handles flat tree group animations.
 */
const TreeAnimation = ({
  flatArray,
  flatArrayKey,
  visibleStartDepth,
  oldFlatArray,
  oldFlatArrayKey
}) => {
  const { yOffsetObject, heightObj, setHeightObject } = useYoffsetHandler(flatArray)
  const yOffsetObjectOldRef = useRef(yOffsetObject)
  const heightObjectPendingRef = useRef([])

  useEffect(() => {
    yOffsetObjectOldRef.current = yOffsetObject
  }, [yOffsetObject])

  const yOffsetObjectOld = yOffsetObjectOldRef.current

  const transitions = useTransition(
    flatArray,
    node => node.key,
    {
      config: SPRING_CONFIG_GROUP,
      unique: true,
      from: {
        opacity: 0
      },
      enter: i => async next => {
        const item = flatArrayKey[i.key] || i
        wait(20)
        // find the item just above it in the flat array which was available in old flat array
        const lastItem = flatArray[Math.max(0, item.index - 1)]
        const yOffsetObject = calculateYoffset({ ...heightObj.current }, flatArray)
        const yOffsetStart = yOffsetObject[lastItem.key]
        const yOffsetTo = yOffsetObject[item.key]

        const isSecondColumn = item.viewInfo.table.column === 2

        const xOffsetTo = calculateXOffset(item, visibleStartDepth)
        const xOffsetStart = isSecondColumn ? xOffsetTo - 10 : calculateXOffset(lastItem, visibleStartDepth)

        await next({
          opacity: 0,
          x: `${xOffsetStart > xOffsetTo ? xOffsetTo : xOffsetStart}rem`,
          ...!isNaN(yOffsetStart) ? { y: `${yOffsetStart}px` } : {}
        })

        await next({
          opacity: 1,
          rotation: item.expanded ? 90 : 0,
          x: `${xOffsetTo}rem`,
          selectionOpacity: item.isCursor ? TEXT_SELECTION_OPCAITY : 0,
          ...!isNaN(yOffsetTo) ? { y: `${yOffsetTo}px` } : {}
        })
      },
      leave: item => async next => {
        // we need new nodes height for animating out y offset animations
        // waiting for heightObject update
        await wait(20)

        const isSecondColumn = item.viewInfo.table.column === 2

        // find the item which is available in new flat array and was above the leaving node in old array
        const lastItem = oldFlatArray.slice(0, item.index).reduce(
          (acc, _item) => {
            const isSibling = _item.path.length === item.path.length && isDescendant(contextOf(pathToContext(_item.path)), pathToContext(item.path))
            return flatArrayKey[_item.key] && (isDescendant(pathToContext(_item.path), pathToContext(item.path)) || isSibling) ? _item : acc
          },
          null)

        // if there such item then find it's new state item
        const newLastItem = lastItem ? flatArrayKey[lastItem.key] : null

        const xOffset = calculateXOffset(newLastItem || item, visibleStartDepth)

        // right to left animation for second columns during unmount
        const finalXOffset = xOffset - (isSecondColumn && !newLastItem ? 5 : 0)

        const yOffsetObject = calculateYoffset({ ...heightObj.current }, flatArray)
        // if node above is unmounting then this node needs to animate yoffset accordingly to prevent overlap with visible nodes
        const heightAbove = newLastItem ? yOffsetObject[newLastItem.key] : yOffsetObjectOld[item.key]

        await next({
          x: `${finalXOffset}rem`,
          ...!isNaN(heightAbove) ? { y: `${heightAbove}px` } : {},
          opacity: 0
        })
      },
      update: i => {
        const item = flatArrayKey[i.key] || i
        const heightAbove = yOffsetObject[i.key]
        const xOffset = calculateXOffset(item, visibleStartDepth)

        return {
          opacity: item.isDistantThought ? DISTANT_THOUGHT_OPACITY : 1,
          rotation: item.expanded ? 90 : 0,
          selectionOpacity: item.isCursor ? TEXT_SELECTION_OPCAITY : 0,
          x: `${xOffset}rem`,
          ...isNaN(heightAbove) ? {} : { y: `${heightAbove}px` },
        }
      },
    }
  )

  /**
   * Debounced memoized function that updates height.
   */
  const debouncedHeightUpdate = useCallback(_.debounce(() => {
    setHeightObject(heightObjectPendingRef.current)
    heightObjectPendingRef.current = {}
  }, 12), [])

  /**
   * Callback memoized function that runs on node height change.
   */
  const nodeHeightChangeHandler = useCallback(({ height, key }) => {
    heightObjectPendingRef.current = { ...heightObjectPendingRef.current, [key]: height }
    debouncedHeightUpdate()
  }, [])

  return (
    <animated.div style={{ marginTop: '5rem', marginLeft: '5rem', height: '100%' }}>
      {transitions.map(({ item, key, props, phase }) => {
        return (
          <TreeNode
            key={key}
            item={flatArrayKey[key] || item}
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

/**
 *
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
