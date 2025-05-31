import React, { FC, useEffect } from 'react'
import { DragSourceMonitor, useDrag } from 'react-dnd'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import { CommandViewType } from '../@types/CommandViewType'
import DragAndDropType from '../@types/DragAndDropType'
import DragCommandZone from '../@types/DragCommandZone'
import DragToolbarItem from '../@types/DragToolbarItem'
import { dragCommandActionCreator as dragCommand } from '../actions/dragCommand'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import { noop } from '../constants'
import store from '../stores/app'
import CommandKeyboardShortcut from './CommandKeyboardShortcut'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const CommandItem: FC<{
  viewType?: CommandViewType
  search: string | undefined
  /** Click handler for the command. Applies pointer styles when defined. */
  onClick?: (e: React.MouseEvent, command: Command) => void
  selected: boolean | undefined
  command: Command
  gestureInProgress?: string
  style?: React.CSSProperties
  disabled?: boolean
  isActive?: boolean
  isTable?: boolean
  /**
   * Controls when the command description is displayed.
   * - If true: Always show the description.
   * - If false: On non-touch devices, always show the description. On touch devices, show only when the command is selected.
   */
  alwaysShowDescription?: boolean
  onHover?: (e: MouseEvent, command: Command) => void
  customize?: boolean
  shouldScrollSelectionIntoView?: boolean
}> = ({
  viewType = 'table',
  search = '',
  onClick,
  selected,
  command,
  gestureInProgress,
  style,
  disabled,
  isActive,
  isTable,
  alwaysShowDescription,
  onHover,
  customize,
  shouldScrollSelectionIntoView,
}) => {
  const label = command.labelInverse && isActive ? command.labelInverse : command.label
  const Icon = command.svg
  const ref = React.useRef<Pick<HTMLDivElement, 'scrollIntoView' | 'addEventListener' | 'removeEventListener'> | null>(
    null,
  )

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

  // convert the description to a string
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
    return typeof descriptionStringOrFunction === 'function'
      ? descriptionStringOrFunction(state)
      : descriptionStringOrFunction
  })

  const Container = isTable ? 'tr' : 'div'
  const Cell = isTable ? 'td' : 'div'

  const fontSize = useSelector(state => state.fontSize)

  const paddingSize = fontSize * (isTouch && !isTable ? 0.4 : 0.67)

  const isSelectedStyle = selected || isDragging

  useEffect(() => {
    if (selected && shouldScrollSelectionIntoView) {
      ref.current?.scrollIntoView({ block: 'nearest' })
    }
  })

  useEffect(() => {
    if (!onHover) return
    /** Hover handler. */
    const onHoverCommand = (e: MouseEvent) => onHover(e, command)

    // mouseover and mouseenter cause the command under the cursor to get selected on render, so we use mousemove to ensure that it only gets selected on an actual hover
    ref.current?.addEventListener('mousemove', onHoverCommand)

    return () => {
      ref.current?.removeEventListener('mousemove', onHoverCommand)
    }
  }, [onHover, command])

  /** Returns the first n segments of the gesture diagram to highlight. */
  const getGestureHighlight = () => {
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
  }

  return (
    <Container
      ref={current => {
        ref.current = current
        dragSource(current)
      }}
      className={css({
        cursor: onClick && !disabled ? 'pointer' : undefined,
        position: 'relative',
        textAlign: 'left',

        backgroundColor: isSelectedStyle ? 'commandSelectedBg' : undefined,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: viewType === 'grid' ? 'column' : 'row',
        gap: viewType === 'grid' ? '0.6rem' : undefined,
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
      })}
      onClick={e => {
        if (!disabled) {
          onClick?.(e, command)
        }
      }}
      style={{
        fontSize,
        // split padding into paddingInline and paddingBlock so either property can be overridden
        paddingInline: viewType === 'grid' ? undefined : paddingSize,
        paddingBlock: viewType === 'grid' ? undefined : paddingSize,
        gap: paddingSize,
        ...style,
      }}
    >
      <Cell
        className={css(
          { boxSizing: 'border-box' },
          viewType === 'grid'
            ? { minWidth: { base: '10rem', _mobile: 'auto' }, width: '100%' }
            : { display: 'flex', justifyContent: 'center', alignItems: 'center' },
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
              highlight={getGestureHighlight()}
              path={command.id === 'cancel' ? null : gestureString(command)}
              strokeWidth={4}
              width={32}
              height={32}
              size={150}
              rounded={command.rounded}
            />
          )
        ) : Icon ? (
          <Icon cssRaw={css.raw({ cursor: onClick ? 'pointer' : 'default' })} fill={token('colors.fg')} />
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
              ? 'gray'
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
                    color: isSelectedStyle ? 'gray75' : 'gray45',
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
