import { DragSourceMonitor, useDrag } from 'react-dnd'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import DragAndDropType from '../@types/DragAndDropType'
import DragShortcutZone from '../@types/DragShortcutZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import GesturePath from '../@types/GesturePath'
import Shortcut from '../@types/Shortcut'
import { dragShortcutActionCreator as dragShortcut } from '../actions/dragShortcut'
import { isTouch } from '../browser'
import { noop } from '../constants'
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

/** Renders all of a shortcut's details as a table row. */
const ShortcutRow = ({ customize, onSelect, selected, shortcut, indexInToolbar }: ShortcutRowProps) => {
  const [{ isDragging }, dragSource] = useDrag({
    type: DragAndDropType.ToolbarButton,
    item: (): DragToolbarItem => {
      store.dispatch(dragShortcut(shortcut?.id || null))
      return { shortcut: shortcut!, zone: DragShortcutZone.Remove }
    },
    canDrag: () => !!shortcut && !!customize,
    end: () => store.dispatch(dragShortcut(null)),
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
    if (!shortcut) return ''
    return typeof shortcut.description === 'function' ? shortcut.description(() => state) : shortcut.description
  })

  return (
    shortcut && (
      <tr
        key={shortcut.id}
        className={css({
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
        onClick={onSelect ? () => onSelect(selected ? null : shortcut) : undefined}
      >
        <th
          className={css({
            // create a container for the selected bar equal to the height of the row
            position: 'relative',
            paddingRight: '1em',
            textAlign: 'left',
            fontWeight: 'normal',
          })}
        >
          {
            // selected bar
            selected && (
              <div
                className={css({
                  width: '0.25em',
                  // set the height so it is flush with the bottom of the shortcut row description
                  height: 'calc(100% - 1.375em)',
                  backgroundColor: 'highlight',
                  position: 'absolute',
                  // hanng off the left edge of the shortcut row
                  left: '-1em',
                  // set the top so it is flush with the top of the shortcut row label
                  top: '0.25em',
                })}
              />
            )
          }
          {customize && indexInToolbar && (
            <span className='dim' title={`This is the ${ordinal(indexInToolbar)} button in the toolbar`}>
              {indexInToolbar}.{' '}
            </span>
          )}
          <b>{shortcut.label}</b>
          <p>{description}</p>
        </th>
        {/* center gesture diagrams on mobile */}
        <td className={css({ minWidth: { base: '10rem', _mobile: 'auto' }, textAlign: { _mobile: 'center' } })}>
          {isTouch && shortcut.gesture ? (
            // GesturePath[]
            <GestureDiagram path={shortcut.gesture as GesturePath} size={48} arrowSize={12} />
          ) : shortcut.keyboard ? (
            formatKeyboardShortcut(shortcut.keyboard)
          ) : null}
        </td>
      </tr>
    )
  )
}

export default ShortcutRow
