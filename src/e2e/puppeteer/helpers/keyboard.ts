import { page } from '../setup'

/** Type text on the keyboard. */
const keyboard = {
  // export keyboard object because 'type' is a reserved word
  type: (text: string) => page.keyboard.type(text),
}

export default keyboard
