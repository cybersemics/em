import React, { useEffect } from 'react'
import { DragElementWrapper, useDrag, useDrop } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'

interface RenderFunctionDrop {
    isOver: boolean,
    canDrop: boolean,
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
export const DropWrapper = ({ children, onDrop }: { children: React.FC<RenderFunctionDrop>, onDrop: () => void }) => {
  const [{ canDrop, isOver, isDragging }, drop] = useDrop({
    accept: 'move',
    drop: onDrop,
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
      isDragging: monitor.getItem(),
    }),
  })

  return children({ isOver, canDrop, drop, isDragging })
}

/**
 *
 */
export const DragWrapper = ({ children, beginDrag, endDrag, canDrag }: { children: React.FC<RenderFunctionDrag>, canDrag: () => boolean, beginDrag: () => void, endDrag: () => void }) => {
  const [{ isDragging }, drag, preview] = useDrag({
    item: { name: 'bullet', type: 'move' },
    begin: beginDrag,
    end: endDrag,
    canDrag,
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  })

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [])

  return children({ isDragging, drag })
}
