import { DragSourceMonitor, useDrag } from 'react-dnd'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import GesturePath from '../@types/GesturePath'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { isTouch } from '../browser'
import { formatKeyboardShortcut } from '../commands'
import { noop } from '../constants'
import store from '../stores/app'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'

/** Converts the integer into an ordinal, e.g. 1st, 2nd, 3rd, 4th, etc. */
const ordinal = (n: number) => {
  const s = n.toString()
  return s.endsWith('1') && n !== 11
    ? s + 'st'
    : s.endsWith('2') && n !== 12
      ? s + 'nd'
      : s.endsWith('3') && n !== 13
        ? s + 'rd'
        : s + 'th'
}

type ViewType = 'grid' | 'table'

/** Renders all of a command's details as either a grid item or table row. */
const CommandItem = ({
  viewType = 'table',
  customize,
  onSelect,
  selected,
  command,
  indexInToolbar,
  search,
}: {
  viewType?: ViewType
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

  const description = useSelector(state => {
    if (!command) return ''
    return typeof command.description === 'function' ? command.description(state) : command.description
  })

  if (!command) return null

  return (
    <tr
      key={command.id}
      className={css({
        display: 'flex',
        flexDirection: viewType === 'grid' ? 'column' : 'row',
        gap: viewType === 'grid' ? '0.5rem' : undefined,
        position: 'relative',
        cursor: customize ? 'pointer' : undefined,
        ...(isDragging || selected
          ? {
              color: 'highlight',
              WebkitTextStrokeWidth: '0.05em',
            }
          : null),
        WebkitTextStrokeWidth: isDragging || selected ? '0.05em' : undefined,
        ...(customize
          ? {
              '&:active, [data-drop-to-remove-from-toolbar-hovering] &': {
                WebkitTextStrokeWidth: '0.05em',
              },
            }
          : null),
      })}
      ref={dragSource}
      onClick={onSelect ? () => onSelect(selected ? null : command) : undefined}
    >
      {selected && (
        <td
          className={css({
            width: '0.25em',
            padding: 0,
            height: 'calc(100% - 1.375em)',
            backgroundColor: 'highlight',
            position: 'absolute',
            left: '-1em',
            top: '0.25em',
          })}
        />
      )}

      {isTouch && command.gesture ? (
        <td className={css({ minWidth: { base: '10rem', _mobile: 'auto' }, textAlign: { _mobile: 'center' } })}>
          {viewType === 'grid' ? (
            <div
              className={css({
                border: '1px solid {colors.fgOverlay50}',
                borderRadius: '8px',
              })}
            >
              <GestureDiagram
                path={command.gesture as GesturePath}
                size={130}
                arrowSize={25}
                strokeWidth={7.5}
                arrowhead={'outlined'}
              />
            </div>
          ) : (
            <GestureDiagram path={command.gesture as GesturePath} size={48} arrowSize={12} />
          )}
        </td>
      ) : null}

      <td
        className={css({
          position: 'relative',
          paddingRight: viewType === 'grid' ? undefined : '1em',
          textAlign: 'left',
          fontWeight: 'normal',
        })}
      >
        {customize && indexInToolbar && (
          <span
            className={css({ color: 'dim' })}
            title={`This is the ${ordinal(indexInToolbar)} button in the toolbar`}
          >
            {indexInToolbar}.{' '}
          </span>
        )}

        {search && search.length > 0 ? (
          <b>
            <HighlightedText value={command.label} match={search} />
          </b>
        ) : (
          <b className={css({ fontSize: viewType === 'grid' ? '0.9rem' : undefined })}>{command.label}</b>
        )}

        {command.keyboard && !isTouch && viewType !== 'grid' ? (
          <p className={css({ color: 'gray', marginBottom: 0 })}>{formatKeyboardShortcut(command.keyboard)}</p>
        ) : null}

        <p
          className={css({
            fontSize: viewType === 'grid' ? '0.7rem' : undefined,
          })}
        >
          {description}
        </p>
      </td>
    </tr>
  )
}

export default CommandItem
