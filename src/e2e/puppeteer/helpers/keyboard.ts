import { page } from '../setup'

/** Type text on the keyboard. To press a key (optionally with modifiers), see the press helper. */
const keyboard = {
  // export keyboard object because 'type' is a reserved word and cannot be used as a function name
  type: (text: string) => page.keyboard.type(text),
}

export default keyboard
