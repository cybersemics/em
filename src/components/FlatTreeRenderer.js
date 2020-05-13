import React, { useRef } from 'react'
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
const SPRING_CONFIG = { mass: 1, tension: 200, friction: 20, clamp: true }

// factor by which second column of table view slides to right
const TABLE_SECOND_COLUMN_OFFSET = 2.5

// factor by which first column of table view slides to right
const TABLE_FIRST_COLUMN_OFFSET = 1.5

// factor by which x offset should be increase with each depth
const DEPTH_OFFSET = 1

const TreeNode = ({ styleProps, value, item, oldItem, springKey, phase: actualPhase, rotation, selectionOpacity, visibleStartDepth }) => {

  const [bind, { height: viewHeight }] = useMeasure(value)

  /*
    Note: Sometimes 'enter' phase misses the height update because height observer hook
    provides actual height only after fraction of time. Since some animation (specially Y transform)
    depends on height during 'enter' phase, so stopping phase to enter 'update' until height is updated.
  */
  const phase = actualPhase === 'update' && viewHeight === 0 ? 'enter' : actualPhase

  // table view info
  const isFirstColumn = item.viewInfo.table.column === 1
  const isSecondColumn = item.viewInfo.table.column === 2
  const isSecondColumnFirstItem = isSecondColumn && item.viewInfo.table.index === 0
  const isOldItemSecondColumnFirstItem = oldItem ? oldItem.viewInfo.table.column === 2 && oldItem.viewInfo.table.index === 0 : false

  // depth from the first visible node
  const depth = item.path.length - visibleStartDepth

  /* ### X offset Animation ###
    - handle offset with increasing depth
    - handle table view

    TO-DO:
    - adjust x offset when multiple table view are open
  */
  const xOffsetCount = (
    depth * DEPTH_OFFSET +
    (isFirstColumn ? TABLE_FIRST_COLUMN_OFFSET : 0) +
    // for table view second column
    (isSecondColumn ? TABLE_SECOND_COLUMN_OFFSET : 0) +
    // deeper nodes adjust offset for the number of active first and second table columns above them
    item.viewInfo.table.tableFirstColumnsAbove * TABLE_FIRST_COLUMN_OFFSET +
    item.viewInfo.table.tableSecondColumnsAbove * TABLE_SECOND_COLUMN_OFFSET
  ) * 1.2

  // check if table view second column is mounting to initiate from to X tranform animation
  const shouldProvideFromXOffset = phase === 'enter' && isSecondColumn

  const fromXOffsetValue = xOffsetCount - 6

  /* ### Y Offset Animation ###
    - transform second column first item to be at same vertical level as first column
  */
  const yOffset = isSecondColumnFirstItem ? viewHeight : 0

  /* ### Height Animation ###
    - viewHeight is 0 at mount and is later populated by the height observer hook.
    - prevent height animation when second column first item is leaving because
      y transform animation and overflow hidden with height animation looks weird and janky.
  */
  const heightValue = phase === 'leave' || isSecondColumnFirstItem ? 0 : viewHeight

  /* ### Overflow ###
    - overflow 'hidden' is used in the wrapper div with height animation to give animated thought reveal effect.
    - overflow is made visible when the node is second column first item and also when element just transitoned
      from table second column first item to normal view
  */
  const overflow =
    isSecondColumnFirstItem ||
    (phase !== 'leave' && (!isSecondColumnFirstItem && isOldItemSecondColumnFirstItem))
      ? 'visible' : 'hidden'

  // ### Animation Handler ###
  const { height, width, x, y } = useSpring({
    from: {
      /*
        Note: from is only done for specific cases like second column x-offset transform animation
       */
      ...shouldProvideFromXOffset ? {
        x: fromXOffsetValue
      } : {}

    },
    to: {
      height: heightValue,
      x: xOffsetCount - (phase === 'leave' && isSecondColumn ? TABLE_SECOND_COLUMN_OFFSET : 0),
      y: yOffset,
      // to-do: handle width and oveflow properly incase of table view
      width: isFirstColumn ? '3rem' : '100%'
    },
    immediate: key => {
      if (key === 'y') {
        // prevent y offset animation of second column thoughts during mount
        return phase === 'enter' && isSecondColumnFirstItem
      }
    },
    config: SPRING_CONFIG
  })

  return (
    <animated.div
      style={{
        cursor: 'text',
        height,
        overflow: overflow,
        transform: x.to(x => `translateX(${x}rem)`)
      }}
      onClick={() => {
        store.dispatch({ type: 'setCursor', thoughtsRanked: item.path, cursorHistoryClear: true, editing: true })
      }}
    >
      {/* wrapper div for conistent height observation during re-render because passing bind to animated div causes inconsistency */}
      <div {...bind}>
        <animated.div style={{ ...styleProps, transform: y.to(y => `translateY(-${y}px)`) }}>
          <div style={{ padding: '0.3rem', display: 'flex' }}>
            <animated.div style={{ height: '0.86rem', width: '0.86rem', marginTop: '0.25rem', borderRadius: '50%', display: 'flex', marginRight: '0.4rem', justifyContent: 'center', alignItems: 'center', background: selectionOpacity.to(o => `rgba(255,255,255,${o})`) }}>
              <animated.span style={{ transform: rotation.to(r => `rotate(${r}deg)`), fontSize: '0.94rem' }}>
                { item.hasChildren ? '▸' : '•' }
              </animated.span>
            </animated.div>
            <animated.div style={{ width }} >
              <ContentEditable html={value} placeholder='Add a thought'/>
            </animated.div>
          </div>
        </animated.div>
      </div>
    </animated.div>
  )
}

const TreeAnimation = ({ flatArrayKey, visibleStartDepth, oldFlatArrayKey }) => {

  const transitions = useTransition(Object.values(flatArrayKey), node => node.key, {
    unique: true,
    from: i => ({ opacity: 0 }),
    enter: i => {
      const item = flatArrayKey[i.key] || i
      return {
        opacity: item.isDistantThought ? 0.45 : 1,
        rotation: item.expanded ? 90 : 0,
        selectionOpacity: item.isCursor ? 0.3 : 0
      }
    },
    leave: i => ({ opacity: 0 }),
    update: i => {
      const item = flatArrayKey[i.key] || i
      return {
        opacity: item.isDistantThought ? DISTANT_THOUGHT_OPACITY : 1,
        rotation: item.expanded ? 90 : 0,
        selectionOpacity: item.isCursor ? TEXT_SELECTION_OPCAITY : 0,
      }
    },
  })

  return (
    <animated.div style={{ marginTop: '5rem', marginLeft: '5rem' }}>
      {
        transitions.map(({ item, key, props, phase }) => {
          return <TreeNode key={key} springKey={key} item={flatArrayKey[key] || item} oldItem={oldFlatArrayKey[key]} visibleStartDepth={visibleStartDepth} styleProps={props} value={item.value} phase={phase} rotation={props.rotation} selectionOpacity={props.selectionOpacity}/>
        })
      }
    </animated.div>
  )
}

// todo: use cursorBeforeEdit instead of cursor to avoid re-rendering on every edit
// currently using usual cursor for development

const mapStateToProps = ({ cursor, showHiddenThoughts, thoughtIndex }) => ({ cursor: cursor, showHiddenThoughts, thoughtIndex })

const FlatTreeRenderer = ({ cursor, showHiddenThoughts }) => {

  const flatArray = treeToFlatArray(cursor, showHiddenThoughts)
  const flatArrayKey = _.keyBy(flatArray, 'key')

  const oldFlatArrayKeyRef = useRef({})

  // the starting depth that determines the initial x offset of all thoughts
  const visibleStartDepth = flatArray.length > 0 ? flatArray[0].path.length : 0

  React.useEffect(() => {
    oldFlatArrayKeyRef.current = flatArrayKey
  })

  return <TreeAnimation flatArrayKey={flatArrayKey} visibleStartDepth={visibleStartDepth} oldFlatArrayKey={oldFlatArrayKeyRef.current} />
}

export default connect(mapStateToProps)(FlatTreeRenderer)
