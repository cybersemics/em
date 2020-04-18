import React, { useRef } from 'react'
import { connect } from 'react-redux'
import { animated, useSpring, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'
import { store } from '../store.js'
import ContentEditable from 'react-contenteditable'

// util
import { treeToFlatArray } from '../util'
// import { checkIfPathShareSubcontext } from '../util/checkIfPathShareSubcontext'

// constant
// import { RANKED_ROOT } from '../constants'

const TreeNode = ({ style, value, item, springKey, phase, rotation, selectionOpacity }) => {

  const [bind, { height: viewHeight }] = useMeasure()

  const { height } = useSpring({
    from: { height: 0 },
    to: { height: phase !== 'leave' ? viewHeight : 0 },
    config: { mass: 1, tension: 200, friction: 20, clamp: true }
  })

  return (
    <animated.div style={{ overflow: 'hidden', cursor: 'text', height }} onClick={() => {
      store.dispatch({ type: 'setCursor', thoughtsRanked: item.path, cursorHistoryClear: true, editing: true })
    }}>
      <animated.div key={springKey} {...bind} style={{ ...style }}>
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

const TreeAnimation = ({ flatArrayKey, visibleDepth }) => {

  const transitions = useTransition(Object.values(flatArrayKey), node => node.key, {
    unique: true,
    from: item => ({ opacity: 0 }),
    enter: item => ({ opacity: item.isDistantThought ? 0.45 : 1, display: 'block', x: (item.path.length - visibleDepth) * 1.2, rotation: item.expanded ? 90 : 0, selectionOpacity: item.isSelected ? 0.3 : 0 }),
    leave: item => ({ opacity: 0 }),
    update: item => ({ x: (item.path.length - visibleDepth) * 1.2, opacity: item.isDistantThought ? 0.45 : 1, rotation: item.expanded ? 90 : 0, selectionOpacity: item.isSelected ? 0.3 : 0 }),
  })

  return (
    <animated.div style={{ marginTop: '5rem', marginLeft: '5rem' }}>
      {
        transitions.map(({ item, key, props, phase }) => {
          return <TreeNode key={key} springKey={key} item={flatArrayKey[key] || item} style={{ ...props, transform: props.x.to(x => `translateX(${x}rem)`) }} value={item.value} phase={phase} rotation={props.rotation} selectionOpacity={props.selectionOpacity}/>
        })
      }
    </animated.div>
  )
}

// todo: use cursorBeforeEdit instead of cursor to avoid re-rendering on every edit
// currently using usual cursor for development

const mapStateToProps = ({ cursor }) => ({ cursor: cursor || [] })

const FlatTreeRenderer = ({ cursor }) => {

  const flatArray = treeToFlatArray(cursor)
  const flatArrayKey = flatArray.reduce((acc, node) => {
    acc[node.key] = node
    return acc
  }, {})

  const oldFlatArrayRef = useRef([])
  const oldFlatArrayKeyRef = useRef({})

  // this block of code may be used later

  // const deletedNodes = Object.keys(oldFlatArrayKeyRef.current).filter(key => !Object.keys(flatArrayKey).includes(key))
  // const addedNodes = Object.keys(flatArrayKey).filter(key => !Object.keys(oldFlatArrayKeyRef.current).includes(key))

  // const deletedNodesAbove = deletedNodes.reduce((acc, deletedKey) => {
  //   const deletedNode = oldFlatArrayKeyRef.current[deletedKey]
  //   const subcontextIndex = checkIfPathShareSubcontext(deletedNode.path, cursor)
  //   const isNodeCursorAncestor = deletedNode.path.length === subcontextIndex + 1
  //   const isNodeCursorChildren = cursor.length === subcontextIndex + 1

  //   if (subcontextIndex !== -1 && !isNodeCursorChildren
  //     && (
  //       isNodeCursorAncestor
  //       || deletedNode.path[subcontextIndex + 1].rank < cursor[subcontextIndex + 1].rank
  //     )) {
  //     return acc + 1
  //   }
  //   return acc
  // }, 0)

  // const addedNodesAbove = addedNodes.reduce((acc, addedKey) => {
  //   const addedNode = flatArrayKey[addedKey]
  //   const subcontextIndex = checkIfPathShareSubcontext(addedNode.path, cursor)
  //   const isNodeCursorAncestor = addedNode.path.length === subcontextIndex + 1
  //   const isNodeCursorChildren = cursor.length === subcontextIndex + 1

  //   if (subcontextIndex !== -1 && !isNodeCursorChildren
  //     && (
  //       isNodeCursorAncestor
  //       || addedNode.path[subcontextIndex + 1].rank < cursor[subcontextIndex + 1].rank
  //     )) {
  //     return acc + 1
  //   }
  //   return acc
  // }, 0)

  // const nodeChangeAbove = deletedNodesAbove > 0 ? -deletedNodesAbove : addedNodesAbove

  const visibleDepth = flatArray.length > 0 ? flatArray[0].path.length : 0

  React.useEffect(() => {
    oldFlatArrayRef.current = flatArray
    oldFlatArrayKeyRef.current = flatArrayKey
  })

  return <TreeAnimation flatArrayKey={flatArrayKey} visibleDepth={visibleDepth} />
}

export default connect(mapStateToProps)(FlatTreeRenderer)
