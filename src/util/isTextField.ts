/** The types of input that the user types text into, and that keep their own undo history. */
const TEXT_INPUT_TYPES = new Set(['email', 'number', 'password', 'search', 'tel', 'text', 'url'])

/** Whether the target is a text field, such as the search box of the Command Universe, the query of the find bar, or a field of a modal. A text field keeps its own undo history, apart from em's, which thoughts and notes use. */
const isTextField = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type))

export default isTextField
