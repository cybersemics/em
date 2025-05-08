import React, { forwardRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import Command from '../@types/Command'
import { isTouch } from '../browser'
import { gestureString } from '../commands'
import CommandKeys from './CommandKeys'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'

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
    hideDescriptionIfNotSelectedOnMobile?: boolean
    cssRaw?: SystemStyleObject
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
      hideDescriptionIfNotSelectedOnMobile,
      cssRaw,
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

    const fontSize = useSelector(state => state.fontSize)

    const paddingSize = fontSize * (isTouch && !isTable ? 0.4 : 0.67)

    return (
      <Container
        // @ts-expect-error Container can be 'tr' or 'div'
        ref={ref}
        className={css(
          {
            cursor: !disabled ? 'pointer' : undefined,
            // paddingBottom: last ? (isTouch ? 0 : '4em') : 0,
            // paddingLeft: selected ? 'calc(1em - 10px)' : '1em',
            position: 'relative',
            textAlign: 'left',

            backgroundColor: selected ? 'commandSelected' : undefined,
            // padding: selected ? '10px 0.3em 10px 0.5em' : undefined,
            borderRadius: '8px',
            display: 'flex',
            // margin: selected ? '-5px 0' : undefined,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
          },
          cssRaw,
        )}
        onClick={e => {
          if (!disabled) {
            onClick(e, command)
          }
        }}
        style={{
          fontSize,
          // split padding into paddingInline and paddingBlock so either property can be overridden
          paddingInline: paddingSize,
          paddingBlock: paddingSize,
          gap: paddingSize,
          ...style,
        }}
      >
        {/* div used to contain width:100% and height:100% of icons while in a flex box */}
        <Cell className={css({ display: 'flex', justifyContent: 'center', alignItems: 'center' })}>
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
              width={32}
              height={32}
              size={150}
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
              lineHeight: '1em',
              whiteSpace: 'nowrap',
              color: disabled
                ? 'gray'
                : selected || (isTouch && (gestureInProgress as string) === gestureString(command))
                  ? 'blueHighlight'
                  : 'gray75',
              fontWeight: selected ? 'bold' : undefined,
            })}
          >
            <HighlightedText value={label} match={search} disabled={disabled} />
          </div>

          {(!isTouch || !hideDescriptionIfNotSelectedOnMobile || selected) && (
            <div className={css({ flexGrow: 1, zIndex: 1 })}>
              <div
                className={css({
                  display: 'flex',
                  lineHeight: '0.83em',
                })}
              >
                {/* description */}
                <div
                  className={css({
                    fontSize: '80%',
                    color: selected ? 'gray75' : 'gray45',
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
          )}
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
