//@ts-nocheck

/** Returns true if the value starts with multiple dashes and should be interpreted as a divider. */
export const isDivider = s =>
  s && (s.startsWith('---') || s.startsWith('—'))
