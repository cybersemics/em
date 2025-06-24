import { FC, PropsWithChildren } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { isTouch } from '../browser'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../constants'

/** Drag and Drop Provider HOC. */
const DragAndDropContext: FC<PropsWithChildren> = ({ children }) => (
  <DndProvider
    backend={isTouch ? TouchBackend : HTML5Backend}
    options={{ delayTouchStart: TIMEOUT_LONG_PRESS_THOUGHT, preview: true }}
  >
    {children}
  </DndProvider>
)

export default DragAndDropContext
