import React, { FC, useEffect, useRef } from 'react'
import { DragSourceMonitor, useDrag } from 'react-dnd'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import State from '../@types/State'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import { noop } from '../constants'
import useLottieIntervalAnimation from '../hooks/useLottieIntervalAnimation'
import store from '../stores/app'
import CommandKeyboardShortcut from './CommandKeyboardShortcut'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'

const strokeWidth = 4

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

interface CommandTableItemProps {
  command: Command
  search?: string
  /** Click handler for the command. Applies pointer styles when defined. */
  onClick?: (e: React.MouseEvent, command: Command) => void
  selected?: boolean
  onHover?: (command: Command) => void
  customize?: boolean
  shouldScrollSelectedIntoView?: boolean
  isFirstCommand?: boolean
  isLastCommand?: boolean
  /** If true, renders the gesture diagram instead of the keyboard shortcut. Defaults to isTouch. */
  isMobileGestures?: boolean
}

/** Renders a command as a table row inside a CommandTable (Help and CustomizeToolbar). Handles selection styling, drag-and-drop reordering for the toolbar customizer, and the keyboard-driven scroll-into-view behavior. */
const CommandTableItem: FC<CommandTableItemProps> = ({
  command,
  search = '',
  onClick,
  selected,
  onHover,
  customize,
  shouldScrollSelectedIntoView,
  isFirstCommand,
  isLastCommand,
  isMobileGestures = isTouch,
}) => {
  const ref = useRef<HTMLTableRowElement | null>(null)

  const [{ isDragging }, dragSource] = useDrag({
    type: DragAndDropType.ToolbarButton,
    item: (): DragToolbarItem => {
      store.dispatch(dragCommand(command?.id || null))
      return { command: command, zone: DragCommandZone.Remove }
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

  const isActive = command.isActive?.(store.getState())
  const disabled = useSelector(state => !isExecutable(state, command))
  const label = command.labelInverse && isActive ? command.labelInverse : command.label
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
    return typeof descriptionStringOrFunction === 'function'
      ? descriptionStringOrFunction(state)
      : descriptionStringOrFunction
  })
  const { isAnimated, onAnimationComplete } = useLottieIntervalAnimation({
    enabled: !isTouch && !!command.svg && !!selected,
  })

  const isSelectedStyle = !!(selected || isDragging)

  // Scroll-into-view runs every render where the row is selected (no dep array) so that dynamic scroll-container layout changes still re-anchor the selection correctly.
  useEffect(() => {
    if (!selected || !shouldScrollSelectedIntoView) return
    if (!isFirstCommand && !isLastCommand) {
      ref.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    // Edge rows: jump the scroll container to its absolute top/bottom rather than scrolling the row into view, so the list visibly anchors at its edge.
    const scrollContainer = ref.current?.parentElement
    if (scrollContainer) {
      scrollContainer.scrollTop = isFirstCommand ? 0 : scrollContainer.scrollHeight
    }
  })

  const Icon = command.svg

  return (
    <tr
      ref={current => {
        ref.current = current
        dragSource(current)
      }}
      onMouseMove={onHover?.bind(null, command)}
      className={css({
        cursor: onClick && !disabled ? 'pointer' : undefined,
        position: 'relative',
        textAlign: 'left',
        backgroundColor: isSelectedStyle ? 'commandSelectedBg' : undefined,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'row',
        gap: '0.67em',
        justifyContent: 'flex-start',
        alignItems: 'center',
        opacity: isDragging ? 0.5 : 1,
        ...(customize
          ? {
              '&:active, [data-drop-to-remove-from-toolbar-hovering] &': {
                WebkitTextStrokeWidth: '0.05em',
              },
            }
          : null),
        paddingBlock: '0.67em',
      })}
      onClick={e => {
        if (!disabled) {
          onClick?.(e, command)
        }
      }}
    >
      <td
        className={css({
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: 32,
          height: 32,
        })}
      >
        {Icon ? (
          <Icon
            cssRaw={css.raw({
              cursor: !disabled && onClick ? 'pointer' : 'default',
            })}
            fill={token(disabled ? 'colors.gray50' : 'colors.fg')}
            animated={isAnimated}
            animationComplete={onAnimationComplete}
          />
        ) : (
          // placeholder for icon to keep spacing consistent
          <div className={css({ width: 24, height: 24 })} />
        )}
      </td>

      <td
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.25em',
          flexWrap: 'wrap',
          marginRight: '3em',
          width: '100%',
        })}
      >
        <b
          className={css({
            minWidth: '4em',
            lineHeight: '1em',
            whiteSpace: 'nowrap',
            fontSize: '0.9em',
            color: disabled ? 'gray45' : isSelectedStyle ? 'vividHighlight' : 'gray75',
            fontWeight: isSelectedStyle ? 'bold' : 'normal',
          })}
        >
          <HighlightedText value={label} match={search} disabled={disabled} />
        </b>

        <p
          className={css({
            flexGrow: 1,
            zIndex: 1,
            lineHeight: '1em',
            fontSize: '0.8em',
            color: disabled ? 'gray33' : isSelectedStyle ? 'gray75' : 'gray45',
            marginBlock: 0,
            ...(isTouch
              ? null
              : {
                  flexGrow: 1,
                }),
          })}
        >
          {description}
        </p>
      </td>

      {isMobileGestures ? (
        <td className={css({ height: 32, width: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' })}>
          <GestureDiagram
            color={disabled ? token('colors.gray') : undefined}
            styleCancelAsRegularGesture
            path={command.id === 'cancel' ? null : gestureString(command)}
            maxWidth={70}
            maxHeight={50}
            arrowSize={18 - strokeWidth * 0.3}
            strokeWidth={strokeWidth}
            rounded={command.rounded}
            cssRaw={css.raw({ position: 'absolute' })}
          />
        </td>
      ) : (
        command.keyboard && (
          <td
            className={css({
              fontSize: '80%',
              position: 'relative',
              ...(isTouch
                ? null
                : {
                    display: 'inline',
                  }),
              marginLeft: 'auto',
            })}
          >
            <span className={css({ whiteSpace: 'nowrap' })}>
              {command.keyboard && <CommandKeyboardShortcut keyboardOrString={command.keyboard} />}
            </span>
          </td>
        )
      )}
    </tr>
  )
}

export default CommandTableItem
