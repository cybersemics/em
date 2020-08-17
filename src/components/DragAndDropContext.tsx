import React from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'

// @ts-ignore
const options = {
  // @ts-ignore
  backends: [
    {
      backend: HTML5Backend
    },
    {
      backend: TouchBackend,
      options: { delayTouchStart: 200 },
      preview: true,
      transition: TouchTransition
    }
  ]
}

/** Drag and Drop Provider HOC. */
// @ts-ignore
export const DragAndDropContext: React.FC = ({ children }) => <DndProvider backend={MultiBackend} options={options}>{ children }</DndProvider>
