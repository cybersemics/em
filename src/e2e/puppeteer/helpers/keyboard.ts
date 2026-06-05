import { page } from '../setup'

// Match waitForEditable's default: parallel Puppeteer runs can make browser round trips exceed 1s.
const editableReadyTimeout = 6000

/** Type text on the keyboard. To press a key (optionally with modifiers), see the press helper. */
const keyboard = {
  // export keyboard object because 'type' is a reserved word and cannot be used as a function name
  type: async (text: string) => page.keyboard.type(text),
}

export default keyboard
