import React from 'react'
import { DragSource, DragSourceConnector, DragSourceMonitor, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { GenericObject } from '../utilTypes'

interface RenderFunctionDrop {
  isOver: boolean,
  isDragging: boolean,
  connectDropTarget: (el: JSX.Element) => any,
}

interface RenderFunctionDrag {
  isDragging: boolean,
  connectDragSource: (el: JSX.Element) => any,
}

/**
 * Drop Target HOC.
 */
export const DropWrapper = ({ children, onDrop, canDrop }: { children: React.FC<RenderFunctionDrop>, onDrop: (item: GenericObject, monitor: DropTargetMonitor) => void, canDrop: (item: GenericObject, monitor: DropTargetMonitor) => boolean }) => {
  const source = {
    canDrop,
    drop: onDrop,
  }

  /** Collect. */
  const collect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
    isDragging: monitor.getItem(),
  })

  const DropComponent = DropTarget('move', source, collect)(children)

  return <DropComponent/>
}

/**
 *
 */
export const DragWrapper = ({ children, beginDrag, endDrag, canDrag }: { children: React.FC<RenderFunctionDrag>, canDrag: () => boolean, beginDrag: () => void, endDrag: () => void }) => {

  const source = {
    beginDrag,
    endDrag,
    canDrag,
  }

  /** Collect. */
  const collect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  })

  const DragComponent = DragSource('move', source, collect)(children)
  return <DragComponent/>
}
