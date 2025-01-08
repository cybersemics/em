import { DragSourceMonitor, useDrag } from 'react-dnd'
import Command from '../@types/Command'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { noop } from '../constants'
import store from '../stores/app'
import CommandRowOnly from './CommandRowOnly'

/** Renders all of a command's details as a table row. */
const CommandRow = ({
  customize,
  onSelect,
  selected,
  command,
  indexInToolbar,
  search,
}: {
  customize?: boolean
  indexInToolbar?: number | null
  onSelect?: (command: Command | null) => void
  selected?: boolean
  command: Command | null
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}) => {
  const [{ isDragging }, dragSource] = useDrag({
    type: DragAndDropType.ToolbarButton,
    item: (): DragToolbarItem => {
      store.dispatch(dragCommand(command?.id || null))
      return { command: command!, zone: DragCommandZone.Remove }
    },
    canDrag: () => !!command && !!customize,
    end: () => store.dispatch(dragCommand(null)),
    collect: (monitor: DragSourceMonitor) => {
      const item = monitor.getItem() as DragToolbarItem

      return {
        dragPreview: noop,
        isDragging: monitor.isDragging(),
        zone: item?.zone,
      }
    },
  })

  return (
    command && (
      <CommandRowOnly
        command={command}
        indexInToolbar={indexInToolbar}
        search={search}
        selected={selected}
        onClick={(_, command) => {
          onSelect?.(selected ? null : command)
        }}
        customize={customize}
        style={{ opacity: isDragging ? 0.5 : 1 }}
        ref={dragSource}
        isTable
      />
    )
  )
}

export default CommandRow
