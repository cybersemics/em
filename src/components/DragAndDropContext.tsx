import { FC, PropsWithChildren } from 'react'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider, PointerTransition, TouchTransition } from 'react-dnd-multi-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'

const options = {
  backends: [
    // HTML5 backend
    // https://react-dnd.github.io/react-dnd/docs/backends/html5
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: PointerTransition,
    },
    // Touch backend
    // https://react-dnd.github.io/react-dnd/docs/backends/touch
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
  <DndProvider options={options}>{children}</DndProvider>
)

export default DragAndDropContext
