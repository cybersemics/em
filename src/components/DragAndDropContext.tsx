import { FC, PropsWithChildren } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { MouseTransition, MultiBackend, TouchTransition } from 'react-dnd-multi-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'

const options = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: { delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT },
      preview: true,
      transition: TouchTransition,
    },
  ],
}

/** Drag and Drop Provider HOC. */
const DragAndDropContext: FC<PropsWithChildren> = ({ children }) => (
  <DndProvider backend={MultiBackend as any} options={options}>
    {children}
  </DndProvider>
)

export default DragAndDropContext
