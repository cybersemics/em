import { FC, PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Key from '../@types/Key'
import { isMac } from '../browser'
import { arrowTextToArrowCharacter, isArrowKey } from '../commands'

/** A border around special keys. */
const Kbd: FC<PropsWithChildren<{ isText?: boolean }>> = ({ children, isText }) => {
  const size = useSelector(state => state.fontSize * 1.1)

  return (
    <kbd
      className={css({
        boxSizing: 'border-box',
        height: '1.1em',
        width: '1.1em',
        border: '1px solid {colors.fgOverlay30}',
        fontSize: isText ? '0.65em' : '0.7em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 3,
      })}
      style={{ width: size, height: size }}
    >
      {children}
    </kbd>
  )
}

/** Displays keyboard shortcuts. Replaces formatKeyboardShortcut in commands.ts. */
const CommandKeyboardShortcut = ({ keyboardOrString }: { keyboardOrString: Key | Key[] | string }): JSX.Element => {
  const fontSize = useSelector(state => state.fontSize)

  if (Array.isArray(keyboardOrString)) {
    return <CommandKeyboardShortcut keyboardOrString={keyboardOrString[0]} />
  }
  const keyboard = typeof keyboardOrString === 'string' ? { key: keyboardOrString } : keyboardOrString

  const regularKey = keyboard.shift && keyboard.key.length === 1 ? keyboard.key.toUpperCase() : keyboard.key
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        color: 'fgOverlay50',
        fontWeight: 400,
      })}
      style={{ fontSize }}
    >
      {keyboard.meta && (isMac ? <Kbd>⌘</Kbd> : <Kbd isText>ctrl</Kbd>)}
      {keyboard.alt && (isMac ? <Kbd>⌥</Kbd> : <Kbd isText>alt</Kbd>)}
      {keyboard.control && <Kbd isText>ctrl</Kbd>}
      {keyboard.shift && <Kbd>⇧</Kbd>}
      {keyboard.key === 'Backspace' ? (
        <Kbd>⌫</Kbd>
      ) : isArrowKey(regularKey) ? (
        <Kbd>{arrowTextToArrowCharacter(regularKey)}</Kbd>
      ) : (
        <kbd className={css({ fontSize: '0.7em' })}>{regularKey}</kbd>
      )}
    </div>
  )
}

export default CommandKeyboardShortcut
