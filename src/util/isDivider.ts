/** Returns true if the value starts with multiple dashes and should be interpreted as a divider. */
const isDivider = (s: string | null) => s !== null && (s.startsWith('---') || s.startsWith('—-'))

export default isDivider
