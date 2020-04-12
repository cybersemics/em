import React, { useRef } from 'react'
import { connect } from 'react-redux'
import { animated, useSpring, useTransition } from 'react-spring'
import useMeasure from '../hooks/useMeasure.js'

// util
import { treeToFlatArray } from '../util'
// import { checkIfPathShareSubcontext } from '../util/checkIfPathShareSubcontext'

// constant
// import { RANKED_ROOT } from '../constants'

const TreeNode = ({ style, value, item, springKey, phase }) => {

  const [bind, { height: viewHeight }] = useMeasure()

  const { height } = useSpring({
    from: { height: 0 },
    to: { height: phase !== 'leave' ? viewHeight : 0 },
    config: { mass: 1, tension: 200, friction: 20, clamp: true }
  })

  return (
    <animated.div style={{ overflow: 'hidden', height }}>
      <animated.div key={springKey} {...bind} style={{ height: '32px', margin: '0.3rem', ...style }}>
        {value}
      </animated.div>
    </animated.div>
  )
}

const TreeAnimation = ({ flatArray, visibleDepth }) => {

  const transitions = useTransition(flatArray, node => node.key, {
    unique: true,
    from: item => ({ opacity: 0 }),
    enter: item => ({ opacity: 1, display: 'block', x: (item.path.length - visibleDepth) * 1.2 }),
    leave: item => ({ opacity: 0 }),
    update: item => ({ x: (item.path.length - visibleDepth) * 1.2 }),
    onDestroyed: () => {
    }
  })

  return (
    <animated.div style={{ marginTop: '5rem', marginLeft: '5rem' }}>
      {
        transitions.map(({ item, key, props, phase }) => {
          return <TreeNode key={key} springKey={key} item={item} style={{ ...props, transform: props.x.interpolate(x => `translateX(${x}rem)`) }} value={item.value} phase={phase}/>
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

  return <TreeAnimation flatArray={flatArray} visibleDepth={visibleDepth} />
}

export default connect(mapStateToProps)(FlatTreeRenderer)
