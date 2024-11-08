/** Renders a list of strings as a sentence. */
const conjunction = (ss: string[], separator = 'and') =>
  ss.length === 1
    ? ss[0]
    : `${ss.slice(0, ss.length - 1).join(', ')}${ss.length !== 2 ? ',' : ''} ${separator} ${ss[ss.length - 1]}`

export default conjunction
