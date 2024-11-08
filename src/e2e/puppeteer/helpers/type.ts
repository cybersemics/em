import { page } from '../setup'

/** Type text on the keyboard. */
const type = (text: string) => page.keyboard.type(text)

export default type
