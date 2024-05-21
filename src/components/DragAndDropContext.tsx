import React from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'

const options = {
  backends: [
    {
      backend: HTML5Backend,
    },
    {
      backend: TouchBackend,
      options: { delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT },
      preview: true,
      transition: TouchTransition,
    },
  ],
}

/** Drag and Drop Provider HOC. */
export const DragAndDropContext: React.FC = ({ children }: { children?: React.ReactNode }) => (
  <DndProvider backend={MultiBackend as any} options={options}>
    {children}
  </DndProvider>
)
