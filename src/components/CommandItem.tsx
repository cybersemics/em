import React, { FC, useEffect, useMemo } from 'react'
import { DragSourceMonitor, useDrag } from 'react-dnd'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import { CommandViewType } from '../@types/CommandViewType'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import State from '../@types/State'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import { noop } from '../constants'
import store from '../stores/app'
import CommandKeyboardShortcut from './CommandKeyboardShortcut'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Returns true if the command can be executed. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showGestureCheatsheet)

const strokeWidth = 4

/** Renders a command in a variety of contexts, including the Command Palette, Gesture Menu, Gesture Cheatsheet, and Help modal. */
const CommandItem: FC<{
  viewType?: CommandViewType
  search?: string
  /** Click handler for the command. Applies pointer styles when defined. */
  onClick?: (e: React.MouseEvent, command: Command) => void
  selected?: boolean
  command: Command
  gestureInProgress?: string
  /**
   * Controls when the command description is displayed.
   * - If true: Always show the description.
   * - If false: On non-touch devices, always show the description. On touch devices, show only when the command is selected.
   */
  alwaysShowDescription?: boolean
  onHover?: (command: Command) => void
  customize?: boolean
  /** Controls whether the command item should scroll into view when selected. Used to automatically scroll when navigating with the keyboard, but not the mouse.  */
  shouldScrollSelectedIntoView?: boolean
  isFirstCommand?: boolean
  isLastCommand?: boolean
  /** If the CommandItem is rendered within a <table>, then it needs to use <tr> and <td> and avoid inline padding. Confusingly, this is independent from viewType which determines whether the component is layed out in a 2-column 'grid' or a 'table' of rows. Perhaps this could be refactored to avoid using <table> and <tbody> at all while preserving the desired appearance in the Help modal. */
  tableMode?: boolean
}> = ({
  viewType,
  search = '',
  onClick,
  selected,
  command,
  gestureInProgress,
  alwaysShowDescription,
  onHover,
  customize,
  shouldScrollSelectedIntoView,
  isFirstCommand,
  isLastCommand,
  tableMode,
}) => {
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
  const Icon = command.svg
  const ref = React.useRef<HTMLDivElement | null>(null)

  // convert the description to a string
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
    return typeof descriptionStringOrFunction === 'function'
      ? descriptionStringOrFunction(state)
      : descriptionStringOrFunction
  })

  const paddingSize = isTouch && !viewType ? '0.4em' : '0.67em'

  const isSelectedStyle = selected || isDragging

  useEffect(() => {
    if (!selected || !shouldScrollSelectedIntoView) return
    if (!isFirstCommand && !isLastCommand) {
      // For middle commands, use normal scrollIntoView
      ref.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    // For first command, scroll the container to the very top
    const scrollContainer = ref.current?.parentElement
    if (scrollContainer) {
      scrollContainer.scrollTop = isFirstCommand ? 0 : scrollContainer.scrollHeight
    }
  })

  /** The first n segments of the gesture diagram to highlight. */
  const gestureHighlight = useMemo(() => {
    if (disabled || gestureInProgress === undefined) return undefined
    if (command.id === 'openGestureCheatsheet') {
      // For gesture cheatsheet command, find the longest matching end portion

      const gestureCheatsheetGesture = gestureString(command)
      return (
        [...gestureCheatsheetGesture]
          .map((_, i) => gestureCheatsheetGesture.length - i)
          .find(len => gestureInProgress.endsWith(gestureCheatsheetGesture.slice(0, len))) ?? 0
      )
    }
    // For other commands, use normal highlighting
    if (command.id === 'cancel') {
      return selected ? 1 : undefined
    }
    return gestureInProgress.length
  }, [disabled, gestureInProgress, command, selected])

  const Container = tableMode ? 'tr' : 'div'
  const Cell = tableMode ? 'td' : 'div'

  return (
    <Container
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
        flexDirection: viewType === 'grid' ? 'column' : 'row',
        gap: viewType === 'grid' ? '0.6rem' : paddingSize,
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
        // split padding into paddingInline and paddingBlock so either property can be overridden
        paddingInline: viewType === 'grid' || tableMode ? undefined : paddingSize,
        paddingBlock: viewType === 'grid' ? undefined : paddingSize,
      })}
      onClick={e => {
        if (!disabled) {
          onClick?.(e, command)
        }
      }}
    >
      <Cell
        className={css(
          { boxSizing: 'border-box' },
          viewType === 'grid'
            ? { minWidth: { base: '10rem', _mobile: 'auto' }, width: '100%' }
            : { display: 'flex', justifyContent: 'center', alignItems: 'center', width: 32, height: 32 },
        )}
      >
        {/* gesture diagram */}
        {isTouch ? (
          viewType === 'grid' ? (
            <div
              className={css({
                border: '1px solid {colors.fgOverlay50}',
                borderRadius: '8px',
                textAlign: { _mobile: 'center' },
              })}
            >
              <GestureDiagram
                cssRaw={css.raw({
                  width: { sm: '80px', md: '130px' },
                  height: { sm: '80px', md: '130px' },
                })}
                path={gestureString(command)}
                size={130}
                arrowSize={25}
                strokeWidth={7.5}
                arrowhead={'outlined'}
              />
            </div>
          ) : (
            <GestureDiagram
              color={disabled ? token('colors.gray') : undefined}
              styleCancelAsRegularGesture
              highlight={gestureHighlight}
              path={command.id === 'cancel' ? null : gestureString(command)}
              size={70}
              arrowSize={18 - strokeWidth * 0.3}
              strokeWidth={strokeWidth}
              rounded={command.rounded}
            />
          )
        ) : Icon ? (
          <Icon
            cssRaw={css.raw({
              cursor: !disabled && onClick ? 'pointer' : 'default',
            })}
            fill={token(disabled ? 'colors.gray50' : 'colors.fg')}
          />
        ) : (
          // placeholder for icon to keep spacing consistent
          <div className={css({ width: 24, height: 24 })} />
        )}
      </Cell>

      {/* label + description vertical styling*/}
      <Cell
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.25em',
          flexWrap: 'wrap',
          marginRight: viewType === 'grid' ? undefined : '3em',
          fontWeight: viewType === 'grid' ? 'normal' : undefined,
          width: '100%',
        })}
      >
        <b
          className={css({
            minWidth: '4em',
            lineHeight: '1em',
            whiteSpace: 'nowrap',
            fontSize: viewType === 'grid' ? '0.9rem' : '0.9em',
            color: disabled
              ? 'gray45'
              : viewType === 'grid'
                ? 'fg'
                : isSelectedStyle || (isTouch && (gestureInProgress as string) === gestureString(command))
                  ? 'vividHighlight'
                  : 'gray75',
            fontWeight: isSelectedStyle && viewType !== 'grid' ? 'bold' : 'normal',
          })}
        >
          <HighlightedText value={label} match={search} disabled={disabled} />
        </b>

        {(alwaysShowDescription || !isTouch || selected) && (
          <p
            className={css(
              viewType === 'grid'
                ? {
                    fontSize: '0.7rem',
                    marginTop: '0.3rem',
                    marginBottom: '0.3rem',
                  }
                : {
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
                  },
            )}
          >
            {description}
          </p>
        )}
      </Cell>

      {/* keyboard shortcut */}
      {command.keyboard && !isTouch && viewType !== 'grid' ? (
        <Cell
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
        </Cell>
      ) : null}
    </Container>
  )
}

export default CommandItem
