import { DragSourceMonitor, useDrag } from 'react-dnd'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { CommandViewType } from '../@types/CommandViewType'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { noop } from '../constants'
import store from '../stores/app'
import CommandRowOnly from './CommandRowOnly'

/** Renders all of a command's details as either a grid item or table row. */
const CommandItem = ({
  viewType = 'table',
  customize,
  onSelect,
  selected,
  command,
  search,
}: {
  viewType?: CommandViewType
  customize?: boolean
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

  if (!command) return null

  return (
    <CommandRowOnly
      command={command}
      search={search}
      selected={selected}
      onClick={(_, command) => {
        onSelect?.(selected ? null : command)
      }}
      style={{ opacity: isDragging ? 0.5 : 1, paddingInline: 0 }}
      ref={dragSource}
      isTable
      cssRaw={css.raw({
        ...(customize
          ? {
              '&:active, [data-drop-to-remove-from-toolbar-hovering] &': {
                WebkitTextStrokeWidth: '0.05em',
              },
            }
          : null),
      })}
      viewType={viewType}
      alwaysShowDescription
    />
  )
}

export default CommandItem
