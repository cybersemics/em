import React, { useRef } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { animated, useSpring, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'
import { store } from '../store.js'
import ContentEditable from 'react-contenteditable'

// util
import { treeToFlatArray } from '../util'

const TABLE_SECOND_COLUMN_OFFSET = 5 // factor by which second column of table view slides to right
const TABLE_FIRST_COLUMN_OFFSET = 2 // factor by which second column of table view slides to right

const TreeNode = ({ styleProps, value, item, oldItem, springKey, phase, rotation, selectionOpacity, visibleStartDepth }) => {

  const [bind, { height: viewHeight }] = useMeasure()

  // table view info
  const isFirstColumn = item.viewInfo.table.column === 1
  const isSecondColumn = item.viewInfo.table.column === 2
  const isSecondColumnFirstItem = isSecondColumn && item.viewInfo.table.index === 0
  const isOldItemSecondColumnFirstItem = oldItem ? (oldItem.viewInfo.table.column === 2 && oldItem.viewInfo.table.index === 0) : false

  const depthOffsetFactor = (item.path.length - visibleStartDepth) // depth from the first visible node

  const xOffsetCount = (
    depthOffsetFactor +
    (isFirstColumn ? TABLE_FIRST_COLUMN_OFFSET : 0) +
    (isSecondColumn ? TABLE_SECOND_COLUMN_OFFSET : 0) + // for table view second column
    ((!isFirstColumn && !isSecondColumn) ? item.viewInfo.table.activeTableNodesAbove * (TABLE_SECOND_COLUMN_OFFSET) : 0) // deeper nodes adjust offset for the number of active table second columns above them
  ) * 1.2

  const { height, width, xy } = useSpring({
    from: {
      height: 0,
    },
    to: {
      height: phase !== 'leave' && !isSecondColumnFirstItem ? viewHeight : 0,
      xy: [xOffsetCount, isSecondColumnFirstItem ? viewHeight : 0],
      width: item.viewInfo.table.column === 1 ? `${(item.path.length - visibleStartDepth + 4)}rem` : '500rem'
    },
    config: { mass: 1, tension: 200, friction: 20, clamp: true }
  })

  return (
    <animated.div style={{ cursor: 'text', height: (isOldItemSecondColumnFirstItem && !isSecondColumnFirstItem) ? `${viewHeight}px` : height, overflow: (isSecondColumnFirstItem && phase !== 'leave') ? 'visible' : 'hidden', transform: xy.to((x, y) => `translate(${x}rem,-${y}px)`), position: isSecondColumnFirstItem ? 'relative' : 'inherit' }} onClick={() => {
      store.dispatch({ type: 'setCursor', thoughtsRanked: item.path, cursorHistoryClear: true, editing: true })
    }}>
      <animated.div key={springKey} {...bind} style={{ ...styleProps, width }}>
        <div style={{ padding: '0.3rem', display: 'flex' }}>
          <animated.div style={{ height: '0.86rem', width: '0.86rem', marginTop: '0.25rem', borderRadius: '50%', display: 'flex', marginRight: '0.4rem', justifyContent: 'center', alignItems: 'center', background: selectionOpacity.to(o => `rgba(255,255,255,${o})`) }}>
            <animated.span style={{ transform: rotation.to(r => `rotate(${r}deg)`), fontSize: '0.94rem' }}>
              { item.hasChildren ? '▸' : '•' }
            </animated.span>
          </animated.div>
          <ContentEditable html={value} placeholder='Add a thought'/>
        </div>
      </animated.div>
    </animated.div>
  )
}

const TreeAnimation = ({ flatArrayKey, visibleStartDepth, oldFlatArrayKey }) => {

  const transitions = useTransition(Object.values(flatArrayKey), node => node.key, {
    unique: true,
    from: i => ({ opacity: 0 }),
    enter: i => {
      const item = flatArrayKey[i.key] || i
      return ({
        opacity: item.isDistantThought ? 0.45 : 1,
        display: 'block',
        rotation: item.expanded ? 90 : 0,
        selectionOpacity: item.isCursor ? 0.3 : 0
      })
    },
    leave: i => ({ opacity: 0 }),
    update: i => {
      const item = flatArrayKey[i.key] || i
      return ({
        opacity: item.isDistantThought ? 0.45 : 1,
        rotation: item.expanded ? 90 : 0,
        selectionOpacity: item.isCursor ? 0.3 : 0,
      })
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

const mapStateToProps = ({ cursor, showHiddenThoughts, thoughtIndex }) => ({ cursor: cursor || [], showHiddenThoughts, thoughtIndex })

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
