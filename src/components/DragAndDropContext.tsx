import React from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

const options = {
  backends: [
    {
      backend: HTML5Backend,
    },
    {
      backend: TouchBackend,
      options: { delayTouchStart: 200 },
      preview: true,
      transition: TouchTransition,
    },
  ],
}

/** Drag and Drop Provider HOC. */
export const DragAndDropContext: React.FC = ({ children }) => (
  <DndProvider backend={MultiBackend as any} options={options}>
    {children}
  </DndProvider>
)
