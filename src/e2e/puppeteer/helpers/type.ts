import { fetchPage } from './setup'

/** Type text on the keyboard. */
const type = (text: string) => fetchPage().keyboard.type(text)

export default type
