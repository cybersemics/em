/** Returns true if the value starts with multiple dashes and should be interpreted as a divider. */
export const isDivider = (s: string) =>
  s && (s.startsWith('---') || s.startsWith('—'))
