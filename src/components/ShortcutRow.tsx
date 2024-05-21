import { FC } from 'react'
import { DragSource, DragSourceConnector, DragSourceMonitor } from 'react-dnd'
import { useSelector } from 'react-redux'
import DragShortcutZone from '../@types/DragShortcutZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import GesturePath from '../@types/GesturePath'
import Shortcut from '../@types/Shortcut'
import { dragShortcutActionCreator as dragShortcut } from '../actions/dragShortcut'
import { isTouch } from '../browser'
import { noop } from '../constants'
import themeColors from '../selectors/themeColors'
import { formatKeyboardShortcut } from '../shortcuts'
import store from '../stores/app'
import GestureDiagram from './GestureDiagram'

interface ShortcutRowProps {
  customize?: boolean
  indexInToolbar?: number | null
  onSelect?: (shortcut: Shortcut | null) => void
  selected?: boolean
  shortcut: Shortcut | null
}

type DraggableShortcutRowProps = ShortcutRowProps & ReturnType<typeof dragCollect>

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

/** Returns true if the toolbar-button can be dragged. */
const canDrag = (props: ShortcutRowProps) => !!props.shortcut && !!props.customize

/** Collects props from the DragSource. */
const dragCollect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => {
  return {
    dragSource: connect.dragSource(),
    dragPreview: noop,
    isDragging: monitor.isDragging(),
    zone: monitor.getItem()?.zone,
  }
}

/** Handles drag start. */
const beginDrag = (props: ShortcutRowProps): DragToolbarItem => {
  const shortcut = props.shortcut!
  store.dispatch(dragShortcut(shortcut.id))
  return { shortcut: shortcut, zone: DragShortcutZone.Remove }
}

/** Handles drag end. */
const endDrag = () => {
  store.dispatch(dragShortcut(null))
}

/** Renders all of a shortcut's details as a table row. */
const ShortcutRow: FC<DraggableShortcutRowProps> = ({
  customize,
  dragSource,
  isDragging,
  onSelect,
  selected,
  shortcut,
  indexInToolbar,
}) => {
  const colors = useSelector(themeColors)
  const description = useSelector(state => {
    if (!shortcut) return ''
    return typeof shortcut.description === 'function' ? shortcut.description(() => state) : shortcut.description
  })

  return (
    shortcut &&
    dragSource(
      <tr
        key={shortcut.id}
        onClick={onSelect ? () => onSelect(selected ? null : shortcut) : undefined}
        style={{
          ...(customize ? { cursor: 'pointer' } : null),
          ...(isDragging || selected
            ? {
                color: colors.highlight,
                WebkitTextStrokeWidth: '0.05em',
              }
            : undefined),
        }}
      >
        <th>
          {customize && indexInToolbar && (
            <span className='dim' title={`This is the ${ordinal(indexInToolbar)} button in the toolbar`}>
              {indexInToolbar}.{' '}
            </span>
          )}
          <b>{shortcut.label}</b>
          <p>{description}</p>
        </th>
        <td>
          {isTouch && shortcut.gesture ? (
            // GesturePath[]
            <GestureDiagram path={shortcut.gesture as GesturePath} size={48} arrowSize={12} />
          ) : shortcut.keyboard ? (
            formatKeyboardShortcut(shortcut.keyboard)
          ) : null}
        </td>
      </tr>,
    )
  )
}

/** A draggable and droppable toolbar button. */
const DragAndDropShortcutRow = (shortcutRow: FC<DraggableShortcutRowProps>) =>
  DragSource('toolbar-button', { canDrag, beginDrag, endDrag }, dragCollect)(shortcutRow)

export default DragAndDropShortcutRow(ShortcutRow)
