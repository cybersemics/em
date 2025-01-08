import React, { forwardRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import CommandKeys from './CommandKeys'
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

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const CommandRowOnly = forwardRef<
  HTMLDivElement,
  {
    search: string | undefined
    onClick: (e: React.MouseEvent, command: Command) => void
    selected: boolean | undefined
    command: Command
    gestureInProgress?: string
    style?: React.CSSProperties
    disabled?: boolean
    isActive?: boolean
    isTable?: boolean
    indexInToolbar?: number | null
    customize?: boolean
  }
>(
  (
    {
      search = '',
      onClick,
      selected,
      command,
      gestureInProgress,
      style,
      disabled,
      isActive,
      isTable,
      indexInToolbar,
      customize,
    },
    ref,
  ) => {
    const label = command.labelInverse && isActive ? command.labelInverse! : command.label
    const Icon = command.svg

    // convert the description to a string
    const description = useSelector(state => {
      const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
      return descriptionStringOrFunction instanceof Function
        ? descriptionStringOrFunction(state)
        : descriptionStringOrFunction
    })

    const Container = isTable ? 'tr' : 'div'
    const Cell = isTable ? 'td' : 'div'

    return (
      <Container
        // @ts-expect-error Container can be 'tr' or 'div'
        ref={ref}
        className={css({
          cursor: !disabled ? 'pointer' : undefined,
          // paddingBottom: last ? (isTouch ? 0 : '4em') : 0,
          // paddingLeft: selected ? 'calc(1em - 10px)' : '1em',
          position: 'relative',
          textAlign: 'left',

          backgroundColor: selected ? 'commandSelected' : undefined,
          // padding: selected ? '10px 0.3em 10px 0.5em' : undefined,
          borderRadius: '8px', // constant curve
          padding: 12,
          ...(!isTouch
            ? {
                display: 'flex',
                // margin: selected ? '-5px 0' : undefined,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: 12,
              }
            : null),
        })}
        onClick={e => {
          if (!disabled) {
            onClick(e, command)
          }
        }}
        style={style}
      >
        {/* div used to contain width:100% and height:100% of icons while in a flex box */}
        <Cell>
          {/* gesture diagram */}
          {isTouch ? (
            <GestureDiagram
              color={disabled ? token('colors.gray') : undefined}
              highlight={
                !disabled && gestureInProgress !== undefined
                  ? command.id === 'help'
                    ? // For help command, find the longest matching end portion
                      (() => {
                        const helpGesture = gestureString(command)
                        return (
                          [...helpGesture]
                            .map((_, i) => helpGesture.length - i)
                            .find(len => gestureInProgress.endsWith(helpGesture.slice(0, len))) ?? 0
                        )
                      })()
                    : // For other commands, use normal highlighting
                      command.id === 'cancel'
                      ? selected
                        ? 1
                        : undefined
                      : gestureInProgress.length
                  : undefined
              }
              path={command.id === 'cancel' ? null : gestureString(command)}
              strokeWidth={4}
              cssRaw={css.raw({
                position: 'absolute',
                marginLeft: selected ? 5 : 15,
                left: command.id == 'cancel' ? '-2.3em' : selected ? '-1.75em' : '-2.2em',
                top: selected ? '-0.2em' : '-0.75em',
              })}
              width={45}
              height={45}
              rounded={command.rounded}
            />
          ) : (
            Icon && <Icon fill='white' />
          )}
        </Cell>

        {/* label + description vertical styling*/}
        <Cell
          className={css({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.2em',
            marginRight: '3em',
            flexWrap: 'wrap',
          })}
        >
          {/* label */}
          <div
            className={css({
              minWidth: '4em',
              whiteSpace: 'nowrap',
              color: disabled
                ? 'gray'
                : isTouch
                  ? selected
                    ? '#64C7EA'
                    : gestureInProgress === command.gesture
                      ? 'vividHighlight'
                      : 'fg'
                  : selected
                    ? 'vividHighlight'
                    : 'fg',
              fontWeight: selected ? 'bold' : undefined,
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
            <HighlightedText value={label} match={search} disabled={disabled} />
          </div>

          <div className={css({ flexGrow: 1, zIndex: 1 })}>
            <div
              className={css({
                display: 'flex',
              })}
            >
              {/* description */}
              <div
                className={css({
                  fontSize: '80%',
                  ...(!isTouch
                    ? {
                        flexGrow: 1,
                      }
                    : null),
                })}
              >
                {description}
              </div>
            </div>
          </div>
        </Cell>

        {/* keyboard shortcut */}
        {!isTouch && (
          <Cell
            className={css({
              fontSize: '80%',
              position: 'relative',
              ...(!isTouch
                ? {
                    display: 'inline',
                  }
                : null),
              marginLeft: 'auto',
            })}
          >
            <span className={css({ whiteSpace: 'nowrap' })}>
              {command.keyboard && <CommandKeys keyboardOrString={command.keyboard} />}
            </span>
          </Cell>
        )}
      </Container>
    )
  },
)

CommandRowOnly.displayName = 'CommandRowOnly'

export default CommandRowOnly
