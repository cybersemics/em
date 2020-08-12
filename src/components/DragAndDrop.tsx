import React, { useLayoutEffect } from 'react'
import { DragElementWrapper, DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { GenericObject } from '../utilTypes'

interface RenderFunctionDrop {
    isOver: boolean,
    isDragging: boolean,
    drop: DragElementWrapper<any>,
}

interface RenderFunctionDrag {
    isDragging: boolean,
    drag: DragElementWrapper<any>,
}

/**
 * Drop Target HOC.
 */
export const DropWrapper = ({ children, onDrop, canDrop }: { children: React.FC<RenderFunctionDrop>, onDrop: (item: GenericObject, monitor: DropTargetMonitor) => void, canDrop: (item: GenericObject, monitor: DropTargetMonitor) => boolean }) => {
  const [{ isOver, isDragging }, drop] = useDrop({
    accept: 'move',
    drop: onDrop,
    canDrop,
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
      isDragging: monitor.getItem(),
    }),
  })

  return children({ isOver, drop, isDragging })
}

/**
 *
 */
export const DragWrapper = ({ children, beginDrag, endDrag, canDrag }: { children: React.FC<RenderFunctionDrag>, canDrag: () => boolean, beginDrag: () => void, endDrag: () => void }) => {
  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: 'move' },
    begin: beginDrag,
    end: endDrag,
    canDrag,
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  })

  useLayoutEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])

  return children({ isDragging, drag })
}
