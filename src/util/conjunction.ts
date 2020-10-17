/** Renders a list of strings as a sentence. */
export const conjunction = (ss: string[]) =>
  ss.slice(0, ss.length - 1).join(', ') + (ss.length !== 2 ? ',' : '') + ' and ' + ss[ss.length - 1]
