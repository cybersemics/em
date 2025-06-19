import { FC, PropsWithChildren } from 'react'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider, PointerTransition, TouchTransition } from 'react-dnd-multi-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'

const options = {
  backends: [
    // If HTML5Backend is active, it will override a thought's draggable attribute and set it to false.
    // On iOS Safari, this enables undesirable native long press behavior (#2953, #2931, #2964)

    // Touch backend
    // https://react-dnd.github.io/react-dnd/docs/backends/touch
    {
      id: 'touch',
      backend: TouchBackend,
      options: { delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT },
      preview: true,
      transition: TouchTransition,
    },
    // HTML5 backend
    // https://react-dnd.github.io/react-dnd/docs/backends/html5
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: PointerTransition,
    },
  ],
}

/** Drag and Drop Provider HOC. */
const DragAndDropContext: FC<PropsWithChildren> = ({ children }) => (
  <DndProvider options={options}>{children}</DndProvider>
)

export default DragAndDropContext
