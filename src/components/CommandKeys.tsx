import { FC, PropsWithChildren } from 'react'
import { css } from '../../styled-system/css'
import Key from '../@types/Key'
import { isMac } from '../browser'
import { arrowTextToArrowCharacter } from '../commands'

/** A border around special keys. */
const Kbd: FC<PropsWithChildren<{ isText?: boolean }>> = ({ children, isText }) => {
  return (
    <kbd
      className={css({
        height: 20, // TODO use em instead of px, control should be smaller font size than rest (~2-3px smaller)
        width: 20,
        border: '1px solid {colors.fgOverlay30}',
        fontSize: isText ? 7.5 : 'inherit',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 3,
      })}
    >
      {children}
    </kbd>
  )
}

/** Displays keyboard shortcuts. Replaces formatKeyboardShortcut in commands.ts. */
const CommandKeys = ({ keyboardOrString }: { keyboardOrString: Key | Key[] | string }): JSX.Element => {
  if (Array.isArray(keyboardOrString)) {
    return <CommandKeys keyboardOrString={keyboardOrString[0]} />
  }
  const keyboard = typeof keyboardOrString === 'string' ? { key: keyboardOrString as string } : keyboardOrString

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        color: 'fgOverlay50',
      })}
    >
      {keyboard.meta && (isMac ? <Kbd>⌘</Kbd> : <Kbd isText>ctrl</Kbd>)}
      {keyboard.alt && (isMac ? <Kbd>⌥</Kbd> : <Kbd isText>alt</Kbd>)}
      {keyboard.control && <Kbd isText>ctrl</Kbd>}
      {keyboard.shift && <Kbd>⇧</Kbd>}
      {keyboard.key === 'Backspace' ? (
        <Kbd>⌫</Kbd>
      ) : (
        arrowTextToArrowCharacter(
          keyboard.shift && keyboard.key.length === 1 ? keyboard.key.toUpperCase() : keyboard.key,
        )
      )}
    </div>
  )
}

export default CommandKeys
