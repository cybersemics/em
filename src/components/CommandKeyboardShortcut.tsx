import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Key from '../@types/Key'
import { isMac } from '../browser'
import { ColorToken } from '../colors.config'
import { arrowTextToArrowCharacter, isArrowKey } from '../commands'
import themeColors from '../selectors/themeColors'
import Kbd from './Kbd'

/** Displays keyboard shortcuts. Replaces formatKeyboardShortcut in commands.ts. */
const CommandKeyboardShortcut = ({
  keyboardOrString,
  color,
}: {
  keyboardOrString: Key | Key[] | string
  /** Optional theme color for the shortcut. */
  color?: ColorToken
}): React.JSX.Element => {
  const fontSize = useSelector(state => state.fontSize)
  const colors = useSelector(themeColors)

  if (Array.isArray(keyboardOrString)) {
    return <CommandKeyboardShortcut keyboardOrString={keyboardOrString[0]} color={color} />
  }
  const keyboard = typeof keyboardOrString === 'string' ? { key: keyboardOrString } : keyboardOrString

  const regularKey = keyboard.key.length === 1 ? keyboard.key.toUpperCase() : keyboard.key
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
      style={{ fontSize, color: color ? colors[color] : undefined }}
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
