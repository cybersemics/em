import React, { useRef } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { animated, useSpring, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'
import { store } from '../store.js'
import ContentEditable from 'react-contenteditable'

// util
import { treeToFlatArray } from '../util'

// factor by which second column of table view slides to right
const TABLE_SECOND_COLUMN_OFFSET = 5
// factor by which first column of table view slides to right
const TABLE_FIRST_COLUMN_OFFSET = 2

const TreeNode = ({ styleProps, value, item, oldItem, springKey, phase, rotation, selectionOpacity, visibleStartDepth }) => {

  const [bind, { height: viewHeight }] = useMeasure(value)

  // table view info
  const isFirstColumn = item.viewInfo.table.column === 1
  const isSecondColumn = item.viewInfo.table.column === 2
  const isSecondColumnFirstItem = isSecondColumn && item.viewInfo.table.index === 0
  const isOldItemSecondColumnFirstItem = oldItem ? (oldItem.viewInfo.table.column === 2 && oldItem.viewInfo.table.index === 0) : false

  // depth from the first visible node
  const depthOffsetFactor = (item.path.length - visibleStartDepth)

  /* ### X offset Animation ###
    - handle offset with increasing depth
    - handle table view

    TO-DO:
    - adjust x offset when multiple table view are open
  */
  const xOffsetCount = (
    depthOffsetFactor +
    (isFirstColumn ? TABLE_FIRST_COLUMN_OFFSET : 0) +
    // for table view second column
    (isSecondColumn ? TABLE_SECOND_COLUMN_OFFSET : 0) +
    // deeper nodes adjust offset for the number of active table second columns above them
    ((!isFirstColumn && !isSecondColumn) ? item.viewInfo.table.activeTableNodesAbove * (TABLE_SECOND_COLUMN_OFFSET) : 0)
  ) * 1.2

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
    - overflow is made visible when second column first item either entering or updating to avoid janky animation
      and also when element just transitoned from table second column first item to normal view
  */
  const overflow = phase !== 'leave' && (isSecondColumnFirstItem || (!isSecondColumnFirstItem && isOldItemSecondColumnFirstItem)) ? 'visible' : 'hidden'

  // ### Animation Handler ###
  const { height, width, x, y } = useSpring({
    from: {
      x: phase === 'enter' && isSecondColumnFirstItem ? (xOffsetCount - 6) : 0
    },
    to: {
      height: heightValue,
      x: xOffsetCount - (phase === 'leave' && isSecondColumnFirstItem ? 6 : 0),
      y: yOffset,
      // to-do: handle width and oveflow properly incase of table view
      width: isFirstColumn ? `${(item.path.length - visibleStartDepth + 4)}rem` : '500rem'
    },
    immediate: key => {
      if (key === 'y') {
        // prevent y offset animation of second column thoughts during mount
        return phase === 'enter' && isSecondColumnFirstItem
      }
    },
    config: { mass: 1, tension: 200, friction: 20, clamp: true }
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
        <animated.div style={{ ...styleProps, width, transform: y.to(y => `translateY(-${y}px)`) }}>
          <div style={{ padding: '0.3rem', display: 'flex' }}>
            <animated.div style={{ height: '0.86rem', width: '0.86rem', marginTop: '0.25rem', borderRadius: '50%', display: 'flex', marginRight: '0.4rem', justifyContent: 'center', alignItems: 'center', background: selectionOpacity.to(o => `rgba(255,255,255,${o})`) }}>
              <animated.span style={{ transform: rotation.to(r => `rotate(${r}deg)`), fontSize: '0.94rem' }}>
                { item.hasChildren ? '▸' : '•' }
              </animated.span>
            </animated.div>
            <ContentEditable html={value} style={{ flex: 1 }} placeholder='Add a thought'/>
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
      return ({
        opacity: item.isDistantThought ? 0.45 : 1,
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
